import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Response, Request, NextFunction } from 'express';
import { dbUser, UserRow } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me_in_production_jwt_key_12345';
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AuthenticatedRequest extends Request {
  user?: UserRow;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function issueAuthToken(res: Response, user: UserRow): string {
  const payload = {
    sub: user.id,
    username: user.username,
    isGuest: Boolean(user.is_guest)
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

  // Set httpOnly, sameSite=lax 7-day cookie
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: TOKEN_MAX_AGE_MS,
    path: '/'
  });

  return token;
}

export function clearAuthToken(res: Response) {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined = req.cookies?.token;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    req.user = undefined;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };
    const user = dbUser.findById(decoded.sub);
    req.user = user || undefined;
  } catch {
    req.user = undefined;
  }

  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  next();
}
