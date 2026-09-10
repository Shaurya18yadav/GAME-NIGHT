import { Router, Request, Response } from 'express';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import { dbUser, dbOtp, UserRow } from '../db.js';
import { sendOtpEmail } from '../emailService.js';
import {
  hashPassword,
  comparePassword,
  issueAuthToken,
  clearAuthToken,
  AuthenticatedRequest
} from '../authHelper.js';
import { cryptoRandomString } from '../security.js';

export const authRouter = Router();

// Rate limiters for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 15 requests per windowMs
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

    // Check existing username or email
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
      avatarUrl: typeof avatarUrl === 'string' ? avatarUrl.trim() : undefined
    });

    // Issue httpOnly JWT cookie
    issueAuthToken(res, newUser);

    return res.status(201).json({ user: formatUserResponse(newUser) });
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
        avatarUrl: typeof avatarUrl === 'string' ? avatarUrl.trim() : undefined
      });

      issueAuthToken(res, newUser);

      return res.status(201).json({ user: formatUserResponse(newUser) });
    } else {
      const user = dbUser.findByEmailOrUsername(cleanEmail);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      issueAuthToken(res, user);
      return res.json({ user: formatUserResponse(user) });
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

    // Find user by email or username
    const user = dbUser.findByEmailOrUsername(identifier);

    // Constant-shape error (don't leak if user exists)
    if (!user || !user.password_hash || user.is_guest) {
      // Fake compare to mitigate timing attacks
      await comparePassword(password, '$2a$12$e868d4vJz6Jz6Jz6Jz6Jz.w0fF6S6S6S6S6S6S6S6S6S6S6S6S6S6');
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const match = await comparePassword(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Issue httpOnly JWT cookie
    issueAuthToken(res, user);

    return res.json({ user: formatUserResponse(user) });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
});

// 3. POST /api/auth/guest
authRouter.post('/guest', async (req: Request, res: Response) => {
  try {
    const requestedName = req.body?.username;
    let username = typeof requestedName === 'string' && requestedName.trim().length >= 3
      ? requestedName.trim()
      : `Guest_${cryptoRandomString(5)}`;

    // Ensure unique guest username
    let uniqueUsername = username;
    let count = 1;
    while (dbUser.findByEmailOrUsername(uniqueUsername)) {
      uniqueUsername = `${username}_${count++}`;
    }

    const newUser = dbUser.createUser({
      id: cryptoRandomString(12),
      username: uniqueUsername,
      isGuest: true
    });

    // Issue identical JWT token in httpOnly cookie
    issueAuthToken(res, newUser);

    return res.status(201).json({ user: formatUserResponse(newUser) });
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
authRouter.get('/me', (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    return res.json({ user: null });
  }
  return res.json({ user: formatUserResponse(authReq.user) });
});

// 6. Google OAuth Routes
authRouter.get('/google', (req: Request, res: Response, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
    return res.status(503).json({ error: 'Google OAuth is not configured.' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

authRouter.get('/google/callback', (req: Request, res: Response, next) => {
  passport.authenticate('google', { failureRedirect: '/?auth_error=google_failed', session: false }, (err: Error | null, user: UserRow | false) => {
    if (err || !user) {
      return res.redirect(`${process.env.CLIENT_URL || ''}/?auth_error=google_failed`);
    }
    issueAuthToken(res, user);
    return res.redirect(`${process.env.CLIENT_URL || ''}/lobby`);
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
  passport.authenticate('discord', { failureRedirect: '/?auth_error=discord_failed', session: false }, (err: Error | null, user: UserRow | false) => {
    if (err || !user) {
      return res.redirect(`${process.env.CLIENT_URL || ''}/?auth_error=discord_failed`);
    }
    issueAuthToken(res, user);
    return res.redirect(`${process.env.CLIENT_URL || ''}/lobby`);
  })(req, res, next);
});
