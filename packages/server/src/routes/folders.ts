import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { requireAdmin } from '../middleware/rbac.js';
import * as folderService from '../services/folderService.js';

export const foldersRouter = Router();
foldersRouter.use(jwtAuth, requireAdmin);

foldersRouter.get('/tree', async (_req: Request, res: Response) => {
  try {
    const tree = await folderService.getTree();
    res.json(tree);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

foldersRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const folders = await folderService.list();
    res.json(folders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

foldersRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const folder = await folderService.getById(req.params.id);
    res.json(folder);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

foldersRouter.post(
  '/',
  validate([body('name').notEmpty().withMessage('Nazwa folderu jest wymagana')]),
  async (req: Request, res: Response) => {
    try {
      const folder = await folderService.create(req.body, req.user!.userId);
      res.status(201).json(folder);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

foldersRouter.put(
  '/:id',
  validate([param('id').isMongoId()]),
  async (req: Request, res: Response) => {
    try {
      const folder = await folderService.update(req.params.id, req.body);
      res.json(folder);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

foldersRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const folder = await folderService.remove(req.params.id);
    res.json(folder);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

foldersRouter.put(
  '/skills/:skillId/move',
  validate([param('skillId').isMongoId()]),
  async (req: Request, res: Response) => {
    try {
      const skill = await folderService.moveSkill(req.params.skillId, req.body.folderId ?? null);
      res.json(skill);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);
