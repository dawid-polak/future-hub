import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import * as authService from '../services/authService.js';

export const authRouter = Router();

authRouter.post(
  '/login',
  validate([
    body('email').isEmail().withMessage('Podaj prawidlowy email'),
    body('password').notEmpty().withMessage('Haslo jest wymagane'),
  ]),
  async (req: Request, res: Response) => {
    try {
      const result = await authService.login(req.body.email, req.body.password);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }
);

authRouter.post(
  '/refresh',
  validate([body('refreshToken').notEmpty().withMessage('Refresh token jest wymagany')]),
  async (req: Request, res: Response) => {
    try {
      const result = await authService.refresh(req.body.refreshToken);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }
);

authRouter.get('/me', jwtAuth, async (req: Request, res: Response) => {
  try {
    const profile = await authService.getProfile(req.user!.userId);
    res.json(profile);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});
