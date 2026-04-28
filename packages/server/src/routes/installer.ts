import { Router, Request, Response } from 'express';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { config } from '../config/index.js';
import * as installerService from '../services/installerService.js';
import { buildBashInstaller } from '../utils/installerBash.js';
import { buildPowershellInstaller } from '../utils/installerPowershell.js';

export const installerRouter = Router();

installerRouter.get('/info', (_req: Request, res: Response) => {
  res.json({
    companyName: config.installer.companyName,
    apiBase: config.installer.publicBaseUrl,
    version: '1.0.0',
  });
});

installerRouter.get('/skills/me', jwtAuth, async (req: Request, res: Response) => {
  try {
    const skills = await installerService.getSkillsAsMarkdown(req.user!.userId);
    res.json(skills);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

installerRouter.get('/install.sh', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(buildBashInstaller(config.installer.publicBaseUrl, config.installer.companyName));
});

installerRouter.get('/install.ps1', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(buildPowershellInstaller(config.installer.publicBaseUrl, config.installer.companyName));
});
