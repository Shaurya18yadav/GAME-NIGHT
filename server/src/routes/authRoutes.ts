import { Router, Request, Response } from 'express';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import { dbUser, dbOtp, UserRow } from '../db.js';
import { repository } from '../repository.js';
import { sendOtpEmail } from '../emailService.js';
import { config } from '../config.js';
import {
  hashPassword,
  comparePassword,
  issueAuthToken,
  clearAuthToken,
  AuthenticatedRequest
} from '../authHelper.js';
import {
  cryptoRandomString,
  encryptSensitive,
  hashEmail,
  sessionFromRequest,
  signSession,
  randomPresetAvatar
} from '../security.js';
import type { SessionUser } from '../types.js';

export const authRouter = Router();

// Rate limiters for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts from this IP, please try again after 15 minutes.' }
});

function formatUserResponse(user: UserRow) {
  return {
    id: user.id,
    username: user.username,
    email: user.email || undefined,
    isGuest: Boolean(user.is_guest),
    avatarUrl: user.avatar_url || undefined,
    avatarPreset: user.avatar_preset || undefined,
    provider: user.provider || undefined
  };
}

// Helper to ensure repository has a corresponding record for stats & match history
async function syncToRepository(user: UserRow, email?: string, passwordHash?: string) {
  try {
    const cleanEmail = (email || user.email || `${user.username.toLowerCase()}@local.game`).trim().toLowerCase();
    await repository.createAccount({
      id: user.id,
      username: user.username,
      isGuest: Boolean(user.is_guest),
      avatarUrl: user.avatar_url || undefined,
      avatarPreset: user.avatar_preset || undefined,
      emailCiphertext: encryptSensitive(cleanEmail),
      emailHash: hashEmail(cleanEmail),
      passwordHash: passwordHash || user.password_hash || 'OAUTH_EXTERNAL',
      createdAt: new Date().toISOString()
    });
  } catch {
    // Ignore duplicate or existing account errors
  }
}

// 1. POST /api/auth/register
authRouter.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { username, email, password, avatarUrl } = req.body || {};

    // Validation
    if (!username || typeof username !== 'string' || username.trim().length < 3 || username.trim().length > 24) {
      return res.status(400).json({ error: 'Username must be between 3 and 24 characters.' });
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (!password || typeof password !== 'string' || password.length < 10) {
      return res.status(400).json({ error: 'Password must be at least 10 characters long.' });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Check existing username or email in SQLite
    if (dbUser.findByEmailOrUsername(cleanUsername)) {
      return res.status(409).json({ error: 'Username is already taken.' });
    }

    if (dbUser.findByEmailOrUsername(cleanEmail)) {
      return res.status(409).json({ error: 'Email address is already registered.' });
    }

    // Hash password with bcrypt cost 12
    const passwordHash = await hashPassword(password);
    const userId = cryptoRandomString(12);

    const newUser = dbUser.createUser({
      id: userId,
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      isGuest: false,
      avatarUrl: typeof avatarUrl === 'string' ? avatarUrl.trim() : undefined,
      avatarPreset: randomPresetAvatar()
    });

    await syncToRepository(newUser, cleanEmail, passwordHash);

    // Issue unified httpOnly cookie & session token
    const token = issueAuthToken(res, newUser);

    return res.status(201).json({ user: formatUserResponse(newUser), token });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'An error occurred during registration.' });
  }
});

