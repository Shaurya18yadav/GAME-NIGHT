import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Response, Request, NextFunction } from 'express';
import { dbUser, UserRow } from './db.js';
import { config } from './config.js';
import { setSession, clearSession, signSession, verifySession, sessionFromRequest } from './security.js';
import type { SessionUser } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || config.sessionSecret;
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
  const sessionUser: SessionUser = {
    id: user.id,
    username: user.username,
    isGuest: Boolean(user.is_guest),
    avatarUrl: user.avatar_url || undefined,
    avatarPreset: user.avatar_preset || undefined
  };

  // 1. Sign canonical JWT session token
  const token = signSession(sessionUser);

  // 2. Set uno_session cookie
  setSession(res, sessionUser);

  // 3. Set 'token' cookie as well for backward compatibility
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.production,
    maxAge: TOKEN_MAX_AGE_MS,
    path: '/'
  });

  return token;
}

export function clearAuthToken(res: Response) {
  clearSession(res);
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.production,
    path: '/'
  });
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // First attempt session from uno_session cookie or x-session-token / Authorization header
  const session = sessionFromRequest(req);
  if (session) {
    const existing = dbUser.findById(session.id);
    if (existing) {
      req.user = existing;
      return next();
    }
    // Synthesize user row for guest or memory repository users
    req.user = {
      id: session.id,
      username: session.username,
      is_guest: session.isGuest ? 1 : 0,
      avatar_url: session.avatarUrl,
      avatar_preset: session.avatarPreset,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    return next();
  }

  // Fallback to legacy token cookie
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
    const verified = verifySession(token);
    if (verified) {
      const user = dbUser.findById(verified.id);
      req.user = user || {
        id: verified.id,
        username: verified.username,
        is_guest: verified.isGuest ? 1 : 0,
        avatar_url: verified.avatarUrl,
        avatar_preset: verified.avatarPreset,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return next();
    }

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
