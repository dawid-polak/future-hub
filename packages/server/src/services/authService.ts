import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User } from '../models/user.js';
import { JwtPayload } from '../middleware/jwtAuth.js';

function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn as string });
}

function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.refreshExpiresIn as string });
}

export async function login(email: string, password: string) {
  const user = await User.findOne({ email, isActive: true });
  if (!user) throw new Error('Nieprawidlowy email lub haslo');

  const isValid = await user.comparePassword(password);
  if (!isValid) throw new Error('Nieprawidlowy email lub haslo');

  const payload: JwtPayload = {
    userId: user._id.toString(),
    email: user.email,
    isAdmin: user.isAdmin,
  };

  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: user.toJSON(),
  };
}

export async function refresh(refreshToken: string) {
  try {
    const decoded = jwt.verify(refreshToken, config.jwt.secret) as JwtPayload;
    const user = await User.findOne({ _id: decoded.userId, isActive: true });
    if (!user) throw new Error('Uzytkownik nie istnieje');

    const payload: JwtPayload = {
      userId: user._id.toString(),
      email: user.email,
      isAdmin: user.isAdmin,
    };

    return {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    };
  } catch {
    throw new Error('Nieprawidlowy refresh token');
  }
}

export async function getProfile(userId: string) {
  const user = await User.findById(userId).populate('roles');
  if (!user) throw new Error('Uzytkownik nie znaleziony');
  return user.toJSON();
}
