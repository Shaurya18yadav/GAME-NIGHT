import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'database.db');
export const db = new Database(dbPath);

// Enable WAL mode for better concurrency performance
db.pragma('journal_mode = WAL');

// Initialize users table and indexes
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT,
    is_guest INTEGER NOT NULL DEFAULT 0,
    avatar_url TEXT,
    avatar_preset TEXT,
    provider TEXT,
    provider_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_provider_id
  ON users (provider, provider_id)
  WHERE provider IS NOT NULL AND provider_id IS NOT NULL;

  CREATE TABLE IF NOT EXISTS otps (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    purpose TEXT NOT NULL DEFAULT 'registration',
    expires_at INTEGER NOT NULL,
    verified INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_otps_email_code
  ON otps (email, otp_code);

  CREATE TABLE IF NOT EXISTS feedbacks (
    id TEXT PRIMARY KEY,
    author_name TEXT NOT NULL,
    author_role TEXT,
    rating INTEGER NOT NULL DEFAULT 5,
    comment TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export interface FeedbackRow {
  id: string;
  author_name: string;
  author_role?: string | null;
  rating: number;
  comment: string;
  created_at: string;
}

export const dbFeedback = {
  getAll: (): FeedbackRow[] => {
    const rows = db.prepare('SELECT * FROM feedbacks ORDER BY created_at DESC LIMIT 20').all() as FeedbackRow[];
    if (rows.length === 0) {
      const defaults = [
        { id: 'f1', author_name: 'mira.k', author_role: 'Classic Table regular', rating: 5, comment: "Matchmaking is instant and nobody's arguing about stacking rules anymore — the app just decides." },
        { id: 'f2', author_name: 'jt_plays', author_role: 'Speed Round main', rating: 5, comment: 'Speed Round is genuinely stressful in the best way. Ten seconds is not enough time to think, which is the point.' },
        { id: 'f3', author_name: 'soledad_o', author_role: 'House Rules main', rating: 5, comment: 'My partner and I climbed the Team Play board over a weekend. The signal system actually works.' }
      ];
      for (const d of defaults) {
        db.prepare('INSERT OR IGNORE INTO feedbacks (id, author_name, author_role, rating, comment) VALUES (?, ?, ?, ?, ?)').run(d.id, d.author_name, d.author_role, d.rating, d.comment);
      }
      return db.prepare('SELECT * FROM feedbacks ORDER BY created_at DESC LIMIT 20').all() as FeedbackRow[];
    }
    return rows;
  },

  addFeedback: (id: string, authorName: string, authorRole: string | undefined, rating: number, comment: string): FeedbackRow => {
    db.prepare('INSERT INTO feedbacks (id, author_name, author_role, rating, comment) VALUES (?, ?, ?, ?, ?)').run(
      id, authorName, authorRole || 'Player', rating, comment
    );
    return db.prepare('SELECT * FROM feedbacks WHERE id = ?').get(id) as FeedbackRow;
  }
};

export interface OtpRow {
  id: string;
  email: string;
  otp_code: string;
  purpose: string;
  expires_at: number;
  verified: number;
  created_at: string;
}

export const dbOtp = {
  createOtp: (id: string, email: string, otpCode: string, purpose: string = 'registration', ttlMinutes: number = 10): OtpRow => {
    const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
    db.prepare(`UPDATE otps SET verified = 1 WHERE LOWER(email) = LOWER(?) AND purpose = ?`).run(email, purpose);

    const stmt = db.prepare(`
      INSERT INTO otps (id, email, otp_code, purpose, expires_at, verified)
      VALUES (?, LOWER(?), ?, ?, ?, 0)
    `);
    stmt.run(id, email, otpCode, purpose, expiresAt);
    return db.prepare('SELECT * FROM otps WHERE id = ?').get(id) as OtpRow;
  },

  verifyOtp: (email: string, otpCode: string, purpose: string = 'registration'): boolean => {
    const now = Date.now();
    const row = db.prepare(`
      SELECT * FROM otps 
      WHERE LOWER(email) = LOWER(?) 
        AND otp_code = ? 
        AND purpose = ? 
        AND verified = 0
        AND expires_at > ?
      ORDER BY expires_at DESC
      LIMIT 1
    `).get(email, otpCode, purpose, now) as OtpRow | undefined;

    if (!row) return false;

    db.prepare('UPDATE otps SET verified = 1 WHERE id = ?').run(row.id);
    return true;
  }
};

export interface UserRow {
  id: string;
  username: string;
  email?: string | null;
  password_hash?: string | null;
  is_guest: number;
  avatar_url?: string | null;
  avatar_preset?: string | null;
  provider?: string | null;
  provider_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const dbUser = {
  findById: (id: string): UserRow | undefined => {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  },

  findByEmailOrUsername: (emailOrUsername: string): UserRow | undefined => {
    return db.prepare(`
      SELECT * FROM users 
      WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)
    `).get(emailOrUsername, emailOrUsername) as UserRow | undefined;
  },

  findByProvider: (provider: string, providerId: string): UserRow | undefined => {
    return db.prepare(`
      SELECT * FROM users 
      WHERE provider = ? AND provider_id = ?
    `).get(provider, providerId) as UserRow | undefined;
  },

  createUser: (user: {
    id: string;
    username: string;
    email?: string | null;
    passwordHash?: string | null;
    isGuest?: boolean;
    avatarUrl?: string | null;
    avatarPreset?: string | null;
    provider?: string | null;
    providerId?: string | null;
  }): UserRow => {
    const stmt = db.prepare(`
      INSERT INTO users (id, username, email, password_hash, is_guest, avatar_url, avatar_preset, provider, provider_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      user.id,
      user.username,
      user.email || null,
      user.passwordHash || null,
      user.isGuest ? 1 : 0,
      user.avatarUrl || null,
      user.avatarPreset || null,
      user.provider || null,
      user.providerId || null
    );

    return dbUser.findById(user.id)!;
  }
};
