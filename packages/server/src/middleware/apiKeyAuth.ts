import { Request, Response, NextFunction } from 'express';
import { ApiKey } from '../models/apiKey.js';
import { verifyApiKey } from '../utils/apiKeyGenerator.js';

export async function apiKeyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer sk_fh_')) {
    res.status(401).json({ error: 'Brak lub nieprawidlowy API key' });
    return;
  }

  const rawKey = authHeader.substring(7);
  const prefix = rawKey.substring(0, 12);

  try {
    const candidates = await ApiKey.find({ prefix, isActive: true });
    for (const candidate of candidates) {
      const isValid = await verifyApiKey(rawKey, candidate.keyHash);
      if (isValid) {
        if (candidate.expiresAt && candidate.expiresAt < new Date()) {
          res.status(401).json({ error: 'API key wygasl' });
          return;
        }
        candidate.lastUsedAt = new Date();
        await candidate.save();
        req.apiUser = {
          userId: candidate.userId.toString(),
          apiKeyId: candidate._id.toString(),
        };
        next();
        return;
      }
    }
    res.status(401).json({ error: 'Nieprawidlowy API key' });
  } catch (error) {
    res.status(500).json({ error: 'Blad weryfikacji API key' });
  }
}
