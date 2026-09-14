import { FormEvent, useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { api, getAuthJwt, getSessionToken } from './api';
import type { Card, Color, Friend, GameSnapshot, MatchSummary, Profile, PublicProfile, RoomMeta, ServerStats, User } from './types';
import { LudoGame } from './components/LudoGame';
import { SnakesLaddersGame } from './components/SnakesLaddersGame';
import { FeedbackSection } from './components/FeedbackSection';
import { CreateRoomModal } from './components/CreateRoomModal';
import { CommonPreMatchLobby } from './components/CommonPreMatchLobby';
import { SharedMatchOverModal } from './components/SharedMatchOverModal';
import { RulebookModal } from './components/RulebookModal';
import { GameChatPanel } from './components/GameChatPanel';
import { ReactionWheel } from './components/ReactionWheel';
import { VoiceChatBar } from './components/VoiceChatBar';
import { FloatingReactionOverlay, type EmoteBroadcastEvent } from './components/FloatingReactionOverlay';
import { ShareInviteModal } from './components/ShareInviteModal';

const socketUrl = import.meta.env.VITE_API_URL || undefined;

export const AVATAR_PRESETS: Record<string, { label: string; emoji: string }> = {
  red_dragon: { label: 'Red Dragon', emoji: '🐲' },
  blue_bot: { label: 'Blue Bot', emoji: '🤖' },
  wild_crown: { label: 'Wild Crown', emoji: '👑' },
  star_master: { label: 'Star Master', emoji: '⭐' },
  gold_uno: { label: 'Gold Card', emoji: '🃏' },
  fire_cards: { label: 'Fire Cards', emoji: '🔥' },
  shield_hero: { label: 'Shield Hero', emoji: '🛡️' },
  cosmic_star: { label: 'Cosmic Pilot', emoji: '🚀' }
};

export const COUNTRIES: Record<string, { name: string; flag: string }> = {
  US: { name: 'United States', flag: '🇺🇸' },
  CA: { name: 'Canada', flag: '🇨🇦' },
  GB: { name: 'United Kingdom', flag: '🇬🇧' },
  IN: { name: 'India', flag: '🇮🇳' },
  DE: { name: 'Germany', flag: '🇩🇪' },
  JP: { name: 'Japan', flag: '🇯🇵' },
  BR: { name: 'Brazil', flag: '🇧🇷' },
  AU: { name: 'Australia', flag: '🇦🇺' },
  FR: { name: 'France', flag: '🇫🇷' },
  ES: { name: 'Spain', flag: '🇪🇸' },
  MX: { name: 'Mexico', flag: '🇲🇽' },
  IT: { name: 'Italy', flag: '🇮🇹' }
};

export const ALL_ACHIEVEMENTS = [
  { title: 'First Win', description: 'Win your first UNO match', emoji: '🏆' },
  { title: 'Hot Streak', description: 'Reach a 3-match win streak', emoji: '🔥' },
  { title: 'Unstoppable', description: 'Reach a 5-match win streak', emoji: '⚡' },
  { title: 'UNO Master', description: 'Call UNO 10 times in matches', emoji: '🃏' },
  { title: 'Table Regular', description: 'Play 25 total matches', emoji: '🎲' },
  { title: 'Hawk Eye', description: 'Catch 3 opponents who forgot UNO', emoji: '🦅' },
  { title: 'Century Club', description: 'Play 100 total matches', emoji: '💯' }
];

function AvatarDisplay({ url, preset, username, size = 'medium', onClick }: { url?: string; preset?: string; username: string; size?: 'small' | 'medium' | 'large'; onClick?: () => void }) {
  const presetEmoji = preset && AVATAR_PRESETS[preset] ? AVATAR_PRESETS[preset].emoji : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`avatar avatar-${size} ${onClick ? 'interactive' : ''}`}
      aria-label={`${username}'s avatar`}
    >
      {url ? (
        <img src={url} alt={username} />
      ) : presetEmoji ? (
        <span className="preset-emoji">{presetEmoji}</span>
      ) : (
        <span>{username.slice(0, 1).toUpperCase()}</span>
      )}
    </button>
  );
}

function CardView({ card, faceDown = false, active = false, playable = true, onClick }: { card?: Card; faceDown?: boolean; active?: boolean; playable?: boolean; onClick?: () => void }) {
  if (faceDown) {
    return (
      <button onClick={onClick} className="uno-card card-back" aria-label="Face-down card" disabled={!onClick}>
        <span className="logo-text">UNO</span>
      </button>
    );
  }
  if (!card) return <div className="uno-card empty-card">?</div>;
  const label = card.value === 'skip' ? '⊘' : card.value === 'reverse' ? '↺' : card.value === 'draw2' ? '+2' : card.value === 'wild4' ? '+4' : card.value === 'wild' ? '✦' : card.value;
  const colorClass = card.color ? `card-${card.color}` : 'card-wild';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`uno-card ${colorClass} ${active ? 'active-card' : ''} ${playable ? 'playable' : 'unplayable'}`}
      aria-label={`${card.color ?? 'wild'} ${card.value}`}
    >
      <span className="corner-val top-left">{label}</span>
      <div className="card-inner">
        <div className="oval-center">
          <span className="center-val val-color">{label}</span>
        </div>
      </div>
      <span className="corner-val bottom-right">{label}</span>
    </button>
  );
}

