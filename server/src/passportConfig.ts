import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { dbUser } from './db.js';
import { cryptoRandomString } from './security.js';

export function configurePassport() {
  // Passport session serialization (used internally during OAuth handshake)
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id: string, done) => {
    try {
      const user = dbUser.findById(id);
      done(null, user || false);
    } catch (err) {
      done(err, false);
    }
  });

  // 1. Google OAuth Strategy
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackDomain = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3001}`;

  if (googleClientId && googleClientSecret && googleClientId !== 'YOUR_GOOGLE_CLIENT_ID') {
    passport.use(
      new GoogleStrategy(
        {
          clientID: googleClientId,
          clientSecret: googleClientSecret,
          callbackURL: `${callbackDomain}/api/auth/google/callback`,
          scope: ['profile', 'email']
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            // Check existing user by provider and providerId
            let user = dbUser.findByProvider('google', profile.id);

            if (!user && profile.emails?.[0]?.value) {
              // Try finding by email
              user = dbUser.findByEmailOrUsername(profile.emails[0].value);
            }

            if (!user) {
              // Auto-create local user record for first login
              const email = profile.emails?.[0]?.value;
              let username = profile.displayName ? profile.displayName.replace(/\s+/g, '_') : `GoogleUser_${profile.id.slice(0, 6)}`;
              
              // Ensure username uniqueness
              let uniqueUsername = username;
              let count = 1;
              while (dbUser.findByEmailOrUsername(uniqueUsername)) {
                uniqueUsername = `${username}_${count++}`;
              }

              const avatarUrl = profile.photos?.[0]?.value;

              user = dbUser.createUser({
                id: cryptoRandomString(12),
                username: uniqueUsername,
                email: email || undefined,
                isGuest: false,
                avatarUrl: avatarUrl || undefined,
                provider: 'google',
                providerId: profile.id
              });
            }

            return done(null, user);
          } catch (err) {
            return done(err as Error);
          }
        }
      )
    );
  }

  // 2. Discord OAuth Strategy
  const discordClientId = process.env.DISCORD_CLIENT_ID;
  const discordClientSecret = process.env.DISCORD_CLIENT_SECRET;

  if (discordClientId && discordClientSecret && discordClientId !== 'YOUR_DISCORD_CLIENT_ID') {
    passport.use(
      new DiscordStrategy(
        {
          clientID: discordClientId,
          clientSecret: discordClientSecret,
          callbackURL: `${callbackDomain}/api/auth/discord/callback`,
          scope: ['identify', 'email']
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            let user = dbUser.findByProvider('discord', profile.id);

            if (!user && profile.email) {
              user = dbUser.findByEmailOrUsername(profile.email);
            }

            if (!user) {
              let username = profile.username ? profile.username.replace(/\s+/g, '_') : `DiscordUser_${profile.id.slice(0, 6)}`;
              
              let uniqueUsername = username;
              let count = 1;
              while (dbUser.findByEmailOrUsername(uniqueUsername)) {
                uniqueUsername = `${username}_${count++}`;
              }

              const avatarUrl = profile.avatar
                ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
                : undefined;

              user = dbUser.createUser({
                id: cryptoRandomString(12),
                username: uniqueUsername,
                email: profile.email || undefined,
                isGuest: false,
                avatarUrl: avatarUrl,
                provider: 'discord',
                providerId: profile.id
              });
            }

            return done(null, user);
          } catch (err) {
            return done(err as Error);
          }
        }
      )
    );
  }
}