// 1b. POST /api/auth/send-otp
authRouter.post('/send-otp', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, purpose } = req.body || {};

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const otpPurpose = purpose === 'login' ? 'login' : 'registration';

    if (otpPurpose === 'registration' && dbUser.findByEmailOrUsername(cleanEmail)) {
      return res.status(409).json({ error: 'Email address is already registered.' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpId = cryptoRandomString(12);

    dbOtp.createOtp(otpId, cleanEmail, otpCode, otpPurpose, 10);

    const emailResult = await sendOtpEmail(cleanEmail, otpCode, otpPurpose);

    return res.json({
      ok: true,
      message: `Verification code sent to ${cleanEmail}`,
      devOtp: emailResult.devOtp,
      emailPreviewUrl: emailResult.emailPreviewUrl
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    return res.status(500).json({ error: 'Failed to send OTP verification code.' });
  }
});

// 1c. POST /api/auth/verify-otp
authRouter.post('/verify-otp', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, otpCode, username, password, avatarUrl, purpose } = req.body || {};

    if (!email || !otpCode) {
      return res.status(400).json({ error: 'Email and OTP code are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otpCode.toString().trim();
    const otpPurpose = purpose === 'login' ? 'login' : 'registration';

    const isValid = dbOtp.verifyOtp(cleanEmail, cleanOtp, otpPurpose);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    if (otpPurpose === 'registration') {
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required for registration.' });
      }

      if (dbUser.findByEmailOrUsername(username.trim())) {
        return res.status(409).json({ error: 'Username is already taken.' });
      }

      const passwordHash = await hashPassword(password);
      const userId = cryptoRandomString(12);

      const newUser = dbUser.createUser({
        id: userId,
        username: username.trim(),
        email: cleanEmail,
        passwordHash,
        isGuest: false,
        avatarUrl: typeof avatarUrl === 'string' ? avatarUrl.trim() : undefined,
        avatarPreset: randomPresetAvatar()
      });

      await syncToRepository(newUser, cleanEmail, passwordHash);

      const token = issueAuthToken(res, newUser);

      return res.status(201).json({ user: formatUserResponse(newUser), token });
    } else {
      let user = dbUser.findByEmailOrUsername(cleanEmail);
      if (!user) {
        // Fallback to repository
        const account = await repository.findAccountByEmailHash(hashEmail(cleanEmail));
        if (account) {
          user = dbUser.createUser({
            id: account.id,
            username: account.username,
            email: cleanEmail,
            passwordHash: account.passwordHash,
            isGuest: false,
            avatarUrl: account.avatarUrl,
            avatarPreset: account.avatarPreset
          });
        }
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const token = issueAuthToken(res, user);
      return res.json({ user: formatUserResponse(user), token });
    }
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ error: 'Verification failed.' });
  }
});

