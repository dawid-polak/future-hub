import express from 'express';
import mongoose from 'mongoose';
import http from 'http';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { setupRouter } from './routes/setup.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { rolesRouter } from './routes/roles.js';
import { skillsRouter } from './routes/skills.js';
import { analyticsRouter } from './routes/analytics.js';
import { foldersRouter } from './routes/folders.js';

const app = express();
let server: http.Server;

app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use(rateLimiter);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    dbConnected: mongoose.connection.readyState === 1,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/setup', setupRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/folders', foldersRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  res.status(500).json({ error: 'Wewnetrzny blad serwera' });
});

async function connectDb() {
  if (!config.mongodbUri) {
    logger.info('Brak MONGODB_URI — tryb setup');
    return;
  }

  // Disconnect stale connection first (hot reload safety)
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {}
  }

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', { error: err.message });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB rozlaczony — proba reconnect za 5s');
    setTimeout(() => {
      if (mongoose.connection.readyState === 0 && config.mongodbUri) {
        mongoose.connect(config.mongodbUri).catch(() => {});
      }
    }, 5000);
  });

  try {
    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 10000,
      heartbeatFrequencyMS: 30000,
    });
    logger.info('Polaczono z MongoDB');
  } catch (error) {
    logger.warn('Nie udalo sie polaczyc z MongoDB — tryb setup', { error });
  }
}

async function shutdown(signal: string) {
  logger.info(`${signal} — zamykanie serwera...`);

  if (server) {
    server.close(() => {
      logger.info('HTTP server zamkniety');
    });
  }

  try {
    await mongoose.disconnect();
    logger.info('MongoDB rozlaczone');
  } catch {}

  process.exit(0);
}

async function start() {
  await connectDb();

  server = app.listen(config.port, () => {
    logger.info(`Serwer uruchomiony na porcie ${config.port}`);
  });

  // Handle port in use (hot reload race condition)
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn(`Port ${config.port} zajety — ponawianie za 1s...`);
      setTimeout(() => {
        server.close();
        server = app.listen(config.port);
      }, 1000);
    } else {
      throw err;
    }
  });
}

// Graceful shutdown on signals (tsx watch sends these on restart)
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Cleanup on uncaught errors
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  shutdown('uncaughtException');
});

start();

export { app };
