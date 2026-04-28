import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { requireAdmin } from '../middleware/rbac.js';
import { logger } from '../utils/logger.js';
import { User } from '../models/user.js';
import { Role } from '../models/role.js';
import { Skill } from '../models/skill.js';
import { SkillVersion } from '../models/skillVersion.js';
import { ApiKey } from '../models/apiKey.js';
import { UsageLog } from '../models/usageLog.js';
import { SkillFolder } from '../models/skillFolder.js';

export const setupRouter = Router();

const ENV_PATH = path.resolve(__dirname, '../../../../../.env');

function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

function buildMongoUri(data: { host: string; port: number; username: string; password: string; database: string }): string {
  const userPart = data.username ? `${encodeURIComponent(data.username)}:${encodeURIComponent(data.password)}@` : '';
  return `mongodb://${userPart}${data.host}:${data.port}/${data.database}`;
}

setupRouter.get('/status', async (_req: Request, res: Response) => {
  const dbConnected = isDbConnected();
  let hasAdmin = false;

  if (dbConnected) {
    try {
      hasAdmin = (await User.countDocuments({ isAdmin: true, isActive: true })) > 0;
    } catch {
      hasAdmin = false;
    }
  }

  res.json({
    configured: dbConnected,
    hasAdmin,
    dbState: mongoose.connection.readyState,
  });
});

setupRouter.post(
  '/create-admin',
  validate([
    body('name').notEmpty().withMessage('Imie jest wymagane'),
    body('email').isEmail().withMessage('Podaj prawidlowy email'),
    body('password').isLength({ min: 6 }).withMessage('Haslo musi miec min. 6 znakow'),
  ]),
  async (req: Request, res: Response) => {
    if (!isDbConnected()) {
      res.status(400).json({ error: 'Baza danych nie jest polaczona' });
      return;
    }

    // Block if admin already exists
    const existingAdmin = await User.findOne({ isAdmin: true, isActive: true });
    if (existingAdmin) {
      res.status(400).json({ error: 'Konto administratora juz istnieje' });
      return;
    }

    try {
      const admin = new User({
        name: req.body.name,
        email: req.body.email,
        passwordHash: req.body.password,
        isAdmin: true,
        isActive: true,
        roles: [],
      });
      await admin.save();
      logger.info(`Admin utworzony przez setup: ${admin.email}`);
      res.status(201).json({ success: true, message: 'Konto administratora utworzone' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

setupRouter.post(
  '/test-connection',
  validate([
    body('host').notEmpty().withMessage('Host jest wymagany'),
    body('port').isInt({ min: 1, max: 65535 }).withMessage('Port musi byc miedzy 1 a 65535'),
    body('database').notEmpty().withMessage('Nazwa bazy jest wymagana'),
  ]),
  async (req: Request, res: Response) => {
    const { host, port, username, password, database } = req.body;
    const uri = buildMongoUri({ host, port: Number(port), username: username || '', password: password || '', database });

    try {
      const conn = mongoose.createConnection(uri);
      await conn.asPromise();
      await conn.close();
      res.json({ success: true, message: 'Polaczenie udane' });
    } catch (error: any) {
      logger.error('Test connection failed', { error: error.message });
      res.json({ success: false, message: `Blad polaczenia: ${error.message}` });
    }
  }
);

setupRouter.post(
  '/save',
  validate([
    body('host').notEmpty().withMessage('Host jest wymagany'),
    body('port').isInt({ min: 1, max: 65535 }).withMessage('Port musi byc miedzy 1 a 65535'),
    body('database').notEmpty().withMessage('Nazwa bazy jest wymagana'),
  ]),
  async (req: Request, res: Response) => {
    const { host, port, username, password, database } = req.body;
    const uri = buildMongoUri({ host, port: parseInt(port), username: username || '', password: password || '', database });

    // Test connection first
    try {
      const testConn = await mongoose.createConnection(uri).asPromise();
      await testConn.close();
    } catch (error: any) {
      res.status(400).json({ error: `Nie mozna polaczyc: ${error.message}` });
      return;
    }

    // Update .env file
    try {
      let envContent = '';
      if (fs.existsSync(ENV_PATH)) {
        envContent = fs.readFileSync(ENV_PATH, 'utf-8');
      }

      if (envContent.includes('MONGODB_URI=')) {
        envContent = envContent.replace(/MONGODB_URI=.*/, `MONGODB_URI=${uri}`);
      } else {
        envContent += `\nMONGODB_URI=${uri}\n`;
      }

      fs.writeFileSync(ENV_PATH, envContent);
      logger.info('Konfiguracja MongoDB zapisana do .env');
    } catch (error: any) {
      logger.warn('Nie udalo sie zapisac .env, kontynuuje z polaczeniem w pamieci', { error: error.message });
    }

    // Connect main mongoose instance
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      await mongoose.connect(uri);
      logger.info('Polaczono z MongoDB po konfiguracji setup');
      res.json({ success: true, message: 'Konfiguracja zapisana i polaczono z baza' });
    } catch (error: any) {
      res.status(500).json({ error: `Polaczenie zapisane, ale blad reconnect: ${error.message}` });
    }
  }
);

// --- Authenticated endpoints (require admin JWT) ---

setupRouter.get('/db-info', jwtAuth, requireAdmin, async (_req: Request, res: Response) => {
  const state = mongoose.connection.readyState;
  const stateNames: Record<number, string> = { 0: 'rozlaczony', 1: 'polaczony', 2: 'laczenie...', 3: 'rozlaczanie...' };

  let dbInfo: any = {
    state: stateNames[state] || 'nieznany',
    stateCode: state,
    connected: state === 1,
  };

  if (state === 1) {
    try {
      const db = mongoose.connection.db!;
      const adminDb = db.admin();
      const serverStatus = await adminDb.serverStatus();
      const stats = await db.stats();

      dbInfo = {
        ...dbInfo,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
        serverVersion: serverStatus.version,
        uptime: serverStatus.uptime,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        collections: stats.collections,
        documents: stats.objects,
      };
    } catch {
      dbInfo = {
        ...dbInfo,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
      };
    }
  }

  res.json(dbInfo);
});

setupRouter.get('/export', jwtAuth, requireAdmin, async (_req: Request, res: Response) => {
  if (!isDbConnected()) {
    res.status(400).json({ error: 'Baza danych nie jest polaczona' });
    return;
  }

  try {
    const [users, roles, skills, skillVersions, apiKeys, usageLogs, skillFolders] = await Promise.all([
      User.find().lean(),
      Role.find().lean(),
      Skill.find().lean(),
      SkillVersion.find().lean(),
      ApiKey.find().select('-keyHash').lean(),
      UsageLog.find().sort({ timestamp: -1 }).limit(10000).lean(),
      SkillFolder.find().lean(),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      collections: {
        users,
        roles,
        skills,
        skillVersions,
        apiKeys,
        usageLogs,
        skillFolders,
      },
      stats: {
        users: users.length,
        roles: roles.length,
        skills: skills.length,
        skillVersions: skillVersions.length,
        apiKeys: apiKeys.length,
        usageLogs: usageLogs.length,
        skillFolders: skillFolders.length,
      },
    };

    res.setHeader('Content-Disposition', `attachment; filename=futurehub-export-${new Date().toISOString().slice(0, 10)}.json`);
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (error: any) {
    logger.error('Export failed', { error: error.message });
    res.status(500).json({ error: `Blad eksportu: ${error.message}` });
  }
});