function AuthPanel({ onDone }: { onDone: (u: User) => void }) {
  const [tab, setTab] = useState<'signup' | 'signin'>('signup');
  const [otpStep, setOtpStep] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const playAsGuest = async () => {
    setError('');
    try {
      const result = await api.guest();
      onDone(result.user);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Guest session creation failed.');
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (tab === 'signin') {
      try {
        const res = await api.login({ email, password });
        onDone(res.user);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid credentials.');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, purpose: 'registration' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP code.');
      if (data.devOtp) setDevOtp(data.devOtp);
      if (data.emailPreviewUrl) setEmailPreviewUrl(data.emailPreviewUrl);
      setOtpStep(true);
      setSuccess(`Verification code sent to ${email}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send OTP failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, otpCode, username, password, avatarUrl, purpose: 'registration' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed.');
      onDone(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-panel-container">
      {error && <div className="alert-box error" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', padding: '0.6rem', borderRadius: '8px', marginBottom: '0.8rem', fontSize: '0.85rem' }}>{error}</div>}
      {success && <div className="alert-box success" style={{ background: 'rgba(20,184,166,0.15)', color: '#99f6e4', padding: '0.6rem', borderRadius: '8px', marginBottom: '0.8rem', fontSize: '0.85rem' }}>{success}</div>}

      {!otpStep ? (
        <>
          <button type="button" className="primary big width-full guest-cta-btn" onClick={playAsGuest} style={{ width: '100%', padding: '0.85rem', marginBottom: '1rem', background: 'linear-gradient(135deg, #ff5e62 0%, #ff9966 100%)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
            ⚡ Play Instantly as Guest
          </button>

          <div className="divider-line" style={{ textAlign: 'center', margin: '1rem 0', color: 'rgba(153,246,228,0.5)', fontSize: '0.75rem', fontWeight: 'bold' }}><span>OR SIGN IN WITH ACCOUNT</span></div>

          <div className="tab-switcher" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.2rem' }}>
            <button type="button" className={`tab-btn ${tab === 'signup' ? 'active' : ''}`} onClick={() => setTab('signup')} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', background: tab === 'signup' ? '#2dd4bf' : 'rgba(15,23,42,0.6)', color: tab === 'signup' ? '#041823' : '#94a3b8', fontWeight: 'bold', cursor: 'pointer' }}>Sign Up</button>
            <button type="button" className={`tab-btn ${tab === 'signin' ? 'active' : ''}`} onClick={() => setTab('signin')} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', background: tab === 'signin' ? '#2dd4bf' : 'rgba(15,23,42,0.6)', color: tab === 'signin' ? '#041823' : '#94a3b8', fontWeight: 'bold', cursor: 'pointer' }}>Sign In</button>
          </div>

          <form className="form-stack" onSubmit={handleSendOtp}>
            {tab === 'signup' && (
              <>
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username *" required minLength={3} maxLength={24} />
                <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="Avatar URL (Optional)" type="url" />
              </>
            )}
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={tab === 'signup' ? 'Email Address *' : 'Email or Username *'} required />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (10+ chars) *" type="password" required minLength={10} />
            <button className="primary big" disabled={loading}>
              {loading ? 'Processing...' : tab === 'signup' ? 'Send OTP & Register →' : 'Sign In →'}
            </button>
          </form>
        </>
      ) : (
        <form className="form-stack" onSubmit={handleVerifyOtp}>
          <p className="otp-subtitle" style={{ fontSize: '0.9rem', color: '#99f6e4', textAlign: 'center' }}>Enter 6-digit verification code sent to <strong>{email}</strong></p>
          {devOtp && (
            <div className="dev-otp-banner" style={{ background: 'rgba(251,191,36,0.15)', color: '#fde047', border: '1px dashed rgba(251,191,36,0.4)', padding: '0.65rem 1rem', borderRadius: '10px', textAlign: 'center', fontSize: '0.95rem', margin: '0.8rem 0' }}>
              ⚡ <strong>Your Verification Code:</strong> <span style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.25rem', letterSpacing: '3px', color: '#ff5e62', marginLeft: '6px', fontWeight: 'bold' }}>{devOtp}</span>
            </div>
          )}
          <input
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            placeholder="Enter 6-Digit Code"
            maxLength={6}
            style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '4px', fontWeight: 'bold' }}
            required
            autoFocus
          />
          <button className="primary big" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify Code & Complete Registration →'}
          </button>
          <button type="button" className="secondary small" onClick={() => setOtpStep(false)}>← Back to Edit Form</button>
        </form>
      )}
    </div>
  );
}

function Shell({
  user,
  setUser,
  connectionStatus = 'connected',
  latency = 0,
  inGameActive = false,
  children
}: {
  user?: User;
  setUser: (user?: User) => void;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected';
  latency?: number;
  inGameActive?: boolean;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isGameRoute =
    location.pathname.startsWith('/room/') ||
    location.pathname.startsWith('/join/') ||
    ((location.pathname === '/ludo' || location.pathname === '/snakes-ladders') && inGameActive);

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <>
      {!isGameRoute && (
        <header key="global-arena-header">
          <div className="header-left">
            {location.pathname !== '/' && location.pathname !== '/uno' && (
              <div className="nav-history-buttons">
                <button
                  type="button"
                  className="nav-control-btn"
                  onClick={handleBack}
                  title="Go back to previous page"
                  aria-label="Go back"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  <span>Back</span>
                </button>
              </div>
            )}
            <Link to={location.pathname === '/uno' ? '/uno' : '/'} className="brand">
              {location.pathname === '/uno' ? (
                <><b>UNO</b> NIGHT</>
              ) : (
                <><b>GAMENIGHT</b> ARENA</>
              )}
            </Link>
          </div>
          <nav>
            <div className={`connection-status-pill status-${connectionStatus}`} title={`WebSocket Channel: ${connectionStatus} (Ping: ${latency}ms)`}>
              <span className="status-dot" />
              <span className="status-text">
                {connectionStatus === 'connected' ? (latency ? `${latency}ms` : 'Connected') : connectionStatus === 'connecting' ? 'Connecting…' : 'Disconnected'}
              </span>
            </div>
            <Link to="/" className={location.pathname === '/' ? 'nav-active' : ''}>🌐 Hub</Link>
            {location.pathname !== '/' && (
              <>
                <Link to="/uno" className={location.pathname === '/uno' ? 'nav-active' : ''}>🃏 UNO</Link>
                <Link to="/ludo" className={location.pathname === '/ludo' ? 'nav-active' : ''}>🎲 Ludo</Link>
                <Link to="/snakes-ladders" className={location.pathname === '/snakes-ladders' ? 'nav-active' : ''}>🐍 Snakes</Link>
              </>
            )}
            <Link to="/lobby" className={location.pathname === '/lobby' ? 'nav-active' : ''}>Lobby</Link>
            <Link to="/leaderboard" className={location.pathname === '/leaderboard' ? 'nav-active' : ''}>Leaders</Link>
            {user && !user.isGuest && <Link to="/history" className={location.pathname === '/history' ? 'nav-active' : ''}>History</Link>}
            {user ? (
              <div className="nav-user">
                <Link to="/profile" className={`profile-link ${location.pathname === '/profile' ? 'nav-active' : ''}`}>
                  <AvatarDisplay url={user.avatarUrl} preset={user.avatarPreset} username={user.username} size="small" />
                  <span>{user.username} {user.isGuest ? '(Guest)' : ''}</span>
                </Link>
                <button type="button" className="text-button" onClick={async () => { await api.logout(); setUser(undefined); navigate('/'); }}>Sign out</button>
              </div>
            ) : (
              <button type="button" className="secondary small" onClick={() => navigate('/profile')}>Profile / Guest</button>
            )}
          </nav>
        </header>
      )}
      <div className="shell-content-container" key="shell-content-container">
        {children}
      </div>
    </>
  );
}

export function InteractiveCardFan({ badgeText }: { badgeText?: string }) {
  const colors = ['red', 'yellow', 'green', 'blue'];
  const colorVar: Record<string, string> = { red: '#e5473c', yellow: '#f2b400', green: '#1f9e5a', blue: '#2b64c9' };
  const faces = ['4', '7', '2', '⊘', '↺', '+2', '9', '✦', '+4'];

  const [cards, setCards] = useState(() => [
    { id: '1', color: 'red', face: '4' },
    { id: '2', color: 'yellow', face: '7' },
    { id: '3', color: 'green', face: '2' },
    { id: '4', color: 'blue', face: '⊘' },
    { id: '5', color: 'red', face: '↺' },
    { id: '6', color: 'yellow', face: '+2' },
    { id: '7', color: 'green', face: '9' }
  ]);
  const [topDiscard, setTopDiscard] = useState<{ color: string; face: string } | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const spread = 44;

  const playCard = (card: { id: string; color: string; face: string }) => {
    if (playingId) return;
    setPlayingId(card.id);
    setTopDiscard({ color: card.color, face: card.face });

    setTimeout(() => {
      setCards((prev) => {
        const next = prev.filter((c) => c.id !== card.id);
        const newColor = colors[Math.floor(Math.random() * colors.length)];
        const newFace = faces[Math.floor(Math.random() * faces.length)];
        next.push({ id: String(Date.now()), color: newColor, face: newFace });
        return next;
      });
      setPlayingId(null);
    }, 450);
  };

  return (
    <div className="table">
      <div className="pile-zone draw">
        <span className="lbl">DRAW</span>
        <div className="pile-card draw-card stacked">
          <div className="wild-swatch"><span /><span /><span /><span /></div>
        </div>
      </div>

      <div className="fan">
        {cards.map((c, i) => {
          const count = cards.length;
          const angle = -spread / 2 + (spread / (count - 1 || 1)) * i;
          const isPlaying = playingId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              className={`card ${isPlaying ? 'playing' : ''}`}
              style={{
                '--card-color': colorVar[c.color],
                zIndex: i,
                transform: isPlaying ? 'translate(-80px, -120px) rotate(24deg) scale(0.7)' : `translateX(${angle * 1.9}px) rotate(${angle}deg)`
              } as React.CSSProperties}
              onClick={() => playCard(c)}
              aria-label={`Play ${c.color} ${c.face}`}
            >
              <span className="corner tl">{c.face}</span>
              <div className="oval" />
              <span className="face">{c.face}</span>
              <span className="corner br">{c.face}</span>
            </button>
          );
        })}
      </div>

      <div className="pile-zone discard">
        <span className="lbl">DISCARD</span>
        <div className="pile-card" id="discardCard">
          <div className="oval" />
          {topDiscard ? (
            <span style={{ position: 'relative', zIndex: 2, fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: '26px', color: colorVar[topDiscard.color], transform: 'rotate(-22deg)' }}>
              {topDiscard.face}
            </span>
          ) : (
            <div className="wild-swatch"><span /><span /><span /><span /></div>
          )}
        </div>
      </div>

      <div className="fan-label">
        ↳ tap card to play <span className="badge2">{badgeText || `${cards.length} in hand`}</span>
      </div>
    </div>
  );
}


function MainHubLanding({ user, setUser, ensureGuest, serverStats }: { user?: User; setUser: (user?: User) => void; ensureGuest: () => Promise<User>; serverStats?: ServerStats }) {
  const navigate = useNavigate();
  const [account, setAccount] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [rulebookModalOpen, setRulebookModalOpen] = useState(false);
  const [createGameType, setCreateGameType] = useState<'uno' | 'ludo' | 'snake'>('uno');
  const [roomCode, setRoomCode] = useState('');
  const [roomCodeMsg, setRoomCodeMsg] = useState('');

  // Real-time API data states
  const [lobbyRooms, setLobbyRooms] = useState<RoomMeta[]>([]);
  const [leaderboardPlayers, setLeaderboardPlayers] = useState<{ id: string; username: string; avatarUrl?: string; avatarPreset?: string; wins: number; losses: number; rating: number }[]>([]);
  const [ping, setPing] = useState<number>(28);

  useEffect(() => {
    const fetchData = async () => {
      const start = Date.now();
      try {
        const [lRes, lbRes] = await Promise.all([
          api.lobby().catch(() => ({ rooms: [] })),
          api.leaderboard('uno').catch(() => ({ players: [] }))
        ]);
        setLobbyRooms(lRes.rooms);
        setLeaderboardPlayers(lbRes.players);
        setPing(Date.now() - start);
      } catch {}
    };
    void fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickMatch = async () => {
    try {
      await ensureGuest();
      const publicRoom = lobbyRooms.find((r) => !r.isPrivate && r.players < r.maxPlayers);
      if (publicRoom) {
        navigate(`/room/${publicRoom.code}`);
      } else {
        const res = await api.createRoom({ gameType: 'uno', isPrivate: false, maxPlayers: 4, botCount: 0, rules: { stacking: true } });
        navigate(`/room/${res.room.code}`);
      }
    } catch (err: any) {
      setRoomCodeMsg(err?.message || 'Quick match error.');
    }
  };

  const handleDirectJoinCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (!code) return;
    if (code.length >= 4 && code.length <= 6) {
      setRoomCodeMsg(`Joining room #${code}…`);
      try {
        await ensureGuest();
        navigate(`/room/${code}`);
      } catch (err) {
        setRoomCodeMsg(err instanceof Error ? err.message : 'Room not found.');
      }
    } else {
      setRoomCodeMsg('Room code must be 4 to 6 characters.');
    }
  };

  return (
    <div className="landing-v2-container">
      <div className="colorstrip"></div>

      {/* GUEST ACCOUNT BANNER */}
      {user?.isGuest && (
        <div
          style={{
            background: 'rgba(15,23,42,0.85)',
            border: '1px solid rgba(251,191,36,0.35)',
            borderRadius: '12px',
            padding: '0.75rem 1.2rem',
            margin: '1rem 1.5rem 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.9rem',
            color: '#cbd5e1',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
          }}
        >
          <span>
            Playing as <strong>{user.username}</strong> (Guest Session).
          </span>
          <button
            type="button"
            onClick={() => setAccount(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#fbbf24',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Create a full account to save stats →
          </button>
        </div>
      )}

      {/* MAIN HERO HEADER */}
      <section className="hero" style={{ paddingBottom: '2rem' }}>
        <div>
          <div className="eyebrow">🎮 MULTI-GAME ONLINE ARENA</div>
          <h1>Welcome to <em>GameNight Arena</em>.</h1>
          <p className="lede">
            Select your game below to launch real-time multiplayer tables, play against live opponents, or challenge AI bots.
          </p>

          {/* 4 ARCHITECTURE ACTION BUTTONS */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', margin: '1.5rem 0 1rem 0' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleQuickMatch}
              style={{ padding: '0.75rem 1.2rem', borderRadius: '10px', fontSize: '0.92rem', fontWeight: 'bold' }}
            >
              ⚡ Quick Match
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setCreateGameType('uno'); setCreateModalOpen(true); }}
              style={{ padding: '0.75rem 1.2rem', borderRadius: '10px', fontSize: '0.92rem', fontWeight: 'bold', border: '1px solid #2dd4bf', color: '#2dd4bf' }}
            >
              ➕ Create Room
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setRulebookModalOpen(true)}
              style={{ padding: '0.75rem 1.2rem', borderRadius: '10px', fontSize: '0.92rem', fontWeight: 'bold' }}
            >
              📖 Rulebook / Rules
            </button>
          </div>

          {/* QUICK ROOM JOIN BAR */}
          <form onSubmit={handleDirectJoinCode} style={{ display: 'flex', gap: '0.6rem', marginTop: '1.5rem', maxWidth: '480px' }}>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="ENTER ROOM CODE (4 or 6 digits)"
              maxLength={6}
              style={{
                flex: 1,
                padding: '0.8rem 1rem',
                borderRadius: '12px',
                border: '2px solid rgba(45,212,191,0.3)',
                background: 'rgba(15,23,42,0.8)',
                color: '#fff',
                fontWeight: 'bold',
                letterSpacing: '2px',
                textAlign: 'center'
              }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.8rem 1.4rem' }}>
              Join Room →
            </button>
          </form>
          {roomCodeMsg && <p style={{ fontSize: '0.85rem', color: '#2dd4bf', marginTop: '0.4rem' }}>{roomCodeMsg}</p>}
        </div>

        {/* TOP STATUS CARD */}
        <div style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))', border: '1px solid rgba(45,212,191,0.25)', borderRadius: '1.2rem', padding: '1.5rem', boxShadow: '0 15px 40px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.8rem' }}>
            <span style={{ fontWeight: 'bold', color: '#2dd4bf' }}>⚡ SERVER NETWORK ONLINE</span>
            <span style={{ fontSize: '0.8rem', background: 'rgba(34,197,94,0.15)', color: '#4ade80', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>{ping} ms Latency</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', textAlign: 'center' }}>
            <div style={{ background: 'rgba(15,23,42,0.6)', padding: '0.8rem', borderRadius: '10px' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fde047' }}>{serverStats?.onlinePlayers ?? 1}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Active Players Online</div>
            </div>
            <div style={{ background: 'rgba(15,23,42,0.6)', padding: '0.8rem', borderRadius: '10px' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>{serverStats?.activeTables ?? lobbyRooms.length}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Active Tables</div>
            </div>
            <div style={{ background: 'rgba(15,23,42,0.6)', padding: '0.8rem', borderRadius: '10px' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8' }}>{leaderboardPlayers.length}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total Rated Players</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 BIG GAME SELECTION CARDS SECTION */}
      <section id="game-selector" style={{ padding: '2rem 0 3rem' }}>
        <div className="wrap">
          <div className="section-head" style={{ maxWidth: '800px', margin: '0 auto 2.5rem auto', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 style={{ fontSize: '2.4rem', textAlign: 'center', margin: '0 0 0.5rem', width: '100%' }}>Three Iconic Games. Endless Fun.</h2>
            <p style={{ color: '#94a3b8', maxWidth: '600px', margin: '0 auto', textAlign: 'center', width: '100%' }}>
              Click any game logo card below to launch its dedicated game hub, lobbies, and tables.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.5rem' }}>
            
            {/* GAME LOGO CARD 1: UNO NIGHT */}
            <div
              className="mode-card"
              onClick={() => navigate('/uno')}
              style={{
                cursor: 'pointer',
                background: 'linear-gradient(145deg, rgba(239,68,68,0.12), rgba(15,23,42,0.9))',
                border: '2px solid rgba(239,68,68,0.35)',
                borderRadius: '1.5rem',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 15px 35px rgba(239,68,68,0.15)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', background: 'rgba(239,68,68,0.15)', borderRadius: '50%', filter: 'blur(20px)', pointerEvents: 'none' }}></div>
              
              <div>
                {/* BIG LOGO ICON DISPLAY */}
                <div
                  style={{
                    width: '100%',
                    height: '140px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                    borderRadius: '1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem',
                    boxShadow: '0 12px 30px rgba(239,68,68,0.4)',
                    border: '2px solid #ffffff'
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3.2rem', fontWeight: 900, color: '#fff', textShadow: '0 4px 15px rgba(0,0,0,0.5)', fontFamily: 'Fredoka, sans-serif', letterSpacing: '2px' }}>
                      🃏 UNO
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fde047', letterSpacing: '4px', textTransform: 'uppercase' }}>
                      NIGHT ARCADE
                    </div>
                  </div>
                </div>

                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#fca5a5', background: 'rgba(239,68,68,0.2)', padding: '0.3rem 0.8rem', borderRadius: '6px', textTransform: 'uppercase' }}>
                  CARD GAME · 2-4 PLAYERS
                </span>

                <h3 style={{ fontSize: '1.7rem', margin: '0.8rem 0 0.4rem', color: '#ffffff' }}>UNO Night</h3>
                <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.5 }}>
                  The classic 108-card matching game! Action cards (Skip, Reverse, Draw Two, Wild +4), 7-0 & Jump-in rules, and real-time bot fill-ins.
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: '1rem 0' }}>
                  <span style={{ fontSize: '0.78rem', background: 'rgba(15,23,42,0.7)', color: '#94a3b8', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>⚡ Classic Table</span>
                  <span style={{ fontSize: '0.78rem', background: 'rgba(15,23,42,0.7)', color: '#94a3b8', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>🔥 Speed Round</span>
                  <span style={{ fontSize: '0.78rem', background: 'rgba(15,23,42,0.7)', color: '#94a3b8', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>🤖 Bot Challenge</span>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/uno')}
                style={{ width: '100%', marginTop: '1rem', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', borderColor: '#ef4444' }}
              >
                🃏 Play UNO Night →
              </button>
            </div>

            {/* GAME LOGO CARD 2: LUDO NIGHT */}
            <div
              className="mode-card"
              onClick={() => navigate('/ludo')}
              style={{
                cursor: 'pointer',
                background: 'linear-gradient(145deg, rgba(45,212,191,0.12), rgba(15,23,42,0.9))',
                border: '2px solid rgba(45,212,191,0.35)',
                borderRadius: '1.5rem',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 15px 35px rgba(45,212,191,0.15)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', background: 'rgba(45,212,191,0.15)', borderRadius: '50%', filter: 'blur(20px)', pointerEvents: 'none' }}></div>

              <div>
                {/* BIG LOGO ICON DISPLAY */}
                <div
                  style={{
                    width: '100%',
                    height: '140px',
                    background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                    borderRadius: '1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem',
                    boxShadow: '0 12px 30px rgba(45,212,191,0.4)',
                    border: '2px solid #ffffff'
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3.2rem', fontWeight: 900, color: '#fff', textShadow: '0 4px 15px rgba(0,0,0,0.5)', fontFamily: 'Fredoka, sans-serif', letterSpacing: '2px' }}>
                      🎲 LUDO
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#a5f3fc', letterSpacing: '4px', textTransform: 'uppercase' }}>
                      KINGDOM ARENA
                    </div>
                  </div>
                </div>

                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#99f6e4', background: 'rgba(45,212,191,0.2)', padding: '0.3rem 0.8rem', borderRadius: '6px', textTransform: 'uppercase' }}>
                  BOARD GAME · 2-4 PLAYERS
                </span>

                <h3 style={{ fontSize: '1.7rem', margin: '0.8rem 0 0.4rem', color: '#ffffff' }}>Ludo Night</h3>
                <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.5 }}>
                  Real-time 15x15 Ludo board! 3D rolling physics die, 4 color-coded pawn paths (🔴 🟩 🟡 🔵), safe star spots, and 4-digit room code invites.
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: '1rem 0' }}>
                  <span style={{ fontSize: '0.78rem', background: 'rgba(15,23,42,0.7)', color: '#94a3b8', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>🎲 4P Quick Match</span>
                  <span style={{ fontSize: '0.78rem', background: 'rgba(15,23,42,0.7)', color: '#94a3b8', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>🔑 Private Room</span>
                  <span style={{ fontSize: '0.78rem', background: 'rgba(15,23,42,0.7)', color: '#94a3b8', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>🤖 Play vs Bot</span>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/ludo')}
                style={{ width: '100%', marginTop: '1rem', background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', borderColor: '#2dd4bf' }}
              >
                🎲 Play Ludo Night →
              </button>
            </div>

            {/* GAME LOGO CARD 3: SNAKE CLASSIC */}
            <div
              className="mode-card"
              onClick={() => navigate('/snakes-ladders')}
              style={{
                cursor: 'pointer',
                background: 'linear-gradient(145deg, rgba(34,197,94,0.12), rgba(15,23,42,0.9))',
                border: '2px solid rgba(34,197,94,0.35)',
                borderRadius: '1.5rem',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 15px 35px rgba(34,197,94,0.15)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', background: 'rgba(34,197,94,0.15)', borderRadius: '50%', filter: 'blur(20px)', pointerEvents: 'none' }}></div>

              <div>
                {/* BIG LOGO ICON DISPLAY */}
                <div
                  style={{
                    width: '100%',
                    height: '140px',
                    background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                    borderRadius: '1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem',
                    boxShadow: '0 12px 30px rgba(34,197,94,0.4)',
                    border: '2px solid #ffffff'
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3.2rem', fontWeight: 900, color: '#fff', textShadow: '0 4px 15px rgba(0,0,0,0.5)', fontFamily: 'Fredoka, sans-serif', letterSpacing: '2px' }}>
                      🐍 SNAKE
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#86efac', letterSpacing: '4px', textTransform: 'uppercase' }}>
                      CLASSIC ARCADE
                    </div>
                  </div>
                </div>

                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#86efac', background: 'rgba(34,197,94,0.2)', padding: '0.3rem 0.8rem', borderRadius: '6px', textTransform: 'uppercase' }}>
                  ARCADE ARENA · SINGLE / ENDLESS
                </span>

                <h3 style={{ fontSize: '1.7rem', margin: '0.8rem 0 0.4rem', color: '#ffffff' }}>Snake Classic</h3>
                <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.5 }}>
                  Single player classic & speed rush modes! Custom 15x15 to 25x25 grid sizes, boundary wall toggles, red & golden apples, and high-score leaderboards.
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: '1rem 0' }}>
                  <span style={{ fontSize: '0.78rem', background: 'rgba(15,23,42,0.7)', color: '#94a3b8', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>🐍 Single Player</span>
                  <span style={{ fontSize: '0.78rem', background: 'rgba(15,23,42,0.7)', color: '#94a3b8', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>⚡ Speed Rush</span>
                  <span style={{ fontSize: '0.78rem', background: 'rgba(15,23,42,0.7)', color: '#94a3b8', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>🏆 High Scores</span>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/snakes-ladders')}
                style={{ width: '100%', marginTop: '1rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderColor: '#22c55e' }}
              >
                🐍 Play Snake Classic →
              </button>
            </div>
          </div>
        </div>
      </section>

        <FeedbackSection user={user} gameTitle="GameNight Arena" accentColor="#2dd4bf" defaultRolePlaceholder="Arena Player" />

      {/* FOOTER CTA BANNER */}
      <footer className="footer-cta" style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)', borderRadius: '1.5rem', margin: '2rem 1.5rem 3rem', padding: '2.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', color: '#ffffff', margin: 0 }}>Your seat's open. Pick a game and find out.</h2>
          <p style={{ color: '#e0f2fe', margin: '0.4rem 0 0', fontSize: '0.95rem' }}>No download required. Play free instant games in your browser.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/uno')} style={{ background: '#ffffff', color: '#0f172a', fontWeight: 'bold' }}>🃏 UNO</button>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/ludo')} style={{ background: '#ffffff', color: '#0f172a', fontWeight: 'bold' }}>🎲 Ludo</button>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/snakes-ladders')} style={{ background: '#ffffff', color: '#0f172a', fontWeight: 'bold' }}>🐍 Snake</button>
        </div>
      </footer>

      {createModalOpen && (
        <CreateRoomModal
          initialGameType={createGameType}
          onClose={() => setCreateModalOpen(false)}
          onRoomCreated={(room) => {
            setCreateModalOpen(false);
            navigate(`/room/${room.code}`);
          }}
        />
      )}

      {rulebookModalOpen && (
        <RulebookModal
          initialTab={createGameType}
          onClose={() => setRulebookModalOpen(false)}
        />
      )}

      {account && (
        <Modal title="Account Options" onClose={() => setAccount(false)}>
          <AuthPanel onDone={(u) => { setUser(u); setAccount(false); }} />
        </Modal>
      )}
    </div>
  );
}

function Home({ user, setUser, ensureGuest, serverStats }: { user?: User; setUser: (user?: User) => void; ensureGuest: () => Promise<User>; serverStats?: ServerStats }) {
  const navigate = useNavigate();
  const [account, setAccount] = useState(false);
  const [how, setHow] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [roomCodeMsg, setRoomCodeMsg] = useState('');
  const [error, setError] = useState('');
  const [inspectUser, setInspectUser] = useState<string | null>(null);

  // Real-time API data states
  const [lobbyRooms, setLobbyRooms] = useState<RoomMeta[]>([]);
  const [leaderboardPlayers, setLeaderboardPlayers] = useState<{ id: string; username: string; avatarUrl?: string; avatarPreset?: string; wins: number; losses: number; rating: number }[]>([]);
  const [ping, setPing] = useState<number>(35);

  const fetchRealTimeData = async () => {
    const startTime = Date.now();
    try {
      const [lobbyRes, lbRes] = await Promise.all([
        api.lobby().catch(() => ({ rooms: [] })),
        api.leaderboard('uno').catch(() => ({ players: [] }))
      ]);
      setLobbyRooms(lobbyRes.rooms);
      setLeaderboardPlayers(lbRes.players);
      setPing(Date.now() - startTime);
    } catch { }
  };

  useEffect(() => {
    void fetchRealTimeData();
    const timer = setInterval(fetchRealTimeData, 5000);
    return () => clearInterval(timer);
  }, []);

  const goToLobby = async () => {
    try {
      await ensureGuest();
      navigate('/lobby');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not start session.');
    }
  };

  const createModeRoom = async (mode: 'classic' | 'speed' | 'team' | 'bots') => {
    try {
      await ensureGuest();
      let options: unknown = {};
      if (mode === 'classic') {
        options = { isPrivate: false, maxPlayers: 4, botCount: 0, targetScore: 500, maxRounds: 5, rules: {} };
      } else if (mode === 'speed') {
        options = { isPrivate: false, maxPlayers: 4, botCount: 0, targetScore: 250, maxRounds: 3, rules: { stacking: true } };
      } else if (mode === 'team') {
        options = { isPrivate: false, maxPlayers: 4, botCount: 0, targetScore: 500, maxRounds: 5, rules: { stacking: true, sevenZero: true, jumpIn: true } };
      } else if (mode === 'bots') {
        options = { isPrivate: true, maxPlayers: 4, botCount: 3, targetScore: 500, maxRounds: 5, rules: {} };
      }
      const { room } = await api.createRoom(options);
      navigate(`/room/${room.code}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create room.');
    }
  };

  const handleJoinRoom = async () => {
    const code = roomCode.trim().toUpperCase();
    if (code.length !== 6) return;
    setRoomCodeMsg(`Checking room #${code}...`);
    try {
      await ensureGuest();
      navigate(`/room/${code}`);
    } catch (err) {
      setRoomCodeMsg(err instanceof Error ? err.message : 'Room not found. Check code.');
    }
  };

  const totalPlayersOnline = serverStats?.onlinePlayers ?? Math.max(1, lobbyRooms.reduce((acc, r) => acc + r.players, 0));

  return (
    <div className="landing-v2-container">
      <div className="colorstrip"></div>

      <section className="hero">
        <div>
          <div className="eyebrow">⚡ REAL-TIME MULTIPLAYER CARD GAME</div>
          <h1>Play UNO <em>online</em> with anyone.</h1>
          <p className="lede">Join instant rooms, play against smart bots, track your rank, or host private tables with stacking, 7-0, and jump-in rules.</p>

          <div className="cta-row">
            <button type="button" className="btn btn-primary" onClick={goToLobby}>
              ⚡ Play now ({lobbyRooms.length} Public Tables)
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => createModeRoom('classic')}>
              Create private room
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => createModeRoom('bots')}>
              🤖 Play vs Bot
            </button>
          </div>

          <div className="cta-row tertiary-row">
            <button type="button" className="btn btn-ghost" onClick={() => setHow(true)}>
              📖 How to play
            </button>
          </div>

          <div className="room-code-row">
            <input
              type="text"
              className="room-code-input mono"
              value={roomCode}
              onChange={(e) => {
                setRoomCode(e.target.value.toUpperCase());
                setRoomCodeMsg('');
              }}
              placeholder="ROOM CODE"
              maxLength={6}
              autoComplete="off"
              aria-label="Room code"
            />
            <button
              type="button"
              className="btn btn-secondary"
              disabled={roomCode.length !== 6}
              onClick={handleJoinRoom}
            >
              Join room
            </button>
          </div>
          {roomCodeMsg && <p className="room-code-msg mono pending">{roomCodeMsg}</p>}
          {error && <p className="error margin-top-sm">{error}</p>}
        </div>

        <div>
          <InteractiveCardFan />
        </div>
      </section>

      {/* MODES SECTION */}
      <section id="modes">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow2"><span className="dot"></span> CHOOSE YOUR TABLE</div>
            <h2>Four ways to play, one deck of cards.</h2>
            <p>Same rules, different pace. Pick the table that matches how much chaos you're in the mood for.</p>
          </div>
          <div className="modes-grid">
            <div className="mode-card" style={{ '--mode-color': 'var(--green)' } as React.CSSProperties} onClick={() => createModeRoom('classic')}>
              <span className="tag">01 · CLASSIC</span>
              <h3>Classic Table</h3>
              <p>The original 108-card deck. First to 500 points wins — take your time, count your points, savor the callouts.</p>
              <span className="go">Play Classic <span className="arrow">→</span></span>
            </div>

            <div className="mode-card" style={{ '--mode-color': 'var(--yellow)' } as React.CSSProperties} onClick={() => createModeRoom('speed')}>
              <span className="tag">02 · SPEED ROUND</span>
              <h3>Speed Round</h3>
              <p>Seven-card hands, fast target score. Stacking enabled for rapid penalty turns.</p>
              <span className="go">Play Speed <span className="arrow">→</span></span>
            </div>

            <div className="mode-card" style={{ '--mode-color': 'var(--blue)' } as React.CSSProperties} onClick={() => createModeRoom('team')}>
              <span className="tag">03 · HOUSE RULES</span>
              <h3>House Rules (7-0 & Jump-In)</h3>
              <p>Stack +2/+4, swap hands on 7, rotate on 0, and jump in out-of-turn with matching cards.</p>
              <span className="go">Play House Rules <span className="arrow">→</span></span>
            </div>

            <div className="mode-card" style={{ '--mode-color': 'var(--red)' } as React.CSSProperties} onClick={() => createModeRoom('bots')}>
              <span className="tag">04 · VS BOTS</span>
              <h3>Bot Challenge</h3>
              <p>Instant 4-player table filled with 3 AI bots. Test your skills anytime, anywhere.</p>
              <span className="go">Play vs Bot <span className="arrow">→</span></span>
            </div>

            <div className="mode-card" style={{ '--mode-color': '#0d9488' } as React.CSSProperties} onClick={() => navigate('/ludo')}>
              <span className="tag">05 · LUDO ARENA</span>
              <h3>🎲 Ludo Night</h3>
              <p>4-color board, token capture, safe stars, and home path. Play against AI bots or friends in real-time!</p>
              <span className="go">Play Ludo <span className="arrow">→</span></span>
            </div>

            <div className="mode-card" style={{ '--mode-color': '#8b5cf6' } as React.CSSProperties} onClick={() => navigate('/snakes-ladders')}>
              <span className="tag">06 · SNAKES & LADDERS</span>
              <h3>🐍 Snakes & Ladders</h3>
              <p>100-tile serpentine board with dynamic snakes & ladders. First to tile 100 takes the win!</p>
              <span className="go">Play Snakes & Ladders <span className="arrow">→</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW TO PLAY SECTION */}
      <section className="how" id="how">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow2"><span className="dot" style={{ background: 'var(--blue)', boxShadow: '0 0 0 3px rgba(43,100,201,0.25)' }}></span> THE RULES, FAST</div>
            <h2>Four steps. Then it's chaos.</h2>
            <p>Already know UNO? Skip ahead. New to the table? This is the whole game.</p>
          </div>
          <div className="steps">
            <div className="step" style={{ '--step-color': 'var(--red)' } as React.CSSProperties}>
              <div className="n">01</div>
              <h3>Draw your hand</h3>
              <p>Seven cards each, dealt face-down. One card flips to start the discard pile.</p>
            </div>

            <div className="step" style={{ '--step-color': 'var(--yellow)' } as React.CSSProperties}>
              <div className="n">02</div>
              <h3>Match the table</h3>
              <p>Play a card that shares the color or the number showing on top. Can't match? Draw one.</p>
            </div>

            <div className="step" style={{ '--step-color': 'var(--green)' } as React.CSSProperties}>
              <div className="n">03</div>
              <h3>Stack the specials</h3>
              <p>Skips, Reverses, Draw Twos, and Wilds turn the table on its head. Use them well.</p>
            </div>

            <div className="step" style={{ '--step-color': 'var(--blue)' } as React.CSSProperties}>
              <div className="n">04</div>
              <h3>Call it</h3>
              <p>Say "UNO" before you play your second-to-last card, or draw two as a penalty.</p>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE ROOM & LEADERBOARD STATS (REAL TIME API DATA!) */}
      <section id="room">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow2"><span className="dot" style={{ background: 'var(--red)', boxShadow: '0 0 0 3px rgba(229,71,60,0.25)' }}></span> THE ROOM RIGHT NOW (LIVE DATA)</div>
            <h2>A live table, day or night.</h2>
            <p>Real seats, filling up in real time. Climb the board and your name shows up here too.</p>
          </div>
          <div className="room-grid">
            <div className="quickstats">
              <div className="qstat">
                <div className="big" style={{ color: 'var(--red)' }}>{serverStats?.activeTables ?? lobbyRooms.length}</div>
                <div className="lbl2">active tables</div>
              </div>
              <div className="qstat">
                <div className="big" style={{ color: 'var(--yellow)' }}>{serverStats?.onlinePlayers ?? totalPlayersOnline}</div>
                <div className="lbl2">active players online</div>
              </div>
              <div className="qstat">
                <div className="big" style={{ color: 'var(--green)' }}>{leaderboardPlayers.length}</div>
                <div className="lbl2">ranked accounts active</div>
              </div>
              <div className="qstat">
                <div className="big" style={{ color: 'var(--blue)' }}>{ping}ms</div>
                <div className="lbl2">server latency (Live WSS)</div>
              </div>
            </div>

            <div className="leaderboard">
              <div className="lb-head"><span>#</span><span>Player</span><span>Points</span><span>Record</span></div>
              {leaderboardPlayers.length ? (
                leaderboardPlayers.slice(0, 5).map((player, idx) => (
                  <div
                    key={player.id}
                    className="lb-row clickable-row"
                    onClick={() => setInspectUser(player.username)}
                    title={`Click to view ${player.username}'s profile`}
                  >
                    <span className={`rank r${idx + 1}`}>#{idx + 1}</span>
                    <span className="lb-name">{player.username}</span>
                    <span className="lb-points">{player.rating} pts</span>
                    <span className="lb-streak">▲ {player.wins}W / {player.losses}L</span>
                  </div>
                ))
              ) : (
                <div className="lb-row">
                  <span className="rank r1">#1</span>
                  <span className="lb-name">{user?.username ?? 'LuckyAce'}</span>
                  <span className="lb-points">1,000 pts</span>
                  <span className="lb-streak">▲ 0 wins</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <FeedbackSection user={user} gameTitle="UNO Night" accentColor="#ef4444" defaultRolePlaceholder="UNO Regular" />

      {/* CTA BAND */}
      <section>
        <div className="wrap">
          <div className="ctaband">
            <div>
              <h2>Your seat's open. Draw seven and find out.</h2>
              <p>No account needed to try a hand — sign in later to save your stats and climb the leaderboard.</p>
            </div>
            <button type="button" className="btn btn-primary" onClick={goToLobby}>
              Deal me in →
            </button>
          </div>
        </div>
      </section>

      {how && (
        <Modal title="How to play UNO" onClose={() => setHow(false)}>
          <ol>
            <li>Match the top card by color, number, or symbol.</li>
            <li>Use Skip, Reverse, and Draw cards to disrupt opponents.</li>
            <li>Play Wild cards to change the active color anytime.</li>
            <li>Press <b>UNO!</b> when you have one card left.</li>
          </ol>
        </Modal>
      )}

      {account && (
        <Modal title="Sign In or Register Account" onClose={() => setAccount(false)}>
          <AuthPanel onDone={(u) => { setUser(u); setAccount(false); }} />
        </Modal>
      )}

      {inspectUser && (
        <PublicProfileModal username={inspectUser} onClose={() => setInspectUser(null)} />
      )}
    </div>
  );
}

function Lobby({ ensureGuest, serverStats }: { ensureGuest: () => Promise<User>; serverStats?: ServerStats }) {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomMeta[]>([]);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.lobby()
      .then((value) => setRooms(value.rooms))
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const quick = async () => {
    try {
      await ensureGuest();
      const { room } = await api.createRoom({
        isPrivate: false,
        maxPlayers: 4,
        botCount: 0,
        targetScore: 500,
        maxRounds: 5,
        rules: {}
      });
      navigate(`/room/${room.code}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create room.');
    }
  };

  return (
    <main className="page lobby-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">LIVE TABLES</p>
          <h1>Public Lobby</h1>
        </div>
        <div className="hero-actions">
          <button type="button" className="secondary icon-btn-refresh" onClick={load} title="Refresh tables">
            🔄 Refresh
          </button>
          <button type="button" className="secondary" onClick={() => setCreateOpen(true)}>
            ⚙️ Custom Room
          </button>
          <button type="button" className="primary" onClick={quick}>
            ⚡ Quick Play (4 Players)
          </button>
        </div>
      </div>

      {error && <p className="error panel">{error}</p>}

      <div className="lobby-summary-bar panel">
        <div className="summary-stat">
          <span>Active Tables</span>
          <b>{serverStats?.activeTables ?? rooms.length}</b>
        </div>
        <div className="summary-stat">
          <span>Total Players Online</span>
          <b>{serverStats?.onlinePlayers ?? Math.max(1, rooms.reduce((acc, r) => acc + r.players, 0))}</b>
        </div>
        <div className="summary-stat">
          <span>Match Rules</span>
          <b>Classic & House Rules</b>
        </div>
      </div>

      <div className="room-grid">
        {loading && !rooms.length ? (
          <div className="panel empty-loading">
            <span className="spinner-emoji">🃏</span>
            <p>Scanning active tables...</p>
          </div>
        ) : rooms.length ? (
          rooms.map((room) => (
            <article className="panel room-card-v2" key={room.code}>
              <div className="room-card-header">
                <div className="host-info">
                  <span className="table-host-avatar">🎮</span>
                  <div>
                    <strong className="host-name">{room.host ?? 'Open Table'}</strong>
                    <small className="room-code-badge">ROOM #{room.code}</small>
                  </div>
                </div>
                <span className={`seat-capacity-pill ${room.players >= room.maxPlayers ? 'full' : ''}`}>
                  {room.players}/{room.maxPlayers} Seats
                </span>
              </div>

              <div className="room-card-body">
                <div className="rule-badges">
                  {room.bots > 0 && <span className="rule-tag tag-bot">🤖 {room.bots} Bot{room.bots > 1 ? 's' : ''}</span>}
                  {room.rules.stacking && <span className="rule-tag tag-stack">⚡ Stacking</span>}
                  {room.rules.sevenZero && <span className="rule-tag tag-seven">🔄 7-0 Rules</span>}
                  {room.rules.jumpIn && <span className="rule-tag tag-jump">🔀 Jump-In</span>}
                  {!room.rules.stacking && !room.rules.sevenZero && !room.rules.jumpIn && (
                    <span className="rule-tag tag-classic">🎲 Classic Rules</span>
                  )}
                </div>
              </div>

              <div className="room-card-footer">
                <button
                  type="button"
                  className="primary width-full"
                  disabled={room.players >= room.maxPlayers}
                  onClick={() => navigate(`/room/${room.code}`)}
                >
                  {room.players >= room.maxPlayers ? 'Table Full' : `Join Room ${room.code} →`}
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="panel empty-room-state">
            <div className="empty-graphic">🃏</div>
            <h2>No Public Rooms Right Now</h2>
            <p>Create a new public table or start a custom game with friends and AI bots!</p>
            <div className="empty-actions">
              <button type="button" className="primary" onClick={quick}>
                Create Public Room
              </button>
              <button type="button" className="secondary" onClick={() => setCreateOpen(true)}>
                Custom Room Setup
              </button>
            </div>
          </div>
        )}
      </div>

      {createOpen && (
        <CreateRoom
          onClose={() => setCreateOpen(false)}
          onCreate={async (options) => {
            try {
              await ensureGuest();
              const { room } = await api.createRoom(options);
              navigate(`/room/${room.code}`);
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : 'Could not create room.');
            }
          }}
        />
      )}
    </main>
  );
}

function CreateRoom({ onClose, onCreate }: { onClose: () => void; onCreate: (options: unknown) => void }) {
  const [gameType, setGameType] = useState<'uno' | 'ludo' | 'snake'>('uno');
  const [isPrivate, setPrivate] = useState(true);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [botCount, setBotCount] = useState(0);
  const [stacking, setStacking] = useState(false);
  const [sevenZero, setSevenZero] = useState(false);
  const [jumpIn, setJumpIn] = useState(false);

  const handleGameSelect = (g: 'uno' | 'ludo' | 'snake') => {
    setGameType(g);
    if (g === 'ludo') {
      if (maxPlayers > 4) setMaxPlayers(4);
      if (botCount > 3) setBotCount(3);
    } else if (g === 'snake') {
      if (maxPlayers > 2) setMaxPlayers(2);
      setBotCount(0);
    }
  };

  const capacityOptions = gameType === 'ludo' ? [2, 3, 4] : gameType === 'snake' ? [1, 2] : [2, 3, 4, 5, 6, 8, 10];

  return (
    <Modal title="⚙️ Custom Room Setup" onClose={onClose}>
      <form
        className="form-stack custom-room-form"
        onSubmit={(event) => {
          event.preventDefault();
          onCreate({
            gameType,
            isPrivate,
            maxPlayers,
            botCount,
            targetScore: 500,
            maxRounds: 5,
            rules: { stacking, sevenZero, jumpIn }
          });
        }}
      >
        {/* GAME ENGINE SELECTOR CHIPS */}
        <div className="field-group">
          <label className="field-label">SELECT GAME ENGINE</label>
          <div className="number-selector-row">
            <button
              type="button"
              className={`select-chip ${gameType === 'uno' ? 'active' : ''}`}
              onClick={() => handleGameSelect('uno')}
            >
              🃏 UNO NIGHT
            </button>
            <button
              type="button"
              className={`select-chip ${gameType === 'ludo' ? 'active' : ''}`}
              onClick={() => handleGameSelect('ludo')}
            >
              🎲 LUDO KINGDOM
            </button>
            <button
              type="button"
              className={`select-chip ${gameType === 'snake' ? 'active' : ''}`}
              onClick={() => handleGameSelect('snake')}
            >
              🐍 SNAKE CLASSIC
            </button>
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">Table Capacity (Seats)</label>
          <div className="number-selector-row">
            {capacityOptions.map((num) => (
              <button
                type="button"
                key={num}
                className={`select-chip ${maxPlayers === num ? 'active' : ''}`}
                onClick={() => {
                  setMaxPlayers(num);
                  setBotCount(Math.min(botCount, num - 1));
                }}
              >
                {num} Seats
              </button>
            ))}
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">AI Bots Fill ({botCount} bots)</label>
          <div className="number-selector-row">
            {Array.from({ length: maxPlayers }, (_, i) => i).map((num) => (
              <button
                type="button"
                key={num}
                className={`select-chip ${botCount === num ? 'active' : ''}`}
                onClick={() => setBotCount(num)}
              >
                {num === 0 ? 'No Bots' : `🤖 ${num}`}
              </button>
            ))}
          </div>
        </div>

        <hr className="divider-hr" />

        <div className="toggle-group-stack">
          <label className="toggle-row">
            <input type="checkbox" checked={isPrivate} onChange={(e) => setPrivate(e.target.checked)} />
            <div>
              <b>🔒 Private Invite-Only Room</b>
              <small>Room will not appear on public lobby list. Join via room code link.</small>
            </div>
          </label>

          {gameType === 'uno' && (
            <>
              <label className="toggle-row">
                <input type="checkbox" checked={stacking} onChange={(e) => setStacking(e.target.checked)} />
                <div>
                  <b>⚡ Penalty Stacking</b>
                  <small>Chain +2 on +2, and Wild +4 on Wild +4 to pass draw penalty to next player.</small>
                </div>
              </label>

              <label className="toggle-row">
                <input type="checkbox" checked={sevenZero} onChange={(e) => setSevenZero(e.target.checked)} />
                <div>
                  <b>🔄 7-0 Hand Swap</b>
                  <small>Playing a 7 swaps hand with selected opponent. Playing a 0 rotates all hands in play direction.</small>
                </div>
              </label>

              <label className="toggle-row">
                <input type="checkbox" checked={jumpIn} onChange={(e) => setJumpIn(e.target.checked)} />
                <div>
                  <b>🔀 Jump-In Rule</b>
                  <small>Play out of turn if you hold an exact matching card (same color and value).</small>
                </div>
              </label>
            </>
          )}

          {gameType === 'ludo' && (
            <div style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', padding: '0.85rem', borderRadius: '10px' }}>
              <b style={{ color: '#60a5fa', display: 'block', marginBottom: '0.3rem' }}>🎲 Ludo Kingdom Rules Enabled:</b>
              <small style={{ color: '#cbd5e1', lineHeight: '1.4', display: 'block' }}>
                • 4 Player Colors (🔴 Red, 🟩 Green, 🟡 Yellow, 🔵 Blue)
                <br />
                • 52-Tile Circular Track with Safe Star Spots & Home Triangle
                <br />
                • Interactive 3D Rolling Dice & Extra Turn on 6 / Capture
              </small>
            </div>
          )}

          {gameType === 'snake' && (
            <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', padding: '0.85rem', borderRadius: '10px' }}>
              <b style={{ color: '#4ade80', display: 'block', marginBottom: '0.3rem' }}>🐍 Snake Classic Settings:</b>
              <small style={{ color: '#cbd5e1', lineHeight: '1.4', display: 'block' }}>
                • 20x20 Grid Arena with Special Apples (+50pts / +150pts)
                <br />
                • Real-time arcade score tracker & leaderboard ratings
              </small>
            </div>
          )}
        </div>

        <button type="submit" className="primary big width-full margin-top">
          Create {gameType.toUpperCase()} Room ({maxPlayers} Players, {isPrivate ? 'Private' : 'Public'})
        </button>
      </form>
    </Modal>
  );
}

function Leaderboard({ onInspectPlayer }: { onInspectPlayer?: (username: string) => void }) {
  const [selectedGame, setSelectedGame] = useState<'uno' | 'ludo' | 'snake'>('uno');
  const [players, setPlayers] = useState<{ id: string; username: string; avatarUrl?: string; avatarPreset?: string; wins: number; losses: number; rating: number }[]>([]);

  useEffect(() => {
    api.leaderboard(selectedGame).then((data) => setPlayers(data.players)).catch(() => undefined);
  }, [selectedGame]);

  return (
    <main className="page">
      <div className="page-heading" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1>Real-Time Leaderboard</h1>
          <p style={{ color: '#94a3b8', margin: '0.4rem 0 0 0', fontSize: '0.92rem' }}>
            Live ranked standings across UNO Night, Ludo Kingdom, and Snake Classic.
          </p>
        </div>

        {/* GAME SELECTION TABS */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${selectedGame === 'uno' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedGame('uno')}
            style={{ padding: '0.65rem 1.3rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}
          >
            🃏 UNO NIGHT
          </button>
          <button
            type="button"
            className={`btn ${selectedGame === 'ludo' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedGame('ludo')}
            style={{ padding: '0.65rem 1.3rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}
          >
            🎲 LUDO NIGHT
          </button>
          <button
            type="button"
            className={`btn ${selectedGame === 'snake' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedGame('snake')}
            style={{ padding: '0.65rem 1.3rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}
          >
            🐍 SNAKE CLASSIC
          </button>
        </div>
      </div>

      <div className="panel leaderboard">
        {players.length ? (
          players.map((player, index) => {
            const rankBadge = index === 0 ? '🥇 #1' : index === 1 ? '🥈 #2' : index === 2 ? '🥉 #3' : `#${index + 1}`;
            const rankClass = index === 0 ? 'rank-gold' : index === 1 ? 'rank-silver' : index === 2 ? 'rank-bronze' : '';
            return (
              <div key={player.id} className={`clickable-row ${rankClass}`} onClick={() => onInspectPlayer?.(player.username)}>
                <strong className="rank-tag">{rankBadge}</strong>
                <div className="user-cell">
                  <AvatarDisplay url={player.avatarUrl} preset={player.avatarPreset} username={player.username} size="small" />
                  <span>{player.username}</span>
                </div>
                <small>{player.wins}W · {player.losses}L</small>
                <b>{player.rating} pts</b>
              </div>
            );
          })
        ) : (
          <div className="empty">No ranked matches yet. Be the first registered player!</div>
        )}
      </div>
    </main>
  );
}

function History({ user }: { user?: User }) {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    api.history().then((data) => setMatches(data.matches)).catch((error: Error) => setMessage(error.message));
  }, []);

  return (
    <main className="page">
      <div className="page-heading">
        <div><p className="eyebrow">YOUR ACCOUNT</p><h1>Match history</h1></div>
      </div>
      <div className="history-list">
        {message && <p className="error panel">{message}</p>}
        {matches.length ? (
          matches.map((match) => {
            const isWinner = match.winnerId === user?.id;
            const winnerName = match.players.find((p) => p.id === match.winnerId)?.username ?? 'Unknown';
            const expanded = expandedId === match.id;
            return (
              <article key={match.id} className={`panel match-card ${isWinner ? 'match-win' : ''}`}>
                <div className="match-card-header" onClick={() => setExpandedId(expanded ? null : match.id)}>
                  <div>
                    <span className={`badge ${isWinner ? 'badge-win' : 'badge-loss'}`}>{isWinner ? 'VICTORY' : 'DEFEAT'}</span>
                    <strong>Room {match.roomCode}</strong>
                    <small>{new Date(match.completedAt).toLocaleDateString()} {new Date(match.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                  </div>
                  <div className="match-meta">
                    <span>Winner: <b>{winnerName}</b></span>
                    <button type="button" className="secondary small">{expanded ? 'Collapse ▲' : 'Details ▼'}</button>
                  </div>
                </div>
                {expanded && (
                  <div className="match-card-body">
                    <h4>Player Scores</h4>
                    <div className="match-players-grid">
                      {match.players.map((p) => (
                        <div key={p.id} className={`match-player-item ${p.id === match.winnerId ? 'winner' : ''}`}>
                          <span>{p.username} {p.id === user?.id ? '(You)' : ''}</span>
                          <b>{p.score} pts</b>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })
        ) : (
          !message && <div className="panel empty">Your completed matches will appear here.</div>
        )}
      </div>
    </main>
  );
}

function PublicProfileModal({ username, onClose, onAddFriend }: { username: string; onClose: () => void; onAddFriend?: (username: string) => void }) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    api.getPublicProfile(username)
      .then((res) => setProfile(res.profile))
      .catch((err: Error) => setError(err.message));
  }, [username]);

  return (
    <Modal title={`Player Profile: ${username}`} onClose={onClose}>
      {error && <p className="error">{error}</p>}
      {profile ? (
        <div className="profile-public-view">
          <div className="profile-hero">
            <AvatarDisplay url={profile.avatarUrl} preset={profile.avatarPreset} username={profile.username} size="large" />
            <div>
              <h2>
                {profile.username}
                {profile.country && COUNTRIES[profile.country] && (
                  <span className="flag-badge" title={COUNTRIES[profile.country].name}>
                    {COUNTRIES[profile.country].flag}
                  </span>
                )}
              </h2>
              {profile.bio && <p className="bio-text">"{profile.bio}"</p>}
              {onAddFriend && (
                <button
                  className="secondary small margin-top"
                  disabled={added}
                  onClick={async () => {
                    try {
                      await onAddFriend(profile.username);
                      setAdded(true);
                    } catch { }
                  }}
                >
                  {added ? '✓ Friend Requested' : '+ Add Friend'}
                </button>
              )}
            </div>
          </div>

          <h3>Player Statistics</h3>
          <div className="stats-grid">
            <div className="stat-card"><small>Games</small><b>{profile.stats.gamesPlayed}</b></div>
            <div className="stat-card"><small>Wins</small><b>{profile.stats.wins}</b></div>
            <div className="stat-card"><small>Losses</small><b>{profile.stats.losses}</b></div>
            <div className="stat-card"><small>Win Rate</small><b>{profile.stats.winRate}%</b></div>
            <div className="stat-card"><small>Current Streak</small><b>{profile.stats.currentStreak}</b></div>
            <div className="stat-card"><small>Best Streak</small><b>{profile.stats.longestStreak}</b></div>
            <div className="stat-card"><small>UNO Calls</small><b>{profile.stats.unoCalls}</b></div>
            <div className="stat-card"><small>Caught</small><b>{profile.stats.caughtWithoutUno}</b></div>
          </div>

          <h3>Badges Unlocked ({profile.achievements.length})</h3>
          <div className="badges-shelf">
            {ALL_ACHIEVEMENTS.map((badge) => {
              const unlocked = profile.achievements.includes(badge.title);
              return (
                <div key={badge.title} className={`badge-item ${unlocked ? 'unlocked' : 'locked'}`}>
                  <span className="badge-emoji">{badge.emoji}</span>
                  <div>
                    <b>{badge.title}</b>
                    <small>{badge.description}</small>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        !error && <p className="loading">Loading profile...</p>
      )}
    </Modal>
  );
}

function ProfileView({ user, setUser, ensureGuest }: { user?: User; setUser: (user?: User) => void; ensureGuest: () => Promise<User> }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editModal, setEditModal] = useState(false);
  const [avatarModal, setAvatarModal] = useState(false);
  const [convertModal, setConvertModal] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  const [friendError, setFriendError] = useState('');
  const [inspectUser, setInspectUser] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const p = await api.getProfile();
      setProfile(p.profile);
      if (user && !user.isGuest) {
        const f = await api.friends();
        setFriendsList(f.friends);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load profile.');
    }
  };

  useEffect(() => {
    void loadData();
  }, [user?.id, user?.isGuest]);

  const handleAddFriend = async (event?: FormEvent) => {
    event?.preventDefault();
    setFriendError('');
    if (!friendUsername.trim()) return;
    try {
      await api.addFriend(friendUsername.trim());
      setFriendUsername('');
      const f = await api.friends();
      setFriendsList(f.friends);
      setSuccess('Friend added successfully!');
    } catch (err) {
      setFriendError(err instanceof Error ? err.message : 'Failed to add friend.');
    }
  };

  const handleRemoveFriend = async (name: string) => {
    try {
      await api.removeFriend(name);
      const f = await api.friends();
      setFriendsList(f.friends);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove friend.');
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setError(''); setSuccess('');
    try {
      const res = await api.uploadAvatar(file);
      setUser(res.user);
      await loadData();
      setAvatarModal(false);
      setSuccess('Avatar uploaded successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    }
  };

  const handleAvatarPreset = async (presetKey: string) => {
    setError(''); setSuccess('');
    try {
      const res = await api.updateProfile({ username: profile?.username || user?.username, avatarPreset: presetKey, avatarUrl: '' });
      setUser(res.user);
      setProfile(res.profile);
      setAvatarModal(false);
      setSuccess('Preset avatar updated!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preset update failed.');
    }
  };

  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PLAYER CONTROL CENTER</p>
          <h1>Profile</h1>
        </div>
        <div className="hero-actions">
          {user?.isGuest ? (
            <button className="primary" onClick={() => setConvertModal(true)}>Upgrade to Full Account</button>
          ) : (
            <button className="secondary" onClick={() => setSettingsModal(true)}>Account Settings</button>
          )}
        </div>
      </div>

      {error && <p className="error panel">{error}</p>}
      {success && <p className="success-toast panel">{success}</p>}

      {user?.isGuest && (
        <section className="panel guest-banner">
          <div>
            <h3>⚡ Playing as Guest ({user.username})</h3>
            <p>Convert your guest session to a free registered account anytime to save your win streaks, unlock achievements, and add friends!</p>
          </div>
          <button className="primary" onClick={() => setConvertModal(true)}>Save My Progress</button>
        </section>
      )}

      {profile && (
        <div className="profile-layout">
          {/* Header Card */}
          <section className="panel profile-main-card">
            <div className="avatar-section">
              <AvatarDisplay
                url={profile.avatarUrl}
                preset={profile.avatarPreset}
                username={profile.username}
                size="large"
                onClick={() => !user?.isGuest && setAvatarModal(true)}
              />
              {!user?.isGuest && <button className="text-button small" onClick={() => setAvatarModal(true)}>Change avatar</button>}
            </div>

            <div className="profile-info-section">
              <div className="user-header">
                <h2>
                  {profile.username} {user?.isGuest ? '(Guest)' : ''}
                  {profile.country && COUNTRIES[profile.country] && (
                    <span className="flag-badge" title={COUNTRIES[profile.country].name}>
                      {COUNTRIES[profile.country].flag}
                    </span>
                  )}
                </h2>
                {!user?.isGuest && (
                  <button className="secondary small" onClick={() => setEditModal(true)}>Edit profile</button>
                )}
              </div>

              <p className="bio-display">{profile.bio ? `"${profile.bio}"` : <em>Session active (Guest stats are retained)</em>}</p>
              <small className="member-since">Session created {new Date(profile.createdAt).toLocaleDateString()}</small>
            </div>
          </section>

          {/* Stats Grid */}
          <section className="panel stats-panel">
            <h3>Session & Career Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card"><small>Games Played</small><b>{profile.stats.gamesPlayed}</b></div>
              <div className="stat-card"><small>Wins</small><b>{profile.stats.wins}</b></div>
              <div className="stat-card"><small>Losses</small><b>{profile.stats.losses}</b></div>
              <div className="stat-card"><small>Win Rate</small><b>{profile.stats.winRate}%</b></div>
              <div className="stat-card"><small>Current Streak</small><b>{profile.stats.currentStreak} 🔥</b></div>
              <div className="stat-card"><small>Longest Streak</small><b>{profile.stats.longestStreak} ⚡</b></div>
              <div className="stat-card"><small>UNO Calls</small><b>{profile.stats.unoCalls} 🃏</b></div>
              <div className="stat-card"><small>Caught Without UNO</small><b>{profile.stats.caughtWithoutUno} 🦅</b></div>
            </div>
          </section>

          {/* Achievements Grid */}
          <section className="panel achievements-panel">
            <h3>Achievement Badges ({profile.achievements.length}/{ALL_ACHIEVEMENTS.length})</h3>
            <div className="badges-shelf">
              {ALL_ACHIEVEMENTS.map((badge) => {
                const unlocked = profile.achievements.includes(badge.title);
                return (
                  <div key={badge.title} className={`badge-item ${unlocked ? 'unlocked' : 'locked'}`}>
                    <span className="badge-emoji">{badge.emoji}</span>
                    <div>
                      <b>{badge.title}</b>
                      <small>{badge.description}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Friends List Widget */}
          {!user?.isGuest ? (
            <section className="panel friends-panel">
              <div className="panel-header-line">
                <h3>Friends List ({friendsList.length})</h3>
                <form className="add-friend-form" onSubmit={handleAddFriend}>
                  <input
                    value={friendUsername}
                    onChange={(e) => setFriendUsername(e.target.value)}
                    placeholder="Friend's username"
                    maxLength={24}
                  />
                  <button className="primary small">+ Add</button>
                </form>
              </div>
              {friendError && <p className="error small">{friendError}</p>}
              <div className="friends-grid">
                {friendsList.length ? (
                  friendsList.map((f) => (
                    <div key={f.id} className="friend-card">
                      <div className="friend-info" onClick={() => setInspectUser(f.username)}>
                        <span className={`status-dot ${f.isOnline ? 'online' : 'offline'}`} />
                        <AvatarDisplay url={f.avatarUrl} preset={f.avatarPreset} username={f.username} size="small" />
                        <div>
                          <b>{f.username}</b>
                          <small>{f.isOnline ? 'Online now' : 'Offline'} · {f.stats.wins}W / {f.stats.losses}L</small>
                        </div>
                      </div>
                      <div className="friend-actions">
                        <button className="text-button small" onClick={() => setInspectUser(f.username)}>Profile</button>
                        <button className="text-button small danger" onClick={() => handleRemoveFriend(f.username)}>Remove</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-copy">No friends added yet. Add a friend by username to check their online status!</p>
                )}
              </div>
            </section>
          ) : (
            <section className="panel guest-lock-banner">
              <h3>🔒 Friends List & Global Leaderboards</h3>
              <p>Friends list, permanent match history, and global rankings are unlocked when you upgrade to a free registered account!</p>
              <button className="secondary" onClick={() => setConvertModal(true)}>Upgrade Account Now</button>
            </section>
          )}
        </div>
      )}

      {/* Edit Profile Modal */}
      {editModal && profile && (
        <Modal title="Edit Profile" onClose={() => setEditModal(false)}>
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              const data = new FormData(e.currentTarget);
              try {
                const res = await api.updateProfile({
                  username: String(data.get('username')),
                  bio: String(data.get('bio')),
                  country: String(data.get('country'))
                });
                setUser(res.user);
                setProfile(res.profile);
                setEditModal(false);
                setSuccess('Profile updated!');
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not update profile.');
              }
            }}
          >
            <label>
              Username
              <input name="username" defaultValue={profile.username} required maxLength={24} />
            </label>
            <label>
              Country
              <select name="country" defaultValue={profile.country || ''}>
                <option value="">None (Hidden)</option>
                {Object.entries(COUNTRIES).map(([code, c]) => (
                  <option key={code} value={code}>{c.flag} {c.name}</option>
                ))}
              </select>
            </label>
            <label>
              Bio (Short status or description)
              <textarea name="bio" defaultValue={profile.bio || ''} maxLength={200} placeholder="Say something about yourself..." />
            </label>
            <button className="primary">Save Changes</button>
          </form>
        </Modal>
      )}

      {/* Avatar Picker / Upload Modal */}
      {avatarModal && (
        <Modal title="Avatar Options" onClose={() => setAvatarModal(false)}>
          <div className="avatar-options-stack">
            <h4>1. Pick a Preset Avatar</h4>
            <div className="preset-grid">
              {Object.entries(AVATAR_PRESETS).map(([key, item]) => (
                <button key={key} type="button" className="preset-button" onClick={() => handleAvatarPreset(key)}>
                  <span className="preset-emoji-big">{item.emoji}</span>
                  <small>{item.label}</small>
                </button>
              ))}
            </div>

            <hr />

            <h4>2. Upload Custom Image</h4>
            <p className="small-lead">Supports PNG, JPEG, or WebP up to 1 MB.</p>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleAvatarUpload(file);
              }}
            />
          </div>
        </Modal>
      )}

      {/* Convert Guest Account Modal */}
      {convertModal && (
        <Modal title="Upgrade Guest Account" onClose={() => setConvertModal(false)}>
          <div className="convert-stack">
            <p className="highlight-lead">🎉 Keep your win streak & session stats! Choose how to save your account:</p>

            <div className="oauth-row">
              <button
                type="button"
                className="secondary oauth-btn"
                onClick={async () => {
                  try {
                    const res = await api.convertOAuth('google');
                    setUser(res.user);
                    await loadData();
                    setConvertModal(false);
                    setSuccess('Account created via Google! Your stats have been saved.');
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Google conversion failed.');
                  }
                }}
              >
                🌐 Upgrade with Google
              </button>
              <button
                type="button"
                className="secondary oauth-btn"
                onClick={async () => {
                  try {
                    const res = await api.convertOAuth('discord');
                    setUser(res.user);
                    await loadData();
                    setConvertModal(false);
                    setSuccess('Account created via Discord! Your stats have been saved.');
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Discord conversion failed.');
                  }
                }}
              >
                🎮 Upgrade with Discord
              </button>
            </div>

            <div className="divider-line"><span>OR CREATE EMAIL ACCOUNT</span></div>

            <form
              className="form-stack"
              onSubmit={async (e) => {
                e.preventDefault();
                setError('');
                const data = new FormData(e.currentTarget);
                try {
                  const res = await api.convertGuest({
                    username: String(data.get('username')),
                    email: String(data.get('email')),
                    password: String(data.get('password'))
                  });
                  setUser(res.user);
                  await loadData();
                  setConvertModal(false);
                  setSuccess('Account created successfully! Your stats and history have been preserved.');
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Account conversion failed.');
                }
              }}
            >
              <input name="username" defaultValue={user?.username} placeholder="Username" required maxLength={24} />
              <input name="email" type="email" placeholder="Email" required />
              <input name="password" type="password" minLength={10} placeholder="Password (10+ chars)" required />
              <button className="primary">Save Account & Stats</button>
            </form>
          </div>
        </Modal>
      )}

      {/* Settings Modal */}
      {settingsModal && profile && (
        <Modal title="Account Settings & Security" onClose={() => setSettingsModal(false)}>
          <div className="settings-sections">
            <section className="settings-block">
              <h4>Change Email / Password</h4>
              <form
                className="form-stack"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError(''); setSuccess('');
                  const data = new FormData(e.currentTarget);
                  try {
                    await api.updateCredentials({
                      currentPassword: String(data.get('currentPassword')),
                      newEmail: String(data.get('newEmail') || '') || undefined,
                      newPassword: String(data.get('newPassword') || '') || undefined
                    });
                    setSuccess('Credentials updated successfully!');
                    (e.target as HTMLFormElement).reset();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Credentials update failed.');
                  }
                }}
              >
                <input name="currentPassword" type="password" placeholder="Current Password" required />
                <input name="newEmail" type="email" placeholder="New Email (optional)" />
                <input name="newPassword" type="password" minLength={10} placeholder="New Password (optional)" />
                <button className="secondary">Update Credentials</button>
              </form>
            </section>

            <hr />

            <section className="settings-block">
              <h4>Preferences & Themes</h4>
              <form
                className="form-stack"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError(''); setSuccess('');
                  const data = new FormData(e.currentTarget);
                  try {
                    const res = await api.updateProfile({
                      username: profile.username,
                      preferences: {
                        notifications: data.get('notifications') === 'on',
                        sound: data.get('sound') === 'on',
                        theme: String(data.get('theme')) as 'midnight' | 'table' | 'cyber'
                      }
                    });
                    setProfile(res.profile);
                    setSuccess('Preferences saved!');
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Preferences save failed.');
                  }
                }}
              >
                <label><input type="checkbox" name="notifications" defaultChecked={profile.preferences.notifications} /> Sound & turn notifications</label>
                <label><input type="checkbox" name="sound" defaultChecked={profile.preferences.sound} /> Sound effects enabled</label>
                <label>
                  Theme
                  <select name="theme" defaultValue={profile.preferences.theme}>
                    <option value="midnight">Midnight Dark (Default)</option>
                    <option value="table">Green Felt Table</option>
                    <option value="cyber">Cyber Neon</option>
                  </select>
                </label>
                <button className="secondary">Save Preferences</button>
              </form>
            </section>

            <hr />

            <section className="settings-block danger-zone">
              <h4>Data & Security</h4>
              <div className="hero-actions">
                <a className="secondary text-center" href={api.exportData()} target="_blank" rel="noreferrer">Export My Data (JSON)</a>
                <button
                  className="secondary danger"
                  onClick={async () => {
                    if (confirm('Log out of all devices? This will invalidate active sessions on other browser windows.')) {
                      await api.logoutAll();
                      setUser(undefined);
                      navigate('/');
                    }
                  }}
                >
                  Log out of all devices
                </button>
                <button
                  className="primary danger"
                  onClick={async () => {
                    if (confirm('Permanently delete your account and all associated statistics? This action cannot be undone.')) {
                      await api.deleteAccount();
                      setUser(undefined);
                      navigate('/');
                    }
                  }}
                >
                  Delete Account Permanently
                </button>
              </div>
            </section>
          </div>
        </Modal>
      )}

      {/* Public Profile Inspector Modal */}
      {inspectUser && (
        <PublicProfileModal
          username={inspectUser}
          onClose={() => setInspectUser(null)}
          onAddFriend={!user?.isGuest ? (name) => api.addFriend(name).then(() => undefined) : undefined}
        />
      )}
    </main>
  );
}

function Room({
  user,
  ensureGuest,
  socket,
  connectionStatus = 'connected',
  latency = 0
}: {
  user?: User;
  ensureGuest: () => Promise<User>;
  socket?: Socket | null;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected';
  latency?: number;
}) {
  const navigate = useNavigate();
  const { code = '' } = useParams();
  const [state, setState] = useState<GameSnapshot>();
  const [meta, setMeta] = useState<RoomMeta>();
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Card>();
  const [wildColor, setWildColor] = useState<Color>('red');
  const [swap, setSwap] = useState('');
  const [callUno, setCallUno] = useState(true);
  const [chat, setChat] = useState('');
  const [reporting, setReporting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [inspectUser, setInspectUser] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(true);
  const [confirmLeaveModal, setConfirmLeaveModal] = useState(false);
  const [sortMode, setSortMode] = useState<'default' | 'color' | 'value'>('default');
  const [hostNotification, setHostNotification] = useState('');
  const [activeEmotes, setActiveEmotes] = useState<EmoteBroadcastEvent[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        await ensureGuest();
        if (!live || !socket) return;

        const handleRoomState = (next: GameSnapshot) => {
          if (live) {
            setState(next);
            setError('');
          }
        };
        const handleRoomMeta = (nextMeta: RoomMeta) => {
          if (live) setMeta(nextMeta);
        };
        const handleActionError = (item: { message: string }) => {
          if (live) setError(item.message);
        };
        const handleHostMigrated = (data: { newHostId: string; newHostUsername: string }) => {
          if (live) {
            setHostNotification(`👑 Host Migrated: ${data.newHostUsername} is now Room Host!`);
            setTimeout(() => setHostNotification(''), 4000);
          }
        };
        const handleEmoteBroadcast = (data: EmoteBroadcastEvent) => {
          if (live) {
            setActiveEmotes((prev) => [...prev.slice(-15), data]);
          }
        };

        socket.on('room:state', handleRoomState);
        socket.on('room:meta', handleRoomMeta);
        socket.on('action:error', handleActionError);
        socket.on('host:migrated', handleHostMigrated);
        socket.on('room:emote-broadcast', handleEmoteBroadcast);

        socket.emit('room:join', { code: code.toUpperCase() }, (res?: { error?: string }) => {
          if (res?.error && live) setError(res.error);
        });

        return () => {
          socket.off('room:state', handleRoomState);
          socket.off('room:meta', handleRoomMeta);
          socket.off('action:error', handleActionError);
          socket.off('host:migrated', handleHostMigrated);
          socket.off('room:emote-broadcast', handleEmoteBroadcast);
        };
      } catch (err: any) {
        if (live) setError(err.message || 'Failed to authenticate guest.');
      }
    })();
    return () => {
      live = false;
      if (socket) {
        socket.off('room:state');
        socket.off('room:meta');
        socket.off('action:error');
        socket.off('connect_error');
        socket.off('HOST_MIGRATED');
        socket.off('room:emote-broadcast');
        socket.off('connect');
        socket.emit('room:leave');
      }
    };
  }, [code, socket]);

  useEffect(() => { if (!state?.topCard) return; const context = new AudioContext(); const oscillator = context.createOscillator(); const gain = context.createGain(); gain.gain.value = 0.015; oscillator.frequency.value = 420; oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.05); return () => { void context.close(); }; }, [state?.topCard?.id]);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => { setSelected(undefined); setSwap(''); }, [state?.currentPlayerId, state?.topCard?.id]);
  useEffect(() => {
    const handlePopState = () => {
      if (state?.status === 'playing' && !state.isSpectator) {
        window.history.pushState(null, '', window.location.href);
        setConfirmLeaveModal(true);
      } else {
        socket?.emit('room:leave');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [state?.status, state?.isSpectator, socket]);

  const emit = (event: string, payload = {}) => socket?.emit(event, payload);
  const handleLeaveRoom = () => {
    emit('room:leave');
    navigate('/lobby');
  };

  const self = state?.players?.find((player) => player.isYou);
  const isTurn = Boolean(state && self && state.currentPlayerId === self.id && !state.isSpectator && self.connected !== false);
  const seconds = state?.turnDeadline ? Math.max(0, Math.ceil((state.turnDeadline - now) / 1000)) : undefined;
  const canPlayCard = (card: Card) => {
    if (!state || state.status !== 'playing' || state.isSpectator || !self || self.connected === false) return false;
    const isJumpIn = !isTurn && state.rules.jumpIn && !state.pendingDraw && card.color === state.topCard?.color && card.value === state.topCard?.value;
    if (!isTurn && !isJumpIn) return false;
    if (state.pendingDraw) return state.rules.stacking && (state.pendingDraw.type === 'draw2' ? card.value === 'draw2' : card.value === 'wild4');
    return !card.color || card.color === state.currentColor || card.value === state.topCard?.value;
  };
  const play = (card = selected, chosenColorOverride?: Color) => {
    if (!card) return;
    const colorToPlay = chosenColorOverride || (card.color ? undefined : wildColor);
    emit('game:play', {
      cardId: card.id,
      chosenColor: colorToPlay,
      swapWithPlayerId: card.value === '7' && state?.rules.sevenZero ? swap || undefined : undefined,
      callUno
    });
    setSelected(undefined);
  };

  if (!state) return <main className="page"><div className="panel loading">Joining <b>{code}</b>… {error && <p className="error">{error}</p>}</div></main>;
  
  if (state.status === 'waiting') return (
    <>
      <FloatingReactionOverlay activeEmotes={activeEmotes} />
      {hostNotification && (
        <div className="host-migrated-toast" style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          border: '1.5px solid #fbbf24',
          color: '#fbbf24',
          padding: '0.6rem 1.4rem',
          borderRadius: '999px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          zIndex: 9999,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          animation: 'fadeIn 0.3s ease'
        }}>
          <span>👑</span>
          <span>{hostNotification}</span>
        </div>
      )}
      <CommonPreMatchLobby
        user={user}
        roomMeta={meta}
        snapshot={state}
        socket={socket}
        onToggleReady={() => emit('room:ready', { ready: !self?.ready })}
        onStartMatch={() => emit('game:start')}
        onLeaveRoom={handleLeaveRoom}
        onSwitchGame={(game) => emit('room:switch-game', { gameType: game })}
        onClaimSeat={() => emit('room:claim-seat')}
        onSelectLudoColor={(color) => emit('room:set-color', { color })}
        onAddBot={() => emit('room:add-bot')}
        onRemoveBot={(botId) => emit('room:remove-bot', { botId })}
        onSendChat={(text) => emit('chat:send', { text })}
        onReactChat={(messageId, emoji) => emit('chat:react', { messageId, emoji })}
        onSendEmote={(data) => emit('room:emote', data)}
      />
    </>
  );

  if (state.gameType === 'ludo') {
    return (
      <>
        <FloatingReactionOverlay activeEmotes={activeEmotes} />
        <LudoGame
          user={user}
          ensureGuest={ensureGuest}
          snapshot={state}
          socket={socket}
          roomMeta={meta}
          onLeaveRoom={handleLeaveRoom}
          onSendEmote={(data) => emit('room:emote', data)}
        />
      </>
    );
  }
  if (state.gameType === 'snake') {
    return (
      <>
        <FloatingReactionOverlay activeEmotes={activeEmotes} />
        <SnakesLaddersGame
          user={user}
          ensureGuest={ensureGuest}
          snapshot={state}
          socket={socket}
          roomMeta={meta}
          onLeaveRoom={handleLeaveRoom}
          onSendEmote={(data) => emit('room:emote', data)}
        />
      </>
    );
  }

  const playersList = state?.players ?? [];
  const opponents = playersList.filter((player) => !player.isYou);
  const playerHand = state?.hand ?? [];
  const playerChat = state?.chat ?? [];

  const sortedHand = [...playerHand].sort((a, b) => {
    if (sortMode === 'color') {
      const colorOrder: Record<string, number> = { red: 1, yellow: 2, green: 3, blue: 4 };
      const cA = a.color ? colorOrder[a.color] : 5;
      const cB = b.color ? colorOrder[b.color] : 5;
      if (cA !== cB) return cA - cB;
      return a.value.localeCompare(b.value);
    }
    if (sortMode === 'value') {
      return a.value.localeCompare(b.value);
    }
    return 0;
  });

  return (
    <main className="game-page-v2">
      <FloatingReactionOverlay activeEmotes={activeEmotes} />
      {hostNotification && (
        <div className="host-migrated-toast" style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          border: '1.5px solid #fbbf24',
          color: '#fbbf24',
          padding: '0.6rem 1.4rem',
          borderRadius: '999px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          zIndex: 9999,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          animation: 'fadeIn 0.3s ease'
        }}>
          <span>👑</span>
          <span>{hostNotification}</span>
        </div>
      )}
      {/* Top Header Controls Bar */}
      <div className="game-top-bar">
        <div className="top-bar-left">
          <button
            type="button"
            className="back-btn-pill"
            onClick={(e) => {
              e.preventDefault();
              if (state.status === 'playing' && !state.isSpectator) {
                setConfirmLeaveModal(true);
              } else {
                emit('room:leave');
                navigate('/lobby');
              }
            }}
          >
            ← Back
          </button>
          <Link to="/" className="brand game-brand">
            <b>UNO</b> NIGHT
          </Link>
        </div>

        <div className="top-bar-center">
          <span className="turn-status-indicator">
            {state.isSpectator ? 'Spectating' : isTurn ? 'YOUR TURN' : `${playersList.find((p) => p.id === state.currentPlayerId)?.username ?? '—'}’s turn`}
          </span>
          {seconds !== undefined && <span className="turn-timer-pill">{seconds}s</span>}
        </div>

        <div className="top-bar-right">
          <VoiceChatBar
            socket={socket || null}
            currentUserId={user?.id || ''}
            roomCode={code}
            players={playersList}
          />
          <ReactionWheel onSendEmote={(data) => emit('room:emote', data)} position="top-right" />
          <div className={`connection-status-pill in-game status-${connectionStatus}`} title={`Heartbeat latency: ${latency}ms`}>
            <span className="status-dot" />
            <span className="status-text">{connectionStatus === 'connected' ? (latency ? `${latency}ms` : 'Online') : connectionStatus === 'connecting' ? 'Reconnecting…' : 'Offline'}</span>
          </div>
          <div className="room-code-tag">
            <span>ROOM <b>{code}</b></span>
            <button className="icon-btn-small" onClick={() => setShowInviteModal(true)} title="Share & Invite Friends">
              🔗 Share
            </button>
          </div>
          <button className={`icon-btn-small ${showChat ? 'active' : ''}`} onClick={() => setShowChat(!showChat)} title="Toggle Chat">
            💬 GAME CHAT
          </button>
        </div>
      </div>

      {state.isSpectator && (
        <div
          className="spectator-floating-banner"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.15))',
            border: '1.5px solid #f59e0b',
            borderRadius: '999px',
            padding: '0.4rem 1.4rem',
            color: '#fbbf24',
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
            maxWidth: '540px',
            margin: '0.6rem auto'
          }}
        >
          <span>👀</span>
          <span>Spectator Channel · Live Match Feed (Seats offered on rematch)</span>
        </div>
      )}

      {error && <p className="error toast">{error}</p>}

      {/* Reconnection & Grace Period Alert Banner */}
      {((self && self.connected === false && !self.isBot) || connectionStatus !== 'connected') && (
        <div className="reconnection-grace-banner">
          <div className="grace-banner-content">
            <span className="pulsing-warning-dot" />
            <div className="grace-banner-text">
              <strong>⚠️ Connection Interrupted · Reconnecting to Match</strong>
              <span>
                {self?.disconnectDeadline ? (
                  <>Grace period: <b>{Math.max(0, Math.ceil((self.disconnectDeadline - now) / 1000))}s</b> remaining. Your cards and seat are frozen & protected.</>
                ) : (
                  'Attempting to re-establish secure WebSocket session…'
                )}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="grace-reconnect-btn"
            onClick={() => {
              if (socket) {
                if (!socket.connected) socket.connect();
                socket.emit('room:join', { code });
              }
            }}
          >
            ⚡ Reconnect Now
          </button>
        </div>
      )}

      {/* Main Game Arena Layout */}
      <div className={`game-arena ${showChat ? 'with-chat' : 'full-table'}`}>

        {/* Oval Green Felt Table Stage */}
        <div className="table-stage">
          <div className="table-felt">
            {/* Animated Direction Ring */}
            <div className={`direction-ring ${state.direction === -1 ? 'reverse' : ''}`} />

            {/* Dynamic Opponent Seats */}
            {opponents.map((opponent, index) => {
              const total = opponents.length;
              let xPercent = 50;
              let yPercent = 8;

              if (total === 1) {
                xPercent = 50;
                yPercent = 8;
              } else if (total === 2) {
                xPercent = index === 0 ? 20 : 80;
                yPercent = 18;
              } else if (total === 3) {
                if (index === 0) { xPercent = 14; yPercent = 32; }
                else if (index === 1) { xPercent = 50; yPercent = 8; }
                else { xPercent = 86; yPercent = 32; }
              } else {
                const angleRad = Math.PI - (index + 1) * (Math.PI / (total + 1));
                xPercent = 50 + 42 * Math.cos(angleRad);
                yPercent = 34 - 26 * Math.sin(angleRad);
              }

              return (
                <div
                  key={opponent.id}
                  className="table-seat opponent-seat"
                  style={{ left: `${xPercent.toFixed(1)}%`, top: `${yPercent.toFixed(1)}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <div className="opponent-cards-row">
                    {Array.from({ length: Math.min(4, opponent.handCount) }).map((_, i) => (
                      <div key={i} className="mini-card-back" />
                    ))}
                  </div>
                  <div className={`seat-badge ${state.currentPlayerId === opponent.id ? 'active-turn' : ''} ${!opponent.connected && !opponent.isBot ? 'disconnected-player' : ''}`}>
                    <AvatarDisplay url={opponent.avatarUrl} preset={opponent.avatarPreset} username={opponent.username} size="small" onClick={() => !opponent.isBot && setInspectUser(opponent.username)} />
                    <div className="seat-info">
                      <b>{opponent.username}{opponent.isBot ? ' · BOT' : !opponent.connected ? ' (Offline)' : ''}</b>
                      <small>🃏 {opponent.handCount}</small>
                      {!opponent.connected && !opponent.isBot && opponent.disconnectDeadline ? (
                        <div className="grace-period-pill">
                          <span className="pulsing-warning-dot" />
                          <span>Reconnecting… {Math.max(0, Math.ceil((opponent.disconnectDeadline - now) / 1000))}s</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Center Board (Playing Indicator, Discard Pile & Draw Pile) */}
            <div className="center-board">
              <div className="playing-color-header">
                PLAYING - <span className={`color-title ${state.currentColor}`}>{state.currentColor.toUpperCase()} {state.topCard?.value === 'wild4' ? '+4' : ''}</span>
              </div>

              <div className="piles-row">
                <div className={`pile-item discard-item discard-glow-${state.currentColor}`} style={{ position: 'relative' }}>
                  {state.pendingDraw && (
                    <div className="stack-badge">+{state.pendingDraw.amount} STACK ACTIVE</div>
                  )}
                  <CardView card={state.topCard} />
                  <small className="pile-count">Discard</small>
                </div>

                <div className="pile-item draw-item deck-pile" onClick={isTurn ? () => emit(state.pendingDraw ? 'game:accept-penalty' : 'game:draw') : undefined}>
                  <CardView faceDown />
                  <span className="draw-label">DRAW DECK</span>
                  <small className="pile-count">~{state.drawCount}</small>
                </div>
              </div>

              {state.pendingDraw && (
                <div className="penalty-overlay">
                  <b>+{state.pendingDraw.amount}</b>
                  <span>{state.pendingDraw.type === 'wild4' ? 'Challenge or draw' : 'Stack or draw'}</span>
                  {isTurn && state.pendingDraw.type === 'wild4' && (
                    <button className="secondary small" onClick={() => emit('game:challenge-wild4')}>Challenge</button>
                  )}
                  {isTurn && (
                    <button className="primary small" onClick={() => emit('game:accept-penalty')}>Take cards</button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Seat (Self / Current Player or Spectator Console) */}
            {state.isSpectator ? (
              <div className="table-seat bottom-seat spectator-seat" style={{ display: 'flex', justifyContent: 'center', margin: '1rem auto' }}>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.85))',
                  border: '1.5px solid rgba(245,158,11,0.4)',
                  borderRadius: '16px',
                  padding: '1rem 1.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  maxWidth: '560px'
                }}>
                  <div style={{ background: 'rgba(245,158,11,0.2)', width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                    👀
                  </div>
                  <div>
                    <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.95rem' }}>
                      Spectating Live Game Feed
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                      Card plays and player turns stream live. Open player seats will be offered when the match ends.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="table-seat bottom-seat">
                <div className="bottom-seat-header">
                  <div className={`seat-badge self-badge ${isTurn ? 'active-turn' : ''}`}>
                    <AvatarDisplay url={self?.avatarUrl} preset={self?.avatarPreset} username={self?.username ?? 'You'} size="small" />
                    <div className="seat-info">
                      <b>{self?.username ?? 'You'} (You)</b>
                      <small>🃏 {self?.handCount ?? 0} cards · {self?.score ?? 0} pts</small>
                    </div>
                  </div>

                  <div className="dock-controls">
                    <button className={`pill-btn ${sortMode === 'color' ? 'active' : ''}`} onClick={() => setSortMode(sortMode === 'color' ? 'default' : 'color')}>Sort by Color</button>
                    <button className={`pill-btn ${sortMode === 'value' ? 'active' : ''}`} onClick={() => setSortMode(sortMode === 'value' ? 'default' : 'value')}>Sort by Value</button>
                  </div>
                </div>

              {/* Player Hand Cards */}
              <div className="player-hand-container">
                {((self && self.connected === false && !self.isBot) || connectionStatus !== 'connected') && (
                  <div className="frozen-hand-overlay">
                    <div className="frozen-hand-badge">
                      ❄️ <b>Hand Frozen</b> · Assets Protected During Reconnect
                    </div>
                  </div>
                )}
                <div className="hand-cards-fan">
                  {sortedHand.map((card) => {
                    const playable = canPlayCard(card);
                    return (
                      <CardView
                        key={card.id}
                        card={card}
                        active={selected?.id === card.id}
                        playable={playable}
                        onClick={playable ? () => {
                          if (!card.color || (card.value === '7' && state.rules.sevenZero)) {
                            setSelected(card);
                          } else {
                            setSelected(card);
                            play(card);
                          }
                        } : undefined}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Swap 7 Picker */}
              {selected?.value === '7' && state.rules.sevenZero && (
                <div className="wild-picker-bar">
                  <select value={swap} onChange={(event) => setSwap(event.target.value)}>
                    <option value="">Swap with…</option>
                    {opponents.map((player) => (
                      <option value={player.id} key={player.id}>{player.username}</option>
                    ))}
                  </select>
                  <button className="primary small" onClick={() => play(selected)} disabled={!swap}>Play 7</button>
                </div>
              )}

              <div className="bottom-action-buttons">
                <button className="primary" disabled={!isTurn || Boolean(state.pendingDraw)} onClick={() => emit('game:draw')}>Draw Card</button>
                <button className="secondary" disabled={!isTurn || !state.drewCardId} onClick={() => emit('game:pass')}>Pass</button>
              </div>
            </div>
            )}

          </div>
        </div>

        {/* Right Sidebar Chat Panel */}
        {showChat && (
          <GameChatPanel
            chat={playerChat}
            onSend={(text) => emit('chat:send', { text })}
            onReact={(messageId, emoji) => emit('chat:react', { messageId, emoji })}
            onClose={() => setShowChat(false)}
            isCollapsible
          />
        )}

      </div>

      {/* Radial Wild Color Selector Wheel Modal */}
      {selected && !selected.color && (
        <div className="color-wheel-backdrop" onClick={() => setSelected(undefined)}>
          <div className="color-wheel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="color-slice slice-red" onClick={() => { setWildColor('red'); play(selected, 'red'); }}>RED</div>
            <div className="color-slice slice-blue" onClick={() => { setWildColor('blue'); play(selected, 'blue'); }}>BLUE</div>
            <div className="color-slice slice-yellow" onClick={() => { setWildColor('yellow'); play(selected, 'yellow'); }}>YELLOW</div>
            <div className="color-slice slice-green" onClick={() => { setWildColor('green'); play(selected, 'green'); }}>GREEN</div>
          </div>
        </div>
      )}

      {/* Floating UNO Action Button (FAB) */}
      <button
        className={`uno-fab ${(self?.handCount ?? 0) <= 2 ? 'urgent-pulse' : ''}`}
        onClick={() => emit('game:call-uno')}
        title="Call UNO!"
      >
        UNO!
      </button>

      {(state.status === 'round-over' || state.status === 'match-over') && (
        <ResultModal
          state={state}
          user={user}
          onRematch={() => emit(state.status === 'match-over' ? 'match:rematch' : 'round:next')}
          onLeave={() => {
            emit('room:leave');
            socket?.disconnect();
            navigate('/lobby');
          }}
          onSaveStats={() => navigate('/profile')}
        />
      )}

      {reporting && <Report code={code} onClose={() => setReporting(false)} />}
      {inspectUser && <PublicProfileModal username={inspectUser} onClose={() => setInspectUser(null)} />}

      {confirmLeaveModal && (
        <Modal title="Leave Active Match?" onClose={() => setConfirmLeaveModal(false)}>
          <div className="confirm-leave-dialog">
            <p className="leave-warning-text">
              Are you sure you want to leave this game while it is in progress? Your current hand will be forfeited and your seat will be replaced by an AI bot.
            </p>
            <div className="modal-button-row">
              <button className="secondary" onClick={() => setConfirmLeaveModal(false)}>
                Stay in Game
              </button>
              <button
                className="primary leave-confirm-btn"
                onClick={() => {
                  emit('room:leave');
                  socket?.disconnect();
                  setConfirmLeaveModal(false);
                  navigate('/lobby');
                }}
              >
                Leave Game
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showInviteModal && (
        <ShareInviteModal
          roomCode={code}
          gameType={state.gameType}
          roomMeta={meta}
          snapshot={state}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </main>
  );
}

function ResultModal({
  state,
  user,
  onRematch,
  onLeave,
  onSaveStats
}: {
  state: GameSnapshot;
  user?: User;
  onRematch: () => void;
  onLeave: () => void;
  onSaveStats: () => void;
}) {
  const isMatchOver = state.status === 'match-over';
  const playersList = state.players ?? [];
  const winnerId = isMatchOver ? state.winnerId : state.roundWinnerId;
  const winner = playersList.find((p) => p.id === winnerId);
  const isSelfWinner = winner?.isYou;

  const sortedPlayers = [...playersList].sort((a, b) => b.score - a.score);

  return (
    <div className="modal-backdrop result-modal-backdrop" role="presentation">
      <section className="modal panel result-modal" role="dialog" aria-modal="true">
        <div className="result-header">
          <div className="result-badge-icon">
            {isSelfWinner ? '🏆' : '🃏'}
          </div>
          <h2>
            {isMatchOver
              ? isSelfWinner
                ? 'VICTORY! You won the match!'
                : `${winner?.username ?? 'A player'} Wins the Match!`
              : isSelfWinner
                ? 'ROUND VICTORY!'
                : `${winner?.username ?? 'A player'} won this round!`}
          </h2>
          <p className="result-subtitle">
            {isMatchOver
              ? `Target score of ${state.targetScore ?? 500} pts reached!`
              : 'Round cards tallied.'}
          </p>
        </div>

        <div className="result-scoreboard">
          <h3>Scoreboard Breakdown</h3>
          <div className="result-table">
            {sortedPlayers.map((player, idx) => {
              const isWinner = player.id === winnerId;
              return (
                <div key={player.id} className={`result-row ${isWinner ? 'winner-row' : ''} ${player.isYou ? 'self-row' : ''}`}>
                  <span className="rank-num">#{idx + 1}</span>
                  <AvatarDisplay url={player.avatarUrl} preset={player.avatarPreset} username={player.username} size="small" />
                  <div className="player-details">
                    <b>{player.username} {player.isYou ? '(You)' : ''} {player.isBot ? '· BOT' : ''}</b>
                    <small>{player.handCount} cards remaining</small>
                  </div>
                  <div className="player-score-tag">
                    {isWinner && <span className="winner-tag-pill">👑 Winner</span>}
                    <b>{player.score} pts</b>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {user?.isGuest && (
          <div className="post-game-guest-prompt">
            <span>⚡ Playing as Guest · Save your win streak & stats to a permanent account!</span>
            <button className="secondary small" onClick={onSaveStats}>Save Stats Now</button>
          </div>
        )}

        <div className="modal-button-row margin-top-md">
          <button className="secondary" onClick={onLeave}>
            Exit to Lobby
          </button>
          <button className="primary big" onClick={onRematch}>
            {isMatchOver ? 'Vote Rematch 🔄' : 'Next Round ➔'}
          </button>
        </div>
      </section>
    </div>
  );
}

function PlayerBadge({ player, current, onCatch, onClick }: { player: GameSnapshot['players'][number]; current: boolean; onCatch?: () => void; onClick?: () => void }) {
  return (
    <div className={`player-badge ${current ? 'current' : ''} ${!player.connected ? 'offline' : ''}`}>
      <AvatarDisplay url={player.avatarUrl} preset={player.avatarPreset} username={player.username} size="small" onClick={onClick} />
      <span onClick={onClick} className={onClick ? 'clickable' : ''}>
        <b>{player.username}{player.isBot ? ' · BOT' : player.isYou ? ' (You)' : ''}</b>
        <small>{player.handCount} cards · {player.score} pts {!player.connected && ' · reconnecting'}</small>
      </span>
      {player.handCount === 1 && !player.unoCalled && onCatch && <button className="catch" onClick={onCatch}>Catch UNO</button>}
    </div>
  );
}

function Chat({ state, value, setValue, onSend, onReact }: { state: GameSnapshot; value: string; setValue: (value: string) => void; onSend: () => void; onReact: (id: string, emoji: string) => void }) { return <aside className="panel chat"><h3>Table chat</h3><div className="messages">{state.chat.map((message) => <div key={message.id} className="message"><b>{message.username}</b><p>{message.text}</p><div>{['👍', '😂', '🔥'].map((emoji) => <button key={emoji} onClick={() => onReact(message.id, emoji)}>{emoji} {message.reactions[emoji]?.length || ''}</button>)}</div></div>)}</div><form onSubmit={(event) => { event.preventDefault(); onSend(); }}><input maxLength={280} value={value} onChange={(event) => setValue(event.target.value)} placeholder="Say something friendly…" /><button className="primary">Send</button></form></aside>; }

function Report({ code, onClose }: { code: string; onClose: () => void }) { const [message, setMessage] = useState(''); const [done, setDone] = useState(false); return <Modal title="Report an issue" onClose={onClose}><form className="form-stack" onSubmit={async (event) => { event.preventDefault(); await api.report({ category: 'bug', details: message, roomCode: code }); setDone(true); }}><textarea value={message} onChange={(event) => setMessage(event.target.value)} required maxLength={2000} placeholder="Tell us what happened." />{done ? <p>Thanks—your report was sent.</p> : <button className="primary">Send report</button>}</form></Modal>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal panel" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close" onClick={onClose}>×</button>
        <h2>{title}</h2>
        {children}
      </section>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const [user, setUser] = useState<User>();
  const [inspectUser, setInspectUser] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [latency, setLatency] = useState<number>(0);
  const [inGameActive, setInGameActive] = useState(false);
  const [serverStats, setServerStats] = useState<ServerStats>({ onlinePlayers: 1, playersAtTables: 0, activeTables: 0 });

  useEffect(() => {
    setInGameActive(false);
  }, [location.pathname]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { user: current } = await api.me();
        if (active && current) setUser(current);
      } catch {
        try {
          const { user: guest } = await api.guest();
          if (active && guest) setUser(guest);
        } catch {
          // ignore
        }
      }
    })();
    return () => { active = false; };
  }, []);

  // Open WebSocket channel on app entry with persistent session token & heartbeat monitoring
  useEffect(() => {
    const sessionToken = getSessionToken();
    const jwt = getAuthJwt();
    const client = io(socketUrl, {
      auth: { token: jwt || sessionToken },
      extraHeaders: { 'x-session-token': sessionToken },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000
    });

    setSocket(client);

    client.on('connect', () => {
      setConnectionStatus('connected');
    });

    client.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    client.on('connect_error', () => {
      setConnectionStatus('disconnected');
    });

    client.on('reconnect_attempt', () => {
      setConnectionStatus('connecting');
    });

    // Server-initiated heartbeat ping packet
    client.on('heartbeat:ping', (payload: { seq: number; timestamp: number }) => {
      const now = Date.now();
      const rtt = Math.max(1, now - payload.timestamp);
      setLatency(rtt);
      // Return pong response packet to server
      client.emit('heartbeat:pong', { seq: payload.seq, clientTimestamp: now });
    });

    client.on('heartbeat:ack', (payload: { latency: number; timestamp: number }) => {
      if (typeof payload?.latency === 'number') {
        setLatency(payload.latency);
      }
    });

    client.on('server:stats', (stats: ServerStats) => {
      if (stats && typeof stats.onlinePlayers === 'number') {
        setServerStats((prev) => ({ ...prev, ...stats }));
      }
    });

    api.lobby().then((res) => {
      if (res.onlinePlayers) {
        setServerStats((prev) => ({
          ...prev,
          onlinePlayers: res.onlinePlayers ?? prev.onlinePlayers,
          playersAtTables: res.playersAtTables ?? prev.playersAtTables,
          activeTables: res.activeTables ?? prev.activeTables
        }));
      }
    }).catch(() => undefined);

    return () => {
      client.disconnect();
    };
  }, []);

  // React to browser network offline/online events for seamless Wi-Fi stutter recovery
  useEffect(() => {
    const handleOnline = () => {
      setConnectionStatus('connecting');
      if (socket && !socket.connected) {
        socket.connect();
      }
    };
    const handleOffline = () => {
      setConnectionStatus('disconnected');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [socket]);

  const ensureGuest = async () => {
    if (user) return user;
    try {
      const { user: current } = await api.me();
      if (current) {
        setUser(current);
        return current;
      }
    } catch {
      // no active session
    }
    const { user: guest } = await api.guest();
    setUser(guest);
    return guest;
  };

  return (
    <Shell user={user} setUser={setUser} connectionStatus={connectionStatus} latency={latency} inGameActive={inGameActive}>
      <Routes>
        <Route path="/" element={<MainHubLanding user={user} setUser={setUser} ensureGuest={ensureGuest} serverStats={serverStats} />} />
        <Route path="/uno" element={<Home user={user} setUser={setUser} ensureGuest={ensureGuest} serverStats={serverStats} />} />
        <Route path="/ludo" element={<LudoGame user={user} ensureGuest={ensureGuest} socket={socket} onInGameChange={setInGameActive} serverStats={serverStats} />} />
        <Route path="/snakes-ladders" element={<SnakesLaddersGame user={user} ensureGuest={ensureGuest} socket={socket} onInGameChange={setInGameActive} serverStats={serverStats} />} />
        <Route path="/lobby" element={<Lobby ensureGuest={ensureGuest} serverStats={serverStats} />} />
        <Route path="/leaderboard" element={<Leaderboard onInspectPlayer={(username) => setInspectUser(username)} />} />
        <Route path="/history" element={<History user={user} />} />
        <Route path="/profile" element={<ProfileView user={user} setUser={setUser} ensureGuest={ensureGuest} />} />
        <Route path="/room/:code" element={<Room user={user} ensureGuest={ensureGuest} socket={socket} connectionStatus={connectionStatus} latency={latency} />} />
        <Route path="/join/:code" element={<Room user={user} ensureGuest={ensureGuest} socket={socket} connectionStatus={connectionStatus} latency={latency} />} />
        <Route path="*" element={<MainHubLanding user={user} setUser={setUser} ensureGuest={ensureGuest} />} />
      </Routes>
      {inspectUser && (
        <PublicProfileModal username={inspectUser} onClose={() => setInspectUser(null)} />
      )}
    </Shell>
  );
}
