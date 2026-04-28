import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const PREFIX = 'sk_fh_';

export async function generateApiKey(): Promise<{ raw: string; hash: string; prefix: string }> {
  const randomPart = crypto.randomBytes(20).toString('hex');
  const raw = `${PREFIX}${randomPart}`;
  const prefix = raw.substring(0, 12);
  const hash = await bcrypt.hash(raw, 12);
  return { raw, hash, prefix };
}

export async function verifyApiKey(raw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(raw, hash);
}
