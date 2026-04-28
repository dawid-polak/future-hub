import { Router, Request, Response } from 'express';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { requireAdmin } from '../middleware/rbac.js';
import * as usageService from '../services/usageService.js';

export const analyticsRouter = Router();
analyticsRouter.use(jwtAuth, requireAdmin);

function parseDateRange(req: Request) {
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to = req.query.to ? new Date(req.query.to as string) : undefined;
  return from && to ? { from, to } : undefined;
}

analyticsRouter.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const dateRange = parseDateRange(req);
    const data = await usageService.getDashboard(dateRange);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

analyticsRouter.get('/skills/:id/usage', async (req: Request, res: Response) => {
  try {
    const dateRange = parseDateRange(req);
    const data = await usageService.getSkillUsage(req.params.id, dateRange);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

analyticsRouter.get('/users/:id/activity', async (req: Request, res: Response) => {
  try {
    const dateRange = parseDateRange(req);
    const data = await usageService.getUserActivity(req.params.id, dateRange);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
