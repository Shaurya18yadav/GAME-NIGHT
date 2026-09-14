import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { RoomMeta, ServerStats, User } from '../types';
import { FeedbackSection } from './FeedbackSection';
import { GameChatPanel, type ChatMessageItem } from './GameChatPanel';
import { ReactionWheel } from './ReactionWheel';
import { VoiceChatBar } from './VoiceChatBar';
import { ShareInviteModal } from './ShareInviteModal';
import { FloatingReactionOverlay, type EmoteBroadcastEvent } from './FloatingReactionOverlay';

function InteractiveSnakeArcadeWidget() {
  const [snakeScore, setSnakeScore] = useState(150);
  const [snakeLength, setSnakeLength] = useState(5);
  const [activeFood, setActiveFood] = useState({ type: '🍎 Red Apple', points: 50, emoji: '🍎' });
  const [isEating, setIsEating] = useState(false);
  const [feedMsg, setFeedMsg] = useState('Tap food to feed snake & test slither!');
  const [earnedBadge, setEarnedBadge] = useState<string | null>(null);

  const foods = [
    { type: '🍎 Red Apple', points: 50, emoji: '🍎' },
    { type: '⭐️ Golden Apple', points: 150, emoji: '⭐️' },
    { type: '🫐 Berry Boost', points: 75, emoji: '🫐' },
    { type: '🍇 Super Grape', points: 100, emoji: '🍇' }
  ];

  const eatFoodEffect = () => {
    if (isEating) return;
    setIsEating(true);
    setFeedMsg('🐍 Snake slithering at full speed towards food!');

    setTimeout(() => {
      setIsEating(false);
      const foodItem = foods[Math.floor(Math.random() * foods.length)];
      setActiveFood(foodItem);
      setSnakeScore((prev) => prev + foodItem.points);
      setSnakeLength((prev) => prev + 1);
      setEarnedBadge(`+${foodItem.points} PTS!`);
      setFeedMsg(`😋 CHOMP! Ate ${foodItem.type}! (+${foodItem.points} pts)`);

      setTimeout(() => setEarnedBadge(null), 1000);
    }, 450);
  };

  return (
    <div
      className="glow-pulse-box"
      style={{
        width: '100%',
        maxWidth: '420px',
        margin: '0 auto',
        background: 'linear-gradient(150deg, rgba(20,45,30,0.95), rgba(8,28,18,0.98))',
        border: '2px solid rgba(34,197,94,0.5)',
        borderRadius: '1.5rem',
        padding: '1.5rem',
        boxShadow: '0 20px 50px rgba(0,0,0,0.7), 0 0 25px rgba(34,197,94,0.3)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#22c55e', background: 'rgba(34,197,94,0.18)', padding: '0.35rem 0.85rem', borderRadius: '8px', boxShadow: '0 0 10px rgba(34,197,94,0.2)' }}>
          🐍 SNAKE CLASSIC ARCADE
        </span>
        <span style={{ fontSize: '0.8rem', color: '#86efac', fontWeight: 'bold' }}>⚡ 60FPS Slither</span>
      </div>

      {/* FLOATING POINTS ANIMATION BADGE */}
      {earnedBadge && (
        <div
          style={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            color: '#000',
            fontWeight: 800,
            fontSize: '1.2rem',
            padding: '0.4rem 1rem',
            borderRadius: '20px',
            boxShadow: '0 0 20px #fbbf24',
            animation: 'floatPoints 1s ease-out forwards',
            zIndex: 10
          }}
        >
          {earnedBadge}
        </div>
      )}

      {/* ENTHUSIASTIC SNAKE & FOOD CONTAINER */}
      <div style={{ position: 'relative', margin: '0.8rem 0' }}>
        <button
          type="button"
          onClick={eatFoodEffect}
          disabled={isEating}
          className={isEating ? 'food-chomping' : ''}
          style={{
            width: '130px',
            height: '130px',
            background: 'linear-gradient(135deg, #10b981, #064e3b)',
            border: '3px solid #ffffff',
            borderRadius: '28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 15px 35px rgba(16,185,129,0.5)',
            transition: 'transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
            outline: 'none'
          }}
        >
          <span style={{ fontSize: '3.8rem', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.6))' }}>
            {isEating ? '🐍' : activeFood.emoji}
          </span>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', marginTop: '0.2rem', letterSpacing: '0.5px' }}>
            {isEating ? 'CHOMPING...' : 'TAP TO FEED'}
          </span>
        </button>
      </div>

      {/* LIVE FEEDBACK MESSAGE */}
      <div style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(34,197,94,0.3)', padding: '0.65rem 1.2rem', borderRadius: '12px', textAlign: 'center', width: '100%' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold', color: '#86efac', textShadow: '0 0 8px rgba(34,197,94,0.4)' }}>
          {feedMsg}
        </p>
      </div>

      {/* MINI SNAKE SLITHERING TRACK PREVIEW */}
      <div style={{ width: '100%', background: 'rgba(15,23,42,0.95)', padding: '0.85rem', borderRadius: '14px', border: '1px solid rgba(34,197,94,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
          <span>Live Score: <strong style={{ color: '#22c55e', fontSize: '1rem' }}>{snakeScore} pts</strong></span>
          <span>Snake Body: <strong style={{ color: '#a78bfa', fontSize: '1rem' }}>{snakeLength} units</strong></span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', background: '#0f172a', padding: '8px', borderRadius: '10px', overflow: 'hidden' }}>
          {Array.from({ length: Math.min(snakeLength, 9) }).map((_, idx) => (
            <div
              key={idx}
              className="slithering-segment"
              style={{
                width: '24px',
                height: '24px',
                background: idx === 0 ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #16a34a, #15803d)',
                borderRadius: idx === 0 ? '8px' : '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                color: '#fff',
                boxShadow: idx === 0 ? '0 0 12px #22c55e' : 'none',
                animationDelay: `${idx * 0.1}s`
              }}
            >
              {idx === 0 ? '👀' : ''}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface Point {
  x: number;
  y: number;
}

interface Food {
  x: number;
  y: number;
  type: 'apple' | 'golden';
  points: number;
}

export interface SnakesLaddersGameProps {
  user?: User;
  ensureGuest: () => Promise<User>;
  snapshot?: any;
  socket?: any;
  roomMeta?: RoomMeta;
  serverStats?: ServerStats;
  onLeaveRoom?: () => void;
  onSendEmote?: (data: { emote?: string; phrase?: string; sfx?: string }) => void;
  onInGameChange?: (inGame: boolean) => void;
}

export function SnakesLaddersGame({
  user,
  ensureGuest,
  snapshot,
  socket,
  roomMeta,
  serverStats,
  onLeaveRoom,
  onSendEmote,
  onInGameChange
}: SnakesLaddersGameProps) {
  const navigate = useNavigate();

  // Navigation State based on SNAKE CLASSIC Architecture Diagram
  const [view, setView] = useState<'home' | 'select_grid' | 'game' | 'leaderboard'>(snapshot ? 'game' : 'home');
  const [howModal, setHowModal] = useState(false);
  const [gameOverModal, setGameOverModal] = useState(false);
  const [confirmLeaveModal, setConfirmLeaveModal] = useState(false);
  const [showSnakeChat, setShowSnakeChat] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeEmotes, setActiveEmotes] = useState<EmoteBroadcastEvent[]>([]);

  useEffect(() => {
    if (snapshot) {
      setView('game');
    }
  }, [snapshot]);

  useEffect(() => {
    onInGameChange?.(view === 'game');
    return () => {
      onInGameChange?.(false);
    };
  }, [view, onInGameChange]);

  const [localChat, setLocalChat] = useState<ChatMessageItem[]>([
    {
      id: 'welcome_snake',
      playerId: 'system',
      username: 'Snake Arcade',
      text: 'Welcome to Snake Arcade! Steer carefully and chomp those apples! 🍎',
      createdAt: Date.now() - 5000,
      reactions: {}
    }
  ]);

  const snakeChat: ChatMessageItem[] = (snapshot?.chat && snapshot.chat.length > 0) ? snapshot.chat : localChat;

  useEffect(() => {
    if (!socket) return;
    const handleEmoteBroadcast = (evt: EmoteBroadcastEvent) => {
      setActiveEmotes((prev) => [...prev.slice(-9), evt]);
    };
    socket.on('room:emote-broadcast', handleEmoteBroadcast);
    return () => {
      socket.off('room:emote-broadcast', handleEmoteBroadcast);
    };
  }, [socket]);

  const handleEmote = (data: { emote?: string; phrase?: string; sfx?: string }) => {
    if (onSendEmote) {
      onSendEmote(data);
    } else if (socket) {
      socket.emit('room:emote', data);
    } else {
      setActiveEmotes((prev) => [
        ...prev.slice(-9),
        {
          senderId: user?.id || 'self',
          senderUsername: user?.username || 'You',
          emote: data.emote,
          phrase: data.phrase,
          sfx: data.sfx,
          timestamp: Date.now()
        }
      ]);
    }
  };

  const handleSendSnakeChat = (text: string) => {
    if (socket && snapshot?.roomId) {
      socket.emit('chat:send', { text });
    } else {
      const newMsg: ChatMessageItem = {
        id: `snake_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        playerId: user?.id || 'player-self',
        username: user?.username || 'You',
        text,
        createdAt: Date.now(),
        reactions: {}
      };
      setLocalChat((prev) => [...prev, newMsg]);
    }
  };

  const handleReactSnakeChat = (messageId: string, emoji: string) => {
    if (socket && snapshot?.roomId) {
      socket.emit('chat:react', { messageId, emoji });
    } else {
      setLocalChat((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const currentReactions = msg.reactions || {};
          const userList = currentReactions[emoji] || [];
          const myName = user?.username || 'You';
          const hasReacted = userList.includes(myName);
          const updatedList = hasReacted
            ? userList.filter((u) => u !== myName)
            : [...userList, myName];
          return {
            ...msg,
            reactions: {
              ...currentReactions,
              [emoji]: updatedList
            }
          };
        })
      );
    }
  };

  // Game Mode & Grid Options
  const [mode, setMode] = useState<'classic' | 'speed'>('classic');
  const [gridSize, setGridSize] = useState<number>(20); // 15x15, 20x20, 25x25
  const [hasWalls, setHasWalls] = useState<boolean>(true); // true = Crash on Wall, false = Wrap Around
  const [speedMs, setSpeedMs] = useState<number>(100);

  // Game Stats & Canvas
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('snake_high_score') || '450', 10);
  });
  const [snake, setSnake] = useState<Point[]>([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 }
  ]);
  const [direction, setDirection] = useState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('UP');
  const [food, setFood] = useState<Food>({ x: 5, y: 5, type: 'apple', points: 50 });
  const [feedLog, setFeedLog] = useState<string[]>(['🐍 Game Ready! Use Arrow keys or WASD to navigate.']);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const dirRef = useRef<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('UP');
  dirRef.current = direction;

  // Real-time stats & API data
  const [lobbyRooms, setLobbyRooms] = useState<any[]>([]);
  const [leaderboardPlayers, setLeaderboardPlayers] = useState<{ id: string; username: string; wins: number; losses?: number; rating: number }[]>([]);
  const [ping, setPing] = useState<number>(32);
  const [leaderboard, setLeaderboard] = useState<{ id: string; username: string; score: number }[]>([
    { id: '1', username: 'SnakeKing', score: 1250 },
    { id: '2', username: 'ViperPro', score: 980 },
    { id: '3', username: 'PythonMaster', score: 850 },
    { id: '4', username: user?.username || 'You', score: highScore }
  ]);

  // Live Feedback
  const [feedbacks, setFeedbacks] = useState<{ id: string; author_name: string; author_role?: string; rating: number; comment: string }[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackRole, setFeedbackRole] = useState('');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const fetchStats = async () => {
    const startTime = Date.now();
    try {
      const [lRes, lbRes, fbRes] = await Promise.all([
        api.lobby().catch(() => ({ rooms: [] })),
        api.leaderboard().catch(() => ({ players: [] })),
        api.getFeedbacks().catch(() => ({ feedbacks: [] }))
      ]);
      setLobbyRooms(lRes.rooms);
      setLeaderboardPlayers(lbRes.players);
      setFeedbacks(fbRes.feedbacks);
      setPing(Date.now() - startTime);
    } catch {}
  };

  useEffect(() => {
    void fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackComment.trim()) return;
    setSubmittingFeedback(true);
    setFeedbackSuccess('');
    setFeedbackError('');
    try {
      const res = await api.submitFeedback({
        rating: newRating,
        comment: feedbackComment.trim(),
        authorName: feedbackName.trim() || user?.username || 'Arcade Player',
        authorRole: feedbackRole.trim() || 'Snake Master'
      });
      setFeedbacks(res.feedbacks);
      setFeedbackComment('');
      setFeedbackSuccess('Feedback posted to the table! 🎉');
    } catch (err: any) {
      setFeedbackError(err?.message || 'Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const addLog = (msg: string) => setFeedLog((prev) => [msg, ...prev.slice(0, 6)]);

  // ----------------------------------------------------
  // FLOW CONTROLLER ACTIONS (MATCHES ARCHITECTURE DIAGRAM)
  // ----------------------------------------------------

  // 1. Single Player Classic Handler
  const handleSinglePlayerClassic = (e?: React.MouseEvent) => {
    e?.preventDefault();
    void ensureGuest?.().catch(() => {});
    setMode('classic');
    setGridSize(20);
    setHasWalls(true);
    setSpeedMs(110);
    launchSnakeGame(20, 'classic');
  };

  // 2. Endless / Speed Rush Handler
  const handleSpeedRush = (e?: React.MouseEvent) => {
    e?.preventDefault();
    void ensureGuest?.().catch(() => {});
    setMode('speed');
    setGridSize(25);
    setHasWalls(false);
    setSpeedMs(60);
    launchSnakeGame(25, 'speed');
  };

  // 3. Start Game Play from Grid Selector
  const launchSnakeGame = (customGrid?: number, customMode?: 'classic' | 'speed') => {
    const activeGrid = customGrid || gridSize;
    const activeMode = customMode || mode;
    setScore(0);
    setSnake([
      { x: Math.floor(activeGrid / 2), y: Math.floor(activeGrid / 2) },
      { x: Math.floor(activeGrid / 2), y: Math.floor(activeGrid / 2) + 1 },
      { x: Math.floor(activeGrid / 2), y: Math.floor(activeGrid / 2) + 2 }
    ]);
    setDirection('UP');
    dirRef.current = 'UP';
    spawnFood(activeGrid);
    setGameOverModal(false);
    setIsPaused(false);
    setFeedLog([`🐍 SNAKE ${activeMode.toUpperCase()} Match Started! Grid: ${activeGrid}x${activeGrid}`]);
    setView('game');
  };

  // Food Generator
  const spawnFood = (customGrid?: number) => {
    const activeGrid = customGrid || gridSize;
    const isGolden = Math.random() < 0.25;
    const fx = Math.floor(Math.random() * activeGrid);
    const fy = Math.floor(Math.random() * activeGrid);
    setFood({
      x: fx,
      y: fy,
      type: isGolden ? 'golden' : 'apple',
      points: isGolden ? 150 : 50
    });
  };

  // Keybindings Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key;
      const cur = dirRef.current;

      if ((k === 'ArrowUp' || k === 'w' || k === 'W') && cur !== 'DOWN') {
        setDirection('UP');
      } else if ((k === 'ArrowDown' || k === 's' || k === 'S') && cur !== 'UP') {
        setDirection('DOWN');
      } else if ((k === 'ArrowLeft' || k === 'a' || k === 'A') && cur !== 'RIGHT') {
        setDirection('LEFT');
      } else if ((k === 'ArrowRight' || k === 'd' || k === 'D') && cur !== 'LEFT') {
        setDirection('RIGHT');
      } else if (k === ' ') {
        setIsPaused((p) => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Main Snake Movement Game Loop
  useEffect(() => {
    if (view !== 'game' || gameOverModal || isPaused) return;

    const timer = setInterval(() => {
      setSnake((prevSnake) => {
        const head = { ...prevSnake[0] };

        if (dirRef.current === 'UP') head.y -= 1;
        if (dirRef.current === 'DOWN') head.y += 1;
        if (dirRef.current === 'LEFT') head.x -= 1;
        if (dirRef.current === 'RIGHT') head.x += 1;

        // Wall Collision / Wrap Logic
        if (hasWalls) {
          if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize) {
            triggerGameOver();
            return prevSnake;
          }
        } else {
          if (head.x < 0) head.x = gridSize - 1;
          if (head.x >= gridSize) head.x = 0;
          if (head.y < 0) head.y = gridSize - 1;
          if (head.y >= gridSize) head.y = 0;
        }

        // Self Body Collision
        if (prevSnake.some((segment) => segment.x === head.x && segment.y === head.y)) {
          triggerGameOver();
          return prevSnake;
        }

        const newSnake = [head, ...prevSnake];

        // Food Eating Logic
        if (head.x === food.x && head.y === food.y) {
          const earned = food.points;
          setScore((s) => {
            const nextScore = s + earned;
            if (nextScore > highScore) {
              setHighScore(nextScore);
              localStorage.setItem('snake_high_score', nextScore.toString());
            }
            return nextScore;
          });
          addLog(`🍎 Ate ${food.type === 'golden' ? 'Golden Apple! (+150 pts)' : 'Red Apple! (+50 pts)'}`);
          spawnFood();
        } else {
          newSnake.pop(); // Remove tail if no food eaten
        }

        return newSnake;
      });
    }, speedMs);

    return () => clearInterval(timer);
  }, [view, gameOverModal, isPaused, food, gridSize, hasWalls, speedMs, highScore]);

  const triggerGameOver = () => {
    setGameOverModal(true);
    addLog(`💥 GAME OVER! Final Score: ${score}`);
  };

  // ----------------------------------------------------
  // VIEW 1: SNAKE CLASSIC HOME PAGE
  // ----------------------------------------------------
  if (view === 'home') {
    return (
      <div className="landing-v2-container">
        <div className="colorstrip"></div>

        {/* HERO SECTION */}
        <section className="hero">
          <div>
            <div className="eyebrow">🐍 SNAKE CLASSIC · ARCADE ARENA</div>
            <h1>Play Snake Classic <em>online</em> with anyone.</h1>
            <p className="lede">
              Single Player Classic, Speed Rush, custom grid sizes, boundary wall toggles, and live high-score leaderboards.
            </p>

            {/* ARCHITECTURE ACTIONS */}
            <div className="cta-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem' }}>
              <button type="button" className="btn btn-primary" onClick={handleSinglePlayerClassic}>
                🐍 Single Player Classic
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSpeedRush}>
                ⚡ Endless / Speed Rush
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setView('select_grid')}>
                ⚙️ Custom Grid & Speed
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setView('leaderboard')}>
                🏆 Leaderboard (High Scores)
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setHowModal(true)}>
                📖 How to Play & Controls
              </button>
            </div>
          </div>

          {/* 3D HERO DISPLAY */}
          <div>
            <InteractiveSnakeArcadeWidget />
          </div>
        </section>

        {/* HOW TO PLAY SECTION */}
        <section className="how" id="how">
          <div className="wrap">
            <div className="section-head">
              <h2>Four steps to arcade mastery.</h2>
              <p>New to Snake Classic? Learn controls, food scoring, wall mechanics, and high-score combos in seconds.</p>
            </div>
            <div className="steps">
              <div className="step" style={{ '--step-color': 'var(--green)' } as React.CSSProperties}>
                <div className="n">01</div>
                <h3>Control the Snake</h3>
                <p>Use Arrow keys or WASD to guide your snake head Up, Down, Left, or Right on the grid.</p>
              </div>

              <div className="step" style={{ '--step-color': 'var(--yellow)' } as React.CSSProperties}>
                <div className="n">02</div>
                <h3>Chomp Food Orbs</h3>
                <p>Eat Red Apples (+50 pts) and Golden Apples (+150 pts) to grow your snake length!</p>
              </div>

              <div className="step" style={{ '--step-color': 'var(--red)' } as React.CSSProperties}>
                <div className="n">03</div>
                <h3>Avoid Obstacles</h3>
                <p>Don't crash into the outer border walls or bite your own growing snake tail!</p>
              </div>

              <div className="step" style={{ '--step-color': 'var(--blue)' } as React.CSSProperties}>
                <div className="n">04</div>
                <h3>Climb Leaderboard</h3>
                <p>Set new high score records, earn rank titles, and claim the #1 Snake King spot!</p>
              </div>
            </div>
          </div>
        </section>

        {/* LIVE ROOM & LEADERBOARD STATS */}
        <section id="room">
          <div className="wrap">
            <div className="section-head">
              <h2>A live arcade, day or night.</h2>
              <p>Real seats, filling up in real time. Climb the board and your name shows up here too.</p>
            </div>
            <div className="room-grid">
              <div className="quickstats">
                <div className="qstat">
                  <div className="big" style={{ color: 'var(--green)' }}>{serverStats?.activeTables ?? lobbyRooms.length}</div>
                  <div className="lbl2">active tables</div>
                </div>
                <div className="qstat">
                  <div className="big" style={{ color: 'var(--yellow)' }}>{serverStats?.onlinePlayers ?? Math.max(1, lobbyRooms.reduce((a, r) => a + r.players, 0))}</div>
                  <div className="lbl2">active players in arcade</div>
                </div>
                <div className="qstat">
                  <div className="big" style={{ color: 'var(--purple)' }}>{leaderboardPlayers.length}</div>
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
                    <div key={player.id} className="lb-row">
                      <span className={`rank r${idx + 1}`}>#{idx + 1}</span>
                      <span className="lb-name">{player.username}</span>
                      <span className="lb-points">{player.rating} pts</span>
                      <span className="lb-streak">▲ {player.wins}W / {player.losses ?? 0}L</span>
                    </div>
                  ))
                ) : (
                  <div className="lb-row">
                    <span className="rank r1">#1</span>
                    <span className="lb-name">{user?.username ?? 'SnakeKing'}</span>
                    <span className="lb-points">1,250 pts</span>
                    <span className="lb-streak">▲ 0 wins</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <FeedbackSection user={user} gameTitle="Snake Classic" accentColor="#10b981" defaultRolePlaceholder="Snake Arcade Champ" />

        {/* CTA BAND */}
        <section>
          <div className="wrap">
            <div className="ctaband" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.3) 0%, rgba(139,92,246,0.3) 100%)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '1.5rem', padding: '2.5rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '2.2rem', fontFamily: 'Fredoka, sans-serif', color: '#fff', margin: '0 0 0.5rem 0' }}>Your seat's open. Slither in and find out.</h2>
                <p style={{ color: '#cbd5e1', margin: 0, maxWidth: '600px' }}>No account needed to try an arcade match — sign in later to save your stats and climb the Snake Classic leaderboard.</p>
              </div>
              <button type="button" className="btn btn-primary" onClick={handleSinglePlayerClassic} style={{ padding: '0.9rem 1.8rem', fontSize: '1.05rem', background: '#16a34a' }}>
                Play Snake Classic Now →
              </button>
            </div>
          </div>
        </section>

        {/* HOW TO PLAY MODAL */}
        {howModal && (
          <div className="modal-backdrop" onClick={() => setHowModal(false)}>
            <div className="modal panel" onClick={(e) => e.stopPropagation()} style={{ background: '#0f172a', padding: '1.8rem', borderRadius: '1.2rem', border: '1px solid #a78bfa', color: '#fff' }}>
              <button className="close" onClick={() => setHowModal(false)}>×</button>
              <h2>How to Play & Controls</h2>
              <ul style={{ lineHeight: '1.8', color: '#cbd5e1', fontSize: '0.95rem' }}>
                <li><strong>Arrow Keys / WASD</strong>: Steer snake Up, Down, Left, or Right.</li>
                <li><strong>Spacebar</strong>: Pause / Resume match.</li>
                <li><strong>Red Apple (🍎)</strong>: +50 Points & grows snake length by 1.</li>
                <li><strong>Golden Apple (⭐️)</strong>: +150 Bonus Points!</li>
                <li><strong>Avoid Walls</strong> (in Classic mode) & do not bite your own snake body!</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW 2: SELECT GRID (SIZE & WALLS)
  // ----------------------------------------------------
  if (view === 'select_grid') {
    return (
      <div className="landing-v2-container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'rgba(15,23,42,0.95)', border: '1.5px solid #a78bfa', borderRadius: '1.5rem', padding: '2rem', maxWidth: '520px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
          <h2 style={{ fontFamily: 'Fredoka, sans-serif', color: '#a78bfa', textAlign: 'center', marginTop: 0 }}>⚙️ Select Grid & Rules</h2>

          {/* GRID SIZE SELECTION */}
          <div style={{ margin: '1.2rem 0' }}>
            <label style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Grid Board Size:</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {[15, 20, 25].map((sz) => (
                <button
                  key={sz}
                  onClick={() => setGridSize(sz)}
                  className={`btn ${gridSize === sz ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {sz}x{sz} {sz === 20 ? '(Classic)' : sz === 15 ? '(Small)' : '(Large)'}
                </button>
              ))}
            </div>
          </div>

          {/* WALL BOUNDARY SELECTION */}
          <div style={{ margin: '1.2rem 0' }}>
            <label style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Boundary Walls:</label>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button
                onClick={() => setHasWalls(true)}
                className={`btn ${hasWalls ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
              >
                🧱 Walls On (Solid Crash)
              </button>
              <button
                onClick={() => setHasWalls(false)}
                className={`btn ${!hasWalls ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
              >
                🔄 Pass-Through (Wrap)
              </button>
            </div>
          </div>

          {/* SPEED SELECTION */}
          <div style={{ margin: '1.2rem 0' }}>
            <label style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Snake Speed:</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {[
                { label: 'Normal (1x)', ms: 120 },
                { label: 'Fast (1.5x)', ms: 80 },
                { label: 'Hyper (2x)', ms: 50 }
              ].map((sp) => (
                <button
                  key={sp.ms}
                  onClick={() => setSpeedMs(sp.ms)}
                  className={`btn ${speedMs === sp.ms ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {sp.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={(e) => { e.preventDefault(); setView('home'); }} className="btn btn-secondary" style={{ flex: 1 }}>Back</button>
            <button type="button" onClick={(e) => { e.preventDefault(); launchSnakeGame(); }} className="btn btn-primary" style={{ flex: 2, padding: '0.85rem', fontSize: '1.05rem' }}>🚀 Start Snake Match →</button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW 3: LEADERBOARD
  // ----------------------------------------------------
  if (view === 'leaderboard') {
    return (
      <div className="landing-v2-container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'rgba(15,23,42,0.95)', border: '1.5px solid #a78bfa', borderRadius: '1.5rem', padding: '2rem', maxWidth: '520px', width: '100%' }}>
          <h2 style={{ fontFamily: 'Fredoka, sans-serif', color: '#a78bfa', textAlign: 'center', marginTop: 0 }}>🏆 Snake High Scores</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', margin: '1.5rem 0' }}>
            {leaderboard.map((item, idx) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(30,41,59,0.8)', border: idx === 0 ? '1px solid #fbbf24' : '1px solid transparent', padding: '0.8rem 1rem', borderRadius: '10px' }}>
                <span style={{ fontWeight: 'bold', color: idx === 0 ? '#fbbf24' : '#fff' }}>#{idx + 1} {item.username}</span>
                <span style={{ fontWeight: 'bold', color: '#22c55e' }}>{item.score} pts</span>
              </div>
            ))}
          </div>

          <button type="button" onClick={(e) => { e.preventDefault(); setView('home'); }} className="btn btn-secondary" style={{ width: '100%' }}>Back to Snake Home</button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW 4: GAME PLAY (UNO-STYLE APP SHELL & ARENA)
  // ----------------------------------------------------
  return (
    <main className="game-page-v2">
      <FloatingReactionOverlay activeEmotes={activeEmotes} />

      {/* Top Header Controls Bar */}
      <div className="game-top-bar">
        <div className="top-bar-left">
          <button
            type="button"
            className="back-btn-pill"
            onClick={() => {
              setIsPaused(true);
              setConfirmLeaveModal(true);
            }}
            title="Exit Snake Run"
          >
            ← Back
          </button>
          <div className="brand game-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
            <span style={{ fontSize: '1.25rem' }}>🐍</span>
            <span><b>SNAKE</b> ARCADE</span>
          </div>
        </div>

        <div className="top-bar-center">
          <span className="turn-status-indicator" style={{ color: '#22c55e' }}>
            SCORE: {score} PTS
          </span>
          <span
            className="turn-timer-pill"
            style={{
              background: 'linear-gradient(135deg, #10b981, #047857)',
              boxShadow: '0 0 14px rgba(16, 185, 129, 0.4)'
            }}
          >
            🏆 BEST: {highScore}
          </span>
        </div>

        <div className="top-bar-right">
          <VoiceChatBar
            socket={socket || null}
            currentUserId={user?.id || ''}
            roomCode={snapshot?.roomId || 'SNAKE-01'}
            players={[{ id: user?.id || 'self', username: user?.username || 'You' }]}
          />
          <ReactionWheel onSendEmote={handleEmote} position="top-right" />
          <div className="connection-status-pill in-game status-connected" title="Heartbeat latency">
            <span className="status-dot" />
            <span className="status-text">{ping}ms</span>
          </div>
          <div className="room-code-tag">
            <span>ROOM <b>{snapshot?.roomId || 'SNAKE-01'}</b></span>
            <button className="icon-btn-small" onClick={() => setShowInviteModal(true)} title="Share & Invite Friends">
              🔗 Share
            </button>
          </div>
          <button
            type="button"
            className={`icon-btn-small ${showSnakeChat ? 'active' : ''}`}
            onClick={() => setShowSnakeChat(!showSnakeChat)}
            title="Toggle Live Chat"
          >
            💬 GAME CHAT
          </button>
        </div>
      </div>

      {/* Main Game Arena Layout */}
      <div className={`game-arena ${showSnakeChat ? 'with-chat' : 'full-table'}`}>
        {/* CENTER TABLE STAGE */}
        <div className="table-stage snake-table-stage">
          <div className="snake-arena-col">
            {/* IN-GAME CONTROLS TOOLBAR */}
            <div className="snake-top-toolbar">
              <div className="snake-mode-pills">
                <span className="snake-mode-pill active">
                  {mode === 'classic' ? '🐍 CLASSIC' : '⚡ SPEED RUSH'}
                </span>
                <span className="snake-mode-pill dim">
                  {gridSize}x{gridSize} Grid
                </span>
                <span className="snake-mode-pill dim">
                  Walls: {hasWalls ? 'ON' : 'OFF'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="icon-btn-small"
                  onClick={() => setIsPaused((p) => !p)}
                  style={{
                    background: isPaused ? '#f59e0b' : '#253246',
                    borderColor: isPaused ? '#f59e0b' : '#3b4b62',
                    color: isPaused ? '#000' : '#fff'
                  }}
                >
                  {isPaused ? '▶ Resume' : '⏸ Pause'}
                </button>
                <button
                  type="button"
                  className="icon-btn-small"
                  onClick={() => launchSnakeGame()}
                  title="Restart Run"
                >
                  🔄 Restart
                </button>
                <button
                  type="button"
                  className="icon-btn-small"
                  onClick={() => setHowModal(true)}
                  title="How to Play Rules"
                >
                  📖 Rules
                </button>
              </div>
            </div>

            {/* MAIN ARCADE CANVAS CONTAINER */}
            <div className="snake-canvas-box">
              <div
                className="snake-grid-canvas"
                style={{
                  gridTemplateColumns: `repeat(${gridSize}, 1fr)`
                }}
              >
                {Array.from({ length: gridSize * gridSize }).map((_, idx) => {
                  const cx = idx % gridSize;
                  const cy = Math.floor(idx / gridSize);
                  const isHead = snake[0]?.x === cx && snake[0]?.y === cy;
                  const isBody = snake.slice(1).some((s) => s?.x === cx && s?.y === cy);
                  const isFood = food?.x === cx && food?.y === cy;

                  return (
                    <div
                      key={idx}
                      className={`snake-grid-cell ${isHead ? 'head' : isBody ? 'body' : isFood ? 'food' : ''}`}
                      style={{
                        background: isHead
                          ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                          : isBody
                          ? 'linear-gradient(135deg, #16a34a, #15803d)'
                          : isFood
                          ? food.type === 'golden'
                            ? '#fbbf24'
                            : '#ef4444'
                          : (cx + cy) % 2 === 0
                          ? 'rgba(15,23,42,0.85)'
                          : 'rgba(30,41,59,0.45)',
                        borderRadius: isHead ? '6px' : isFood ? '50%' : '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        boxShadow: isHead
                          ? '0 0 10px #22c55e'
                          : isFood
                          ? food.type === 'golden'
                            ? '0 0 12px #fbbf24'
                            : '0 0 10px #ef4444'
                          : 'none'
                      }}
                    >
                      {isHead && '👀'}
                      {isFood && (food.type === 'golden' ? '⭐️' : '🍎')}
                    </div>
                  );
                })}
              </div>

              {/* TOUCH D-PAD FOR MOBILE / CLICK CONTROLS */}
              <div className="snake-dpad">
                <button onClick={() => dirRef.current !== 'DOWN' && setDirection('UP')} className="btn btn-secondary dpad-btn up">▲</button>
                <div className="dpad-mid-row">
                  <button onClick={() => dirRef.current !== 'RIGHT' && setDirection('LEFT')} className="btn btn-secondary dpad-btn left">◀</button>
                  <button onClick={() => dirRef.current !== 'UP' && setDirection('DOWN')} className="btn btn-secondary dpad-btn down">▼</button>
                  <button onClick={() => dirRef.current !== 'LEFT' && setDirection('RIGHT')} className="btn btn-secondary dpad-btn right">▶</button>
                </div>
              </div>
            </div>

            {/* LIVE METRICS & FEED ROW */}
            <div className="snake-status-strip">
              <div className="snake-stat-pill">
                <span>Body:</span>
                <strong>{snake.length} segments</strong>
              </div>
              <div className="snake-stat-pill">
                <span>Heading:</span>
                <strong style={{ color: '#a78bfa' }}>{direction}</strong>
              </div>
              <div className="snake-stat-pill">
                <span>Latest:</span>
                <strong style={{ color: '#86efac' }}>{feedLog[0] || 'Navigating...'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT LIVE CHAT SIDEBAR (MATCHING UNO SIDE-BY-SIDE) */}
        {showSnakeChat && (
          <GameChatPanel
            chat={snakeChat}
            onSend={handleSendSnakeChat}
            onReact={handleReactSnakeChat}
            onClose={() => setShowSnakeChat(false)}
            title="SNAKE ARCADE CHAT"
            isCollapsible
          />
        )}
      </div>

      {showInviteModal && (
        <ShareInviteModal
          roomCode={snapshot?.roomId || 'SNAKE-01'}
          gameType="snake"
          roomMeta={roomMeta}
          snapshot={snapshot}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* CONFIRM LEAVE GAME MODAL */}
      {confirmLeaveModal && (
        <div className="modal-backdrop" style={{ zIndex: 1000 }} onClick={() => setConfirmLeaveModal(false)}>
          <div
            className="modal panel"
            style={{
              background: 'linear-gradient(150deg, #1e293b, #0f172a)',
              padding: '2rem',
              borderRadius: '1.25rem',
              border: '1.5px solid rgba(239, 68, 68, 0.4)',
              maxWidth: '440px',
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.6rem' }}>🚪</span>
            <h2 style={{ fontFamily: 'Fredoka, sans-serif', color: '#f87171', margin: '0 0 0.6rem 0', fontSize: '1.4rem' }}>
              Leave Active Snake Run?
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.55', margin: '0 0 1.5rem 0' }}>
              Are you sure you want to quit this run? Your current score of <strong style={{ color: '#22c55e' }}>{score} pts</strong> will be forfeited.
            </p>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, padding: '0.7rem', fontWeight: 600 }}
                onClick={() => setConfirmLeaveModal(false)}
              >
                Keep Playing
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, padding: '0.7rem', background: '#ef4444', borderColor: '#ef4444', fontWeight: 700 }}
                onClick={() => {
                  setConfirmLeaveModal(false);
                  if (onLeaveRoom) {
                    onLeaveRoom();
                  } else {
                    setView('home');
                  }
                }}
              >
                Quit Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER MODAL (FINAL SCORE & RETRY / HOME) */}
      {gameOverModal && (
        <div className="modal-backdrop">
          <div className="modal panel" style={{ background: '#0f172a', padding: '2rem', borderRadius: '1.5rem', border: '2px solid #ef4444', maxWidth: '440px', width: '100%', textAlign: 'center' }}>
            <span style={{ fontSize: '4rem' }}>💥</span>
            <h2 style={{ fontFamily: 'Fredoka, sans-serif', color: '#ef4444', margin: '0.5rem 0' }}>GAME OVER</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Final Score: <strong style={{ color: '#22c55e', fontSize: '1.5rem' }}>{score} pts</strong></p>
            {score >= highScore && score > 0 && (
              <div style={{ background: 'rgba(251,191,36,0.18)', border: '1px solid #fbbf24', padding: '0.5rem', borderRadius: '8px', color: '#fbbf24', fontWeight: 'bold', fontSize: '0.88rem', margin: '0.8rem 0' }}>
                🎉 NEW HIGH SCORE ACHIEVED!
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => {
                  setGameOverModal(false);
                  if (onLeaveRoom) {
                    onLeaveRoom();
                  } else {
                    setView('home');
                  }
                }}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Home
              </button>
              <button onClick={() => setView('select_grid')} className="btn btn-secondary" style={{ flex: 1 }}>Grid</button>
              <button onClick={() => launchSnakeGame()} className="btn btn-primary" style={{ flex: 1 }}>Retry 🔄</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
