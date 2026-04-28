import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { requireAdmin } from '../middleware/rbac.js';
import * as userService from '../services/userService.js';

export const usersRouter = Router();
usersRouter.use(jwtAuth, requireAdmin);

usersRouter.get(
  '/',
  async (req: Request, res: Response) => {
    try {
      const result = await userService.list({
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        search: req.query.search as string,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

usersRouter.post(
  '/',
  validate([
    body('email').isEmail().withMessage('Podaj prawidlowy email'),
    body('name').notEmpty().withMessage('Imie jest wymagane'),
    body('password').isLength({ min: 6 }).withMessage('Haslo musi miec min. 6 znakow'),
  ]),
  async (req: Request, res: Response) => {
    try {
      const user = await userService.create(req.body);
      res.status(201).json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

usersRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await userService.getById(req.params.id);
    res.json(user);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

usersRouter.put(
  '/:id',
  validate([param('id').isMongoId()]),
  async (req: Request, res: Response) => {
    try {
      const user = await userService.update(req.params.id, req.body);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

usersRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const user = await userService.deactivate(req.params.id);
    res.json(user);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

usersRouter.post(
  '/:id/apiKeys',
  validate([
    param('id').isMongoId(),
    body('name').notEmpty().withMessage('Nazwa klucza jest wymagana'),
  ]),
  async (req: Request, res: Response) => {
    try {
      const result = await userService.createApiKey(req.params.id, req.body.name);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

usersRouter.get('/:id/apiKeys', async (req: Request, res: Response) => {
  try {
    const keys = await userService.listApiKeys(req.params.id);
    res.json(keys);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

usersRouter.delete('/:id/apiKeys/:keyId', async (req: Request, res: Response) => {
  try {
    const result = await userService.revokeApiKey(req.params.id, req.params.keyId);
    res.json(result);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});
