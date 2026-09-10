# 🔐 Full-Stack Authentication System Setup Guide

This document provides complete instructions for setting up, configuring, and running the full-stack authentication system powered by **Node.js, Express, Passport.js (Google & Discord OAuth), SQLite (`better-sqlite3`), and JWT in httpOnly cookies**.

---

## 📧 REAL-TIME EMAIL DELIVERY SETUP (GMAIL / SMTP)

By default, when no SMTP server is configured, the system logs the OTP code to your server terminal and generates a real-time **Ethereal Mail preview link** (`https://ethereal.email/message/...`).

To send real verification emails directly to **any entered email address** (e.g. `user@gmail.com`):

### Option A: Using Gmail (Free & Fast)
1. Go to your [Google Account Security Settings](https://myaccount.google.com/security).
2. Ensure **2-Step Verification** is turned ON.
3. Search for **App passwords** (or go to [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)).
4. Create a new App Password (name it `UNO Night`).
5. Copy the generated 16-character password (e.g., `abcd efgh ijkl mnop`).
6. Add the following lines to your `.env` file:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=abcdefghijklmnop
   SMTP_FROM=your-email@gmail.com
   ```
7. Restart the server (`npm run dev`). Now every OTP code will be sent directly to the entered email inbox!

---

## 🛠️ STACK ARCHITECTURE

- **Backend**: Node.js + Express
- **Database**: File-based SQLite (`better-sqlite3`) — zero external DB dependencies!
- **OAuth Strategies**: Passport.js with `passport-google-oauth20` and `passport-discord`
- **Session Bridge**: `express-session` used exclusively for OAuth redirect handshakes
- **Token Security**: 7-day JWT session token stored in an `httpOnly`, `sameSite=lax` cookie
- **Password Security**: `bcrypt` (cost factor 12, min 10 characters)
- **Rate Limiting**: `express-rate-limit` protecting `/api/auth/register` and `/api/auth/login`
- **Frontend UI**: Responsive Dark Teal/Cyan Glassmorphism Modal with Guest login, Social OAuth, tab switcher, password strength meter, and inline validation.

---

## 🚀 1. LOCAL RUN INSTRUCTIONS

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation & Server Launch

1. **Install All Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. **Generate Secure Cryptographic Secrets**:
   Run the following OpenSSL command to generate secure 256-bit keys for `SESSION_SECRET` and `JWT_SECRET`:
   ```bash
   openssl rand -base64 32
   ```
   Paste the generated values into your `.env` file for `SESSION_SECRET` and `JWT_SECRET`.

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   - **Frontend App**: `http://localhost:5173`
   - **Backend API**: `http://localhost:3001`
   - **Standalone Glassmorphism Auth Modal**: `http://localhost:5173/auth-modal.html`

---

## 🌐 2. GOOGLE OAUTH CREDENTIAL SETUP

To enable Google Sign-In:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing project.
3. In the left menu, navigate to **APIs & Services** > **OAuth consent screen**.
   - Select **External** user type and click **Create**.
   - Fill in mandatory fields (App name, User support email, Developer contact email).
   - Save and continue through Scopes (add `.../auth/userinfo.email` and `.../auth/userinfo.profile`).
4. Navigate to **APIs & Services** > **Credentials**.
5. Click **+ CREATE CREDENTIALS** > **OAuth client ID**.
6. Select **Web application** as the application type.
7. Set **Authorized JavaScript origins**:
   - `http://localhost:3001`
   - `http://localhost:5173`
8. Set **Authorized redirect URIs**:
   - `http://localhost:3001/api/auth/google/callback`
9. Click **Create**. Copy the generated **Client ID** and **Client Secret**.
10. Update your `.env` file:
    ```env
    GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
    GOOGLE_CLIENT_SECRET=your-google-client-secret
    ```

---

## 🎮 3. DISCORD OAUTH APP SETUP

To enable Discord Sign-In:

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** in the top right, name your app, and accept terms.
3. In the left menu, click **OAuth2**.
4. Scroll down to **Redirects** and click **Add Redirect**.
   - Add URI: `http://localhost:3001/api/auth/discord/callback`
   - Save changes.
5. In the **OAuth2** section, copy the **Client ID**.
6. Click **Reset Secret** under Client Secret to reveal and copy your **Client Secret**.
7. Update your `.env` file:
    ```env
    DISCORD_CLIENT_ID=your-discord-application-client-id
    DISCORD_CLIENT_SECRET=your-discord-client-secret
    ```

---

## 🧪 4. BACKEND API ENDPOINTS REFERENCE

All endpoints are mounted under `/api/auth`:

| Method | Endpoint | Description | Rate-Limited | Auth Required |
| :--- | :--- | :--- | :---: | :---: |
| `POST` | `/api/auth/register` | Register local user (bcrypt cost 12) | ✅ Yes | ❌ No |
| `POST` | `/api/auth/login` | Login user (email or username) | ✅ Yes | ❌ No |
| `POST` | `/api/auth/guest` | Instant guest login (`Guest_XXXX`) | ❌ No | ❌ No |
| `POST` | `/api/auth/logout` | Clear httpOnly JWT cookie | ❌ No | ❌ No |
| `GET` | `/api/auth/me` | Return active user profile from JWT | ❌ No | ❌ No |
| `GET` | `/api/auth/google` | Trigger Google OAuth handshake | ❌ No | ❌ No |
| `GET` | `/api/auth/google/callback` | Google OAuth callback & JWT set | ❌ No | ❌ No |
| `GET` | `/api/auth/discord` | Trigger Discord OAuth handshake | ❌ No | ❌ No |
| `GET` | `/api/auth/discord/callback` | Discord OAuth callback & JWT set | ❌ No | ❌ No |

---

## 🛡️ SECURITY HIGHLIGHTS

- **Password Hashes**: Hashed with `bcrypt` using cost factor 12. Password hashes are excluded from all API responses and logs.
- **Constant-Shape Login Failure**: Failed login queries execute dummy bcrypt comparisons to prevent timing attacks and leak zero information about account existence.
- **SameSite Cookies**: Session tokens stored in `httpOnly`, `sameSite=lax` cookies with 7-day expiry to prevent XSS credential extraction.
- **SQLite Unique Indexes**: Enforces uniqueness on `(provider, provider_id)` for OAuth accounts and `username`/`email` for local accounts.
