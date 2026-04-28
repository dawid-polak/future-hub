import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { requireAdmin } from '../middleware/rbac.js';
import * as roleService from '../services/roleService.js';

export const rolesRouter = Router();
rolesRouter.use(jwtAuth, requireAdmin);

rolesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const roles = await roleService.list();
    res.json(roles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

rolesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const role = await roleService.getById(req.params.id);
    res.json(role);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

rolesRouter.post(
  '/',
  validate([body('name').notEmpty().withMessage('Nazwa roli jest wymagana')]),
  async (req: Request, res: Response) => {
    try {
      const role = await roleService.create(req.body);
      res.status(201).json(role);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

rolesRouter.put(
  '/:id',
  validate([param('id').isMongoId()]),
  async (req: Request, res: Response) => {
    try {
      const role = await roleService.update(req.params.id, req.body);
      res.json(role);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

rolesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const role = await roleService.remove(req.params.id);
    res.json(role);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});
