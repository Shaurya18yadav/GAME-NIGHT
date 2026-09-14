import type { Friend, MatchSummary, Profile, PublicProfile, RoomMeta, User } from './types';

const root = import.meta.env.VITE_API_URL ?? '';
const SESSION_TOKEN_KEY = 'uno_session_token';
const AUTH_TOKEN_KEY = 'uno_jwt_token';

/**
 * Returns or generates a session token (UUID) stored in browser sessionStorage.
 * Using sessionStorage ensures each browser tab or window gets a distinct
 * guest player session, allowing real-time multiplayer testing across multiple tabs
 * while surviving page refreshes within the same tab.
 */
export function getSessionToken(): string {
  let token = sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) {
    token = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `uno_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  }
  return token;
}

export function getAuthJwt(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthJwt(jwt?: string) {
  if (jwt) localStorage.setItem(AUTH_TOKEN_KEY, jwt);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const sessionToken = getSessionToken();
  const jwt = getAuthJwt();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken,
    ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    ...(init?.headers as Record<string, string> ?? {})
  };

  const response = await fetch(`${root}${path}`, { credentials: 'include', headers, ...init });
  if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload.error ?? 'Request failed.'); }
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
}

export const api = {
  me: () => request<{ user: User; token?: string }>('/api/auth/me').then((res) => {
    if (res.token) setAuthJwt(res.token);
    return res;
  }),
  guest: (username?: string) => {
    const sessionToken = getSessionToken();
    return request<{ user: User; token?: string }>('/api/auth/guest', {
      method: 'POST',
      body: JSON.stringify({ username, sessionToken })
    }).then((res) => {
      if (res.token) setAuthJwt(res.token);
      return res;
    });
  },
  signup: (body: { username: string; email: string; password: string; avatarUrl?: string; avatarPreset?: string }) =>
    request<{ user: User; token?: string }>('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) }).then((res) => {
      if (res.token) setAuthJwt(res.token);
      return res;
    }),
  login: (body: { email: string; password: string }) =>
    request<{ user: User; token?: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }).then((res) => {
      if (res.token) setAuthJwt(res.token);
      return res;
    }),
  logout: () => {
    setAuthJwt(undefined);
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    return request<void>('/api/auth/logout', { method: 'POST' });
  },
  createRoom: (body: unknown) => request<{ room: RoomMeta; inviteUrl: string }>('/api/rooms', { method: 'POST', body: JSON.stringify(body) }),
  lobby: () => request<{ rooms: RoomMeta[]; onlinePlayers?: number; playersAtTables?: number; activeTables?: number }>('/api/lobby'),
  leaderboard: (game?: string) => request<{ players: { id: string; username: string; avatarUrl?: string; avatarPreset?: string; wins: number; losses: number; rating: number }[] }>(`/api/leaderboard${game ? `?game=${encodeURIComponent(game)}` : ''}`),
  history: () => request<{ matches: MatchSummary[] }>('/api/history'),
  report: (body: unknown) => request<{ ok: true }>('/api/reports', { method: 'POST', body: JSON.stringify(body) }),
  
  // Profile & Account APIs
  getProfile: () => request<{ profile: Profile }>('/api/profile/me'),
  updateProfile: (body: unknown) => request<{ profile: Profile; user: User; token?: string }>('/api/profile/me', { method: 'PATCH', body: JSON.stringify(body) }).then((res) => {
    if (res.token) setAuthJwt(res.token);
    return res;
  }),
  uploadAvatar: async (file: File): Promise<{ avatarUrl: string; user: User; token?: string }> => {
    const sessionToken = getSessionToken();
    const jwt = getAuthJwt();
    const response = await fetch(`${root}/api/profile/avatar`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': file.type || 'image/png',
        'x-session-token': sessionToken,
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {})
      },
      body: file
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error ?? 'Avatar upload failed.');
    }
    const res = await response.json();
    if (res.token) setAuthJwt(res.token);
    return res;
  },
  getPublicProfile: (username: string) => request<{ profile: PublicProfile }>(`/api/profile/public/${encodeURIComponent(username)}`),
  friends: () => request<{ friends: Friend[] }>('/api/friends'),
  addFriend: (username: string) => request<{ ok: true }>('/api/friends', { method: 'POST', body: JSON.stringify({ username }) }),
  removeFriend: (username: string) => request<{ ok: true }>(`/api/friends/${encodeURIComponent(username)}`, { method: 'DELETE' }),
  updateCredentials: (body: unknown) => request<{ ok: true }>('/api/account/credentials', { method: 'PATCH', body: JSON.stringify(body) }),
  convertGuest: (body: unknown) => request<{ user: User; token?: string }>('/api/account/convert-guest', { method: 'POST', body: JSON.stringify(body) }).then((res) => {
    if (res.token) setAuthJwt(res.token);
    return res;
  }),
  oauthLogin: (provider: 'google' | 'discord') => request<{ user: User; token?: string }>('/api/auth/oauth-login', { method: 'POST', body: JSON.stringify({ provider }) }).then((res) => {
    if (res.token) setAuthJwt(res.token);
    return res;
  }),
  convertOAuth: (provider: 'google' | 'discord') => request<{ user: User; token?: string }>('/api/account/convert-oauth', { method: 'POST', body: JSON.stringify({ provider }) }).then((res) => {
    if (res.token) setAuthJwt(res.token);
    return res;
  }),
  logoutAll: () => {
    setAuthJwt(undefined);
    return request<void>('/api/account/logout-all', { method: 'POST' });
  },
  exportData: () => `${root}/api/account/export`,
  deleteAccount: () => {
    setAuthJwt(undefined);
    return request<void>('/api/account/me', { method: 'DELETE' });
  },
  getFeedbacks: () => request<{ feedbacks: { id: string; author_name: string; author_role?: string; rating: number; comment: string; created_at: string }[] }>('/api/feedbacks'),
  submitFeedback: (body: { rating: number; comment: string; authorName?: string; authorRole?: string }) => request<{ feedbacks: { id: string; author_name: string; author_role?: string; rating: number; comment: string; created_at: string }[] }>('/api/feedbacks', { method: 'POST', body: JSON.stringify(body) })
};