// 2. POST /api/auth/login
authRouter.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { login, email, username, password } = req.body || {};
    const identifier = (login || email || username || '').toString().trim();

    if (!identifier || !password || typeof password !== 'string') {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // 1. Find user by email or username in SQLite
    let user = dbUser.findByEmailOrUsername(identifier);

    // 2. Fallback to repository if not found in SQLite
    if (!user) {
      const emailHash = hashEmail(identifier);
      const account = await repository.findAccountByEmailHash(emailHash);
      if (account) {
        const match = await comparePassword(password, account.passwordHash);
        if (match) {
          user = dbUser.createUser({
            id: account.id,
            username: account.username,
            email: identifier.includes('@') ? identifier.toLowerCase() : null,
            passwordHash: account.passwordHash,
            isGuest: false,
            avatarUrl: account.avatarUrl,
            avatarPreset: account.avatarPreset
          });
        }
      }
    }

    // Constant-shape error (mitigate timing attacks)
    if (!user || !user.password_hash || user.is_guest) {
      await comparePassword(password, '$2a$12$e868d4vJz6Jz6Jz6Jz6Jz.w0fF6S6S6S6S6S6S6S6S6S6S6S6S6S6');
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const match = await comparePassword(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Issue unified httpOnly JWT cookie & return token
    const token = issueAuthToken(res, user);

    return res.json({ user: formatUserResponse(user), token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
});

// 3. POST /api/auth/guest
authRouter.post('/guest', async (req: Request, res: Response) => {
  try {
    // If request already carries a valid active session, reuse it
    const existing = sessionFromRequest(req);
    if (existing) {
      const token = signSession(existing);
      return res.json({ user: existing, token });
    }

    const sessionToken = (req.headers['x-session-token'] as string | undefined) || req.body?.sessionToken;
    const requestedName = req.body?.username;
    const hasPersistentId = Boolean(sessionToken && /^[0-9a-fA-F-]{8,64}$/.test(sessionToken.trim()));
    const userId = hasPersistentId ? sessionToken!.trim() : cryptoRandomString(12);

    let username = typeof requestedName === 'string' && requestedName.trim().length >= 3
      ? requestedName.trim()
      : `Guest_${userId.slice(0, 4).toUpperCase()}`;

    // Ensure unique guest username in SQLite
    let uniqueUsername = username;
    let count = 1;
    while (dbUser.findByEmailOrUsername(uniqueUsername)) {
      uniqueUsername = `${username}_${count++}`;
    }

    let user = dbUser.findById(userId);
    if (!user) {
      user = dbUser.createUser({
        id: userId,
        username: uniqueUsername,
        isGuest: true,
        avatarPreset: randomPresetAvatar()
      });
    }

    // Issue unified JWT token and cookie
    const token = issueAuthToken(res, user);

    return res.status(201).json({ user: formatUserResponse(user), token });
  } catch (err) {
    console.error('Guest creation error:', err);
    return res.status(500).json({ error: 'Could not create guest session.' });
  }
});

// 4. POST /api/auth/logout
authRouter.post('/logout', (_req: Request, res: Response) => {
  clearAuthToken(res);
  return res.json({ ok: true });
});

// 5. GET /api/auth/me
authRouter.get('/me', async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  let user = authReq.user;

  if (!user) {
    const session = sessionFromRequest(req);
    if (session) {
      user = dbUser.findById(session.id);
      if (!user) {
        return res.json({ user: session, token: signSession(session) });
      }
    }
  }

  if (!user) {
    return res.status(401).json({ error: 'No active session.' });
  }

  const sessionUser: SessionUser = {
    id: user.id,
    username: user.username,
    isGuest: Boolean(user.is_guest),
    avatarUrl: user.avatar_url || undefined,
    avatarPreset: user.avatar_preset || undefined
  };

  return res.json({ user: formatUserResponse(user), token: signSession(sessionUser) });
});

// 6. Google OAuth Routes
authRouter.get('/google', (req: Request, res: Response, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
    return res.status(503).json({ error: 'Google OAuth is not configured.' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

authRouter.get('/google/callback', (req: Request, res: Response, next) => {
  passport.authenticate('google', { failureRedirect: '/?auth_error=google_failed', session: false }, async (err: Error | null, user: UserRow | false) => {
    if (err || !user) {
      return res.redirect(`${process.env.CLIENT_URL || config.clientOrigin}/?auth_error=google_failed`);
    }
    await syncToRepository(user);
    issueAuthToken(res, user);
    return res.redirect(`${process.env.CLIENT_URL || config.clientOrigin}/lobby`);
  })(req, res, next);
});

// 7. Discord OAuth Routes
authRouter.get('/discord', (req: Request, res: Response, next) => {
  if (!process.env.DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID === 'YOUR_DISCORD_CLIENT_ID') {
    return res.status(503).json({ error: 'Discord OAuth is not configured.' });
  }
  passport.authenticate('discord', { scope: ['identify', 'email'] })(req, res, next);
});

authRouter.get('/discord/callback', (req: Request, res: Response, next) => {
  passport.authenticate('discord', { failureRedirect: '/?auth_error=discord_failed', session: false }, async (err: Error | null, user: UserRow | false) => {
    if (err || !user) {
      return res.redirect(`${process.env.CLIENT_URL || config.clientOrigin}/?auth_error=discord_failed`);
    }
    await syncToRepository(user);
    issueAuthToken(res, user);
    return res.redirect(`${process.env.CLIENT_URL || config.clientOrigin}/lobby`);
  })(req, res, next);
});
