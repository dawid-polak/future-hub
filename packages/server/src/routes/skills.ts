import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import multer from 'multer';
import path from 'path';
import { validate } from '../middleware/validate.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { requireAdmin } from '../middleware/rbac.js';
import * as skillService from '../services/skillService.js';

const upload = multer({
  storage: multer.diskStorage({
    destination: path.resolve(__dirname, '../../../../storage/skills'),
    filename: (_req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const skillsRouter = Router();
skillsRouter.use(jwtAuth, requireAdmin);

skillsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const result = await skillService.list({
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      category: req.query.category as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      search: req.query.search as string,
      sort: req.query.sort as string,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

skillsRouter.post(
  '/',
  validate([
    body('name').notEmpty().withMessage('Nazwa skilla jest wymagana'),
    body('content').notEmpty().withMessage('Tresc jest wymagana'),
  ]),
  async (req: Request, res: Response) => {
    try {
      const skill = await skillService.create(req.body, req.user!.userId);
      res.status(201).json(skill);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

skillsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const skill = await skillService.getById(req.params.id);
    res.json(skill);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

skillsRouter.put(
  '/:id',
  validate([param('id').isMongoId()]),
  async (req: Request, res: Response) => {
    try {
      const skill = await skillService.updateMeta(req.params.id, req.body);
      res.json(skill);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

skillsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const skill = await skillService.deactivate(req.params.id);
    res.json(skill);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

skillsRouter.post(
  '/:id/versions',
  validate([
    param('id').isMongoId(),
    body('content').notEmpty().withMessage('Tresc jest wymagana'),
    body('changelog').notEmpty().withMessage('Opis zmian jest wymagany'),
  ]),
  async (req: Request, res: Response) => {
    try {
      const version = await skillService.publishVersion(req.params.id, req.body, req.user!.userId);
      res.status(201).json(version);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

skillsRouter.get('/:id/versions', async (req: Request, res: Response) => {
  try {
    const versions = await skillService.getVersions(req.params.id);
    res.json(versions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

skillsRouter.get('/:id/versions/:ver', async (req: Request, res: Response) => {
  try {
    const version = await skillService.getVersion(req.params.id, parseInt(req.params.ver));
    res.json(version);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

skillsRouter.post('/:id/rollback/:ver', async (req: Request, res: Response) => {
  try {
    const version = await skillService.rollback(
      req.params.id,
      parseInt(req.params.ver),
      req.user!.userId
    );
    res.json(version);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

skillsRouter.post('/:id/files', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const files = (req.files as Express.Multer.File[]).map((f) => ({
      filename: f.originalname,
      path: f.filename,
      mimeType: f.mimetype,
      size: f.size,
    }));
    res.status(201).json(files);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
