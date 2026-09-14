import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { RoomMeta, ServerStats, User } from '../types';
import { FeedbackSection } from './FeedbackSection';
import { GameChatPanel, type ChatMessageItem } from './GameChatPanel';
import { ReactionWheel } from './ReactionWheel';
import { VoiceChatBar } from './VoiceChatBar';
import { ShareInviteModal } from './ShareInviteModal';
import { FloatingReactionOverlay, type EmoteBroadcastEvent } from './FloatingReactionOverlay';

function InteractiveRollingDiceWidget() {
  const [diceVal, setDiceVal] = useState(6);
  const [isRolling, setIsRolling] = useState(false);
  const [pawnPos, setPawnPos] = useState(0);
  const [activeColor, setActiveColor] = useState<'red' | 'green' | 'yellow' | 'blue'>('red');
  const [rollMsg, setRollMsg] = useState('Click die to roll & test move!');

  const colorVar: Record<string, string> = {
    red: '#ef4444',
    green: '#10b981',
    yellow: '#f59e0b',
    blue: '#3b82f6'
  };

  const rollDiceEffect = () => {
    if (isRolling) return;
    setIsRolling(true);
    setRollMsg('Rolling 3D Die...');

    let count = 0;
    const timer = setInterval(() => {
      setDiceVal(Math.floor(Math.random() * 6) + 1);
      count++;

      if (count > 10) {
        clearInterval(timer);
        const finalVal = Math.floor(Math.random() * 6) + 1;
        setDiceVal(finalVal);
        setIsRolling(false);

        if (finalVal === 6) {
          setRollMsg('🎉 ROLLED A 6! TOKEN MOVES OUT OF YARD!');
          setPawnPos(0);
        } else {
          setRollMsg(`Advanced token ${finalVal} steps forward!`);
          setPawnPos((prev) => (prev + finalVal) % 52);
        }

        const colors: ('red' | 'green' | 'yellow' | 'blue')[] = ['red', 'green', 'yellow', 'blue'];
        setActiveColor(colors[Math.floor(Math.random() * colors.length)]);
      }
    }, 60);
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '420px',
        margin: '0 auto',
        background: 'linear-gradient(150deg, rgba(20,35,50,0.95), rgba(10,20,32,0.98))',
        border: '2px solid rgba(45,212,191,0.4)',
        borderRadius: '1.5rem',
        padding: '1.5rem',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        position: 'relative'
      }}
    >
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#2dd4bf', background: 'rgba(45,212,191,0.15)', padding: '0.3rem 0.8rem', borderRadius: '8px' }}>
          👑 LUDO KINGDOM ROLLING DICE
        </span>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Real 3D Physics</span>
      </div>

      {/* 3D ROLLING DIE CONTAINER */}
      <div style={{ position: 'relative', margin: '0.8rem 0' }}>
        <button
          type="button"
          onClick={rollDiceEffect}
          disabled={isRolling}
          style={{
            width: '120px',
            height: '120px',
            background: `linear-gradient(135deg, ${colorVar[activeColor]}, #0f172a)`,
            border: '3px solid #ffffff',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: `0 15px 35px ${colorVar[activeColor]}66`,
            transform: isRolling ? 'rotate(360deg) scale(1.1)' : 'rotate(-5deg)',
            transition: 'transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
            outline: 'none'
          }}
        >
          <span style={{ fontSize: '3.5rem', fontWeight: 800, color: '#ffffff', fontFamily: 'Fredoka, sans-serif', textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
            {diceVal}
          </span>
          <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>
            {isRolling ? 'ROLLING...' : 'TAP TO ROLL'}
          </span>
        </button>
      </div>

      {/* LIVE ROLL STATUS MESSAGE */}
      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 1.2rem', borderRadius: '12px', textAlign: 'center', width: '100%' }}>
        <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 'bold', color: activeColor === 'yellow' ? '#f59e0b' : colorVar[activeColor] }}>
          {rollMsg}
        </p>
      </div>

      {/* MINI LUDO TRACK PREVIEW */}
      <div style={{ width: '100%', background: 'rgba(15,23,42,0.9)', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
          <span>Yard Tokens</span>
          <span>Track Pos: #{pawnPos}</span>
        </div>
        <div style={{ width: '100%', height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
          <div style={{ width: `${((pawnPos + 1) / 52) * 100}%`, height: '100%', background: colorVar[activeColor], transition: 'width 0.3s ease' }} />
        </div>
      </div>
    </div>
  );
}

interface Token {
  id: number;
  color: 'red' | 'green' | 'yellow' | 'blue';
  pos: number;
  inYard: boolean;
  isHome: boolean;
}

interface PlayerSlot {
  id: string;
  name: string;
  color: 'red' | 'green' | 'yellow' | 'blue';
  emoji: string;
  isBot: boolean;
  isReady: boolean;
  connected?: boolean;
  disconnectDeadline?: number;
}

const COLOR_CONFIG = {
  red: { name: 'Red 🔴', color: '#ef4444', emoji: '🔴', startPos: 0 },
  green: { name: 'Green 🟩', color: '#10b981', emoji: '🟩', startPos: 13 },
  blue: { name: 'Blue 🔵', color: '#3b82f6', emoji: '🔵', startPos: 26 },
  yellow: { name: 'Yellow 🟡', color: '#f59e0b', emoji: '🟡', startPos: 39 }
};

export const getColorConfig = (c?: string) => {
  if (c && c in COLOR_CONFIG) return COLOR_CONFIG[c as keyof typeof COLOR_CONFIG];
  return COLOR_CONFIG.red;
};

const SAFE_SPOTS = [0, 8, 13, 21, 26, 34, 39, 47];

export const LUDO_PATH = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 7], [0, 8], [1, 8], [2, 8], [3, 8],
  [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], [7, 14], [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8],
  [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2],
  [8, 1], [8, 0], [7, 0], [6, 0]
];
export const LUDO_PATH_MAP = new Map(LUDO_PATH.map((rc, i) => [`${rc[0]},${rc[1]}`, i]));
export const LUDO_START_INDEX: Record<string, number> = { red: 0, green: 13, blue: 26, yellow: 39 };
export const LUDO_SAFE_INDEXES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
export const LUDO_YARD_ORIGIN: Record<string, [number, number]> = {
  red: [0, 0],
  green: [0, 9],
  blue: [9, 9],
  yellow: [9, 0]
};
export const LUDO_YARD_OFFSETS: [number, number][] = [[1.6, 1.6], [1.6, 3.7], [3.7, 1.6], [3.7, 3.7]];
export const LUDO_HOME_STRETCH: Record<string, [number, number][]> = {
  red:   [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  blue:  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  yellow: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]
};
export const LUDO_FINISH_XY: Record<string, [number, number]> = {
  red: [7, 6.4],
  green: [6.4, 7],
  blue: [7, 7.6],
  yellow: [7.6, 7]
};
export const LUDO_PIP_LAYOUT: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9]
};

export function getLudoPos(t: Token, tokenIdx: number): [number, number] {
  if (t.inYard || t.pos === -1) {
    const origin = LUDO_YARD_ORIGIN[t.color] || [0, 0];
    const offset = LUDO_YARD_OFFSETS[tokenIdx % 4] || [1.6, 1.6];
    return [origin[0] + offset[0], origin[1] + offset[1]];
  }
  if (t.pos <= 50) {
    const start = LUDO_START_INDEX[t.color] || 0;
    const idx = (start + t.pos) % 52;
    const rc = LUDO_PATH[idx] || [7, 7];
    const dx = [-1, 1, -1, 1][tokenIdx % 4] * 0.16;
    const dy = [-1, -1, 1, 1][tokenIdx % 4] * 0.16;
    return [rc[0] + dy, rc[1] + dx];
  }
  if (t.pos <= 55) {
    const stretch = LUDO_HOME_STRETCH[t.color] || [];
    const rc = stretch[t.pos - 51] || [7, 7];
    const dx = [-1, 1, -1, 1][tokenIdx % 4] * 0.16;
    const dy = [-1, -1, 1, 1][tokenIdx % 4] * 0.16;
    return [rc[0] + dy, rc[1] + dx];
  }
  const rc = LUDO_FINISH_XY[t.color] || [7, 7];
  return [rc[0] + [-1, 1, -1, 1][tokenIdx % 4] * 0.08, rc[1] + [-1, -1, 1, 1][tokenIdx % 4] * 0.08];
}

export interface LudoGameProps {
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

export function LudoGame({ user, ensureGuest, snapshot, socket, roomMeta, serverStats, onLeaveRoom, onSendEmote, onInGameChange }: LudoGameProps) {
  const navigate = useNavigate();

  // Navigation & Flow State based on LUDO KINGDOM Architecture Diagram
  const [view, setView] = useState<'home' | 'quick_match' | 'private_lobby' | 'waiting_room' | 'board'>(snapshot ? 'board' : 'home');
  const [howModal, setHowModal] = useState(false);
  const [resultModal, setResultModal] = useState(false);
  const [confirmLeaveModal, setConfirmLeaveModal] = useState(false);
  const [showLudoChat, setShowLudoChat] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeEmotes, setActiveEmotes] = useState<EmoteBroadcastEvent[]>([]);

  useEffect(() => {
    onInGameChange?.(view === 'board');
    return () => {
      onInGameChange?.(false);
    };
  }, [view, onInGameChange]);

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
    const emoteEvent: EmoteBroadcastEvent = {
      senderId: user?.id || 'self',
      senderUsername: user?.username || 'You',
      emote: data.emote,
      phrase: data.phrase,
      sfx: data.sfx,
      timestamp: Date.now()
    };
    // Always trigger visual overlay for the sender immediately
    setActiveEmotes((prev) => [...prev.slice(-9), emoteEvent]);

    if (onSendEmote) {
      onSendEmote(data);
    } else if (socket && snapshot?.roomId) {
      socket.emit('room:emote', data);
    }

    // In offline or bot match, simulate friendly bot reactions
    if (!snapshot || matchType === 'bot') {
      setTimeout(() => {
        const botSlots = slots.filter((s) => s.isBot);
        if (botSlots.length > 0 && Math.random() < 0.65) {
          const chosenBot = botSlots[Math.floor(Math.random() * botSlots.length)];
          const botEmotes = ['🔥', '😂', '🎉', '👏', '👑', '💀'];
          const botPhrases = ['Nice move! 👏', 'Watch this! 🎯', 'GG! 🏆', 'Good game! 🤝', 'Roll a 6! 🎲'];
          const usePhrase = Math.random() < 0.45;
          const botEvent: EmoteBroadcastEvent = {
            senderId: chosenBot.id,
            senderUsername: chosenBot.name,
            emote: !usePhrase ? botEmotes[Math.floor(Math.random() * botEmotes.length)] : undefined,
            phrase: usePhrase ? botPhrases[Math.floor(Math.random() * botPhrases.length)] : undefined,
            timestamp: Date.now()
          };
          setActiveEmotes((prev) => [...prev.slice(-9), botEvent]);
        }
      }, 1100 + Math.random() * 800);
    }
  };
  const [localChat, setLocalChat] = useState<ChatMessageItem[]>([
    {
      id: 'welcome_ludo',
      playerId: 'system',
      username: 'Ludo Arena',
      text: 'Welcome to Ludo Arena! Send messages or tap quick presets.',
      createdAt: Date.now() - 5000,
      reactions: {}
    }
  ]);

  const chatMessages: ChatMessageItem[] = (snapshot?.chat && snapshot.chat.length > 0) ? snapshot.chat : localChat;

  const handleSendChat = (text: string) => {
    if (socket && snapshot?.roomId) {
      socket.emit('chat:send', { text });
    } else {
      const newMsg: ChatMessageItem = {
        id: `ludo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        playerId: user?.id || 'player-self',
        username: user?.username || 'You',
        text,
        createdAt: Date.now(),
        reactions: {}
      };
      setLocalChat((prev) => [...prev, newMsg]);

      // If playing with bots, simulate a responsive bot reaction
      if (matchType === 'bot' || !snapshot) {
        setTimeout(() => {
          const botReplies = [
            'Good luck! 🍀',
            'Nice move! 🔥',
            'Roll a 6! 🎲',
            'GG! 🏆',
            'Oops! 😅',
            'Hurry up! ⏳',
            'Well played! 👏'
          ];
          const botSlots = slots.filter((s) => s.isBot);
          const chosenBot = botSlots.length > 0
            ? botSlots[Math.floor(Math.random() * botSlots.length)]
            : { id: 'bot-1', name: 'Ludo Bot' };
          const replyText = botReplies[Math.floor(Math.random() * botReplies.length)];
          setLocalChat((prev) => [
            ...prev,
            {
              id: `bot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              playerId: chosenBot.id,
              username: chosenBot.name,
              text: replyText,
              createdAt: Date.now(),
              reactions: {}
            }
          ]);
        }, 1200 + Math.random() * 800);
      }
    }
  };

  const handleReactChat = (messageId: string, emoji: string) => {
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

  // Match Config State
  const [matchType, setMatchType] = useState<'quick' | 'private' | 'bot'>('quick');
  const [playerMode, setPlayerMode] = useState<2 | 4>(4);
  const [tokenCount, setTokenCount] = useState<2 | 4>(4);
  const [userColor, setUserColor] = useState<'red' | 'green' | 'blue' | 'yellow'>('red');
  const [roomCode4, setRoomCode4] = useState<string>('');
  const [joinInputCode, setJoinInputCode] = useState<string>('');
  const [codeError, setCodeError] = useState<string>('');
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [privateRoomError, setPrivateRoomError] = useState<string>('');

  // Waiting Room State
  const [slots, setSlots] = useState<PlayerSlot[]>([]);

  // Board Game State
  const [turn, setTurn] = useState<'red' | 'green' | 'blue' | 'yellow'>('red');
  const [diceVal, setDiceVal] = useState<number | null>(null);
  const [lastRollVal, setLastRollVal] = useState<number | null>(null);
  const [showRollHighlight, setShowRollHighlight] = useState<boolean>(false);
  const [isRolling, setIsRolling] = useState(false);
  const [mustMove, setMustMove] = useState(false);
  const [consecutiveSixes, setConsecutiveSixes] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [rankings, setRankings] = useState<PlayerSlot[]>([]);

  const [tokens, setTokens] = useState<Token[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [localTurnDeadline, setLocalTurnDeadline] = useState<number>(Date.now() + 15000);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  // Reset turn deadline whenever turn changes or game starts
  useEffect(() => {
    if (view === 'board' && !winner) {
      setLocalTurnDeadline(Date.now() + 15000);
    }
  }, [turn, view, winner]);

  // Also reset timer after rolling if tokens need to be moved
  useEffect(() => {
    if (mustMove && view === 'board' && !winner) {
      setLocalTurnDeadline(Date.now() + 15000);
    }
  }, [mustMove, view, winner]);

  const activeDeadline = snapshot?.turnDeadline || localTurnDeadline;
  const secondsRemaining = Math.max(0, Math.ceil((activeDeadline - now) / 1000));
  const isTimerUrgent = secondsRemaining <= 5 && secondsRemaining > 0;

  // Initialize and synchronize state when entered from custom room snapshot
  useEffect(() => {
    if (snapshot) {
      setView('board');
      const playerList = snapshot.players || [];
      const fallbackColors: ('red' | 'green' | 'yellow' | 'blue')[] = ['red', 'green', 'yellow', 'blue'];
      const playerSlots: PlayerSlot[] = playerList.map((p: any, idx: number) => {
        const col: 'red' | 'green' | 'yellow' | 'blue' = p.ludoColor || fallbackColors[idx % 4];
        return {
          id: p.id,
          name: p.username || (p.isBot ? `Bot ${idx + 1}` : `Player ${idx + 1}`),
          color: col,
          emoji: getColorConfig(col).emoji,
          isBot: Boolean(p.isBot),
          isReady: Boolean(p.ready),
          connected: p.connected,
          disconnectDeadline: p.disconnectDeadline
        };
      });

      if (playerSlots.length > 0) {
        setSlots(playerSlots);
        const myPlayer = playerList.find((p: any) => p.isYou);
        const myCol = myPlayer?.ludoColor || playerSlots[0].color;
        setUserColor(myCol);

        if (snapshot.ludoState) {
          const ls = snapshot.ludoState;
          if (ls.turnColor) setTurn(ls.turnColor);
          if (ls.dice !== undefined && ls.dice !== null) setDiceVal(ls.dice);
          setMustMove(ls.phase === 'awaiting-choice');

          if (ls.tokens) {
            const synced: Token[] = [];
            let count = 0;
            for (const c of ['red', 'green', 'yellow', 'blue'] as const) {
              const tokList = ls.tokens[c] || [];
              for (let i = 0; i < 4; i++) {
                const sTok = tokList[i];
                const pos = sTok ? sTok.pos : -1;
                synced.push({
                  id: count++,
                  color: c,
                  pos: pos,
                  inYard: pos === -1,
                  isHome: pos >= 56
                });
              }
            }
            setTokens(synced);
          }
        } else {
          setTokens((prev) => {
            if (prev.length > 0) return prev;
            const initialTokens: Token[] = [];
            playerSlots.forEach((s) => {
              for (let i = 0; i < 4; i++) {
                initialTokens.push({
                  id: initialTokens.length,
                  color: s.color,
                  pos: -1,
                  inYard: true,
                  isHome: false
                });
              }
            });
            return initialTokens;
          });
          setTurn((prev) => (prev && playerSlots.some((s) => s.color === prev) ? prev : playerSlots[0].color));
        }
      }
    }
  }, [snapshot]);

  // Real-time stats
  const [lobbyRooms, setLobbyRooms] = useState<RoomMeta[]>([]);
  const [leaderboardPlayers, setLeaderboardPlayers] = useState<{ id: string; username: string; wins: number; losses?: number; rating: number }[]>([]);
  const [ping, setPing] = useState<number>(32);

  const fetchStats = async () => {
    const startTime = Date.now();
    try {
      const [lRes, lbRes] = await Promise.all([
        api.lobby().catch(() => ({ rooms: [] })),
        api.leaderboard().catch(() => ({ players: [] }))
      ]);
      setLobbyRooms(lRes.rooms || []);
      setLeaderboardPlayers(lbRes.players || []);
      setPing(Date.now() - startTime);
    } catch {}
  };

  useEffect(() => {
    void fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const addLog = (msg: string) => setLog((prev) => [msg, ...prev.slice(0, 7)]);

  // 1. Quick Match Handler (Connects to Live Public Room or Creates One)
  const handleQuickMatch = async (mode: 2 | 4, e?: React.MouseEvent) => {
    e?.preventDefault();
    try {
      await ensureGuest?.();
      const lobby = await api.lobby();
      const openRoom = lobby.rooms?.find(
        (r) => r.gameType === 'ludo' && !r.isPrivate && r.players < (r.maxPlayers || mode)
      );
      if (openRoom) {
        navigate(`/room/${openRoom.code}`);
        return;
      }
      const res = await api.createRoom({
        gameType: 'ludo',
        isPrivate: false,
        maxPlayers: mode,
        botCount: 0
      });
      navigate(`/room/${res.room.code}`);
    } catch (err: any) {
      console.error('Quick match fallback to local match:', err);
      setMatchType('quick');
      setPlayerMode(mode);
      const newSlots = setupSlots('quick', mode, userColor);
      initBoardGame(newSlots);
    }
  };

  // 2. Create Private Room Handler
  const handleCreatePrivateRoom = (e?: React.MouseEvent) => {
    e?.preventDefault();
    void ensureGuest?.().catch(() => {});
    setMatchType('private');
    if (!roomCode4) {
      setRoomCode4(Math.floor(1000 + Math.random() * 9000).toString());
    }
    setPrivateRoomError('');
    setView('private_lobby');
  };

  // 3. Create Real Authoritative Room on Server with Custom Code & Zero Initial Bots
  const handleProceedCreateRealRoom = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    const cleanCode = roomCode4.trim().toUpperCase();
    if (cleanCode && (cleanCode.length < 4 || cleanCode.length > 6 || !/^[A-Z0-9]{4,6}$/.test(cleanCode))) {
      setPrivateRoomError('Room code must be 4 to 6 alphanumeric characters (A-Z, 0-9).');
      return;
    }
    try {
      setIsCreatingRoom(true);
      setPrivateRoomError('');
      await ensureGuest?.();
      const res = await api.createRoom({
        gameType: 'ludo',
        isPrivate: true,
        customCode: cleanCode || undefined,
        maxPlayers: 4,
        botCount: 0 // Zero bots! Real players will join this room.
      });
      navigate(`/room/${res.room.code}`);
    } catch (err: any) {
      setPrivateRoomError(err?.message || 'Failed to create room with this code.');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // 4. Play vs Bot (Offline Practice Mode)
  const handlePlayVsBot = (e?: React.MouseEvent) => {
    e?.preventDefault();
    void ensureGuest?.().catch(() => {});
    setMatchType('bot');
    setPlayerMode(4);
    const newSlots = setupSlots('bot', 4, userColor);
    initBoardGame(newSlots);
  };

  // 5. Validate and Join Real Room with 4-6 char code
  const handleValidateJoinCode = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    const cleanCode = joinInputCode.trim().toUpperCase();
    if (cleanCode.length < 4 || cleanCode.length > 6 || !/^[A-Z0-9]{4,6}$/.test(cleanCode)) {
      setCodeError('Please enter a valid 4 to 6 character room code (e.g. LUDO1, 4829)');
      return;
    }
    try {
      await ensureGuest?.();
      navigate(`/room/${cleanCode}`);
    } catch (err: any) {
      setCodeError(err?.message || 'Failed to join room.');
    }
  };

  // Setup Player Slots for Waiting Room
  const setupSlots = (type: 'quick' | 'private' | 'bot', count: number, myColor: 'red' | 'green' | 'blue' | 'yellow') => {
    const allColors: ('red' | 'green' | 'blue' | 'yellow')[] = ['red', 'green', 'blue', 'yellow'];
    const otherColors = allColors.filter((c) => c !== myColor);

    const newSlots: PlayerSlot[] = [
      {
        id: user?.id || 'u1',
        name: user?.username || 'You',
        color: myColor,
        emoji: getColorConfig(myColor).emoji,
        isBot: false,
        isReady: true
      }
    ];

    const botNames = ['Bot Viper', 'Bot Cobra', 'Bot Anaconda'];
    const botsToAdd = count === 2 ? 1 : 3;

    for (let i = 0; i < botsToAdd; i++) {
      const col = otherColors[i];
      newSlots.push({
        id: `bot_${i}`,
        name: botNames[i] || `Bot ${i + 1}`,
        color: col,
        emoji: getColorConfig(col).emoji,
        isBot: true,
        isReady: true
      });
    }

    setSlots(newSlots);
    return newSlots;
  };

  // Launch Match from Waiting Room
  const launchMatchFromWaitingRoom = () => {
    initBoardGame(slots);
  };

  // Init Board Game State
  const initBoardGame = (overrideSlots?: PlayerSlot[]) => {
    const initialTokens: Token[] = [];
    const activeSlots = overrideSlots || (slots.length ? slots : []);
    const colorsInGame = activeSlots.length ? activeSlots.map((s) => s.color) : (['red', 'green', 'blue', 'yellow'] as const);

    colorsInGame.forEach((c) => {
      for (let i = 0; i < tokenCount; i++) {
        initialTokens.push({
          id: initialTokens.length,
          color: c,
          pos: -1,
          inYard: true,
          isHome: false
        });
      }
    });

    setTokens(initialTokens);
    setTurn(userColor || 'red');
    setDiceVal(null);
    setIsRolling(false);
    setMustMove(false);
    setConsecutiveSixes(0);
    setWinner(null);
    setResultModal(false);
    setLog(['🏁 Match Started! Roll a 6 to bring a token out onto the board.']);
    setView('board');
  };

  const handleRollDice = () => {
    if (isRolling || mustMove || !!winner) return;

    if (socket && snapshot?.ludoState) {
      // Authoritative backend dice roll
      setIsRolling(true);
      setShowRollHighlight(true);
      socket.emit('ludo:roll');
      setTimeout(() => setIsRolling(false), 450);
      setTimeout(() => setShowRollHighlight(false), 2000);
      return;
    }

    setIsRolling(true);
    let count = 0;
    const currentTurn = turn || userColor || 'red';
    const interval = setInterval(() => {
      setDiceVal(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count > 6) {
        clearInterval(interval);
        const finalVal = Math.floor(Math.random() * 6) + 1;
        setDiceVal(finalVal);
        setLastRollVal(finalVal);
        setIsRolling(false);
        setShowRollHighlight(true);
        setTimeout(() => setShowRollHighlight(false), 2000); // 2 seconds highlight

        const config = getColorConfig(currentTurn);
        const nextSixes = finalVal === 6 ? consecutiveSixes + 1 : 0;
        setConsecutiveSixes(nextSixes);

        // Three consecutive 6s rule: forfeit turn immediately
        if (finalVal === 6 && nextSixes >= 3) {
          addLog(`⚠️ ${config.emoji} ${config.name} rolled three 6s in a row — turn forfeited!`);
          setConsecutiveSixes(0);
          setTimeout(() => nextTurn(false), 1600); // Show rolled 6 for 1.6s
          return;
        }

        const myTokens = tokens.filter((t) => t.color === currentTurn && !t.isHome);
        const hasValidMove = myTokens.some((t) => (t.inYard && finalVal === 6) || (!t.inYard && t.pos + finalVal <= 56));

        if (hasValidMove) {
          setMustMove(true);
          addLog(`${config.emoji} ${config.name} rolled a ${finalVal}!`);
        } else {
          addLog(`${config.emoji} Rolled a ${finalVal} (No moves possible).`);
          // Show the rolled number for 1.6s before proceeding to next player's turn
          setTimeout(() => {
            nextTurn(finalVal === 6);
          }, 1600);
        }
      }
    }, 60);
  };

  const nextTurn = (extraTurn = false) => {
    setMustMove(false);
    setDiceVal(null);

    if (!extraTurn) {
      setConsecutiveSixes(0);
      const activeColors: ('red' | 'green' | 'blue' | 'yellow')[] =
        slots.length > 0 ? (slots.map((s) => s.color) as ('red' | 'green' | 'blue' | 'yellow')[]) : ['red', 'green', 'blue', 'yellow'];
      const idx = activeColors.indexOf(turn);
      const nextIdx = idx >= 0 ? (idx + 1) % activeColors.length : 0;
      const nextColor = activeColors[nextIdx] || 'red';
      setTurn(nextColor);
    }
  };

  useEffect(() => {
    if (view !== 'board' || winner) return;
    const currentSlot = slots.find((s) => s.color === turn);
    if (currentSlot?.isBot && !isRolling) {
      if (diceVal === null && !mustMove) {
        const timer = setTimeout(handleRollDice, 800);
        return () => clearTimeout(timer);
      } else if (mustMove && diceVal !== null) {
        // Wait 1.5s after bot rolls so the player clearly sees the dice number before the bot moves
        const timer = setTimeout(() => {
          const myTokens = tokens.filter((t) => t.color === turn && !t.isHome);
          const movable = myTokens.filter((t) => (t.inYard && diceVal === 6) || (!t.inYard && t.pos + diceVal <= 56));
          if (movable.length > 0) {
            // 1. Move to home if exact 56
            const homeMove = movable.find((t) => !t.inYard && t.pos + diceVal === 56);
            if (homeMove) {
              moveToken(homeMove);
              return;
            }
            // 2. Capture move on non-safe tiles
            const captureMove = movable.find((t) => {
              if (t.inYard) return false;
              const newPos = t.pos + diceVal;
              if (newPos > 50) return false;
              const myStart = LUDO_START_INDEX[turn] || 0;
              const trackIdx = (myStart + newPos) % 52;
              if (LUDO_SAFE_INDEXES.has(trackIdx)) return false;
              return tokens.some((opp) => {
                if (opp.color === turn || opp.inYard || opp.isHome || opp.pos > 50) return false;
                const oppStart = LUDO_START_INDEX[opp.color] || 0;
                return (oppStart + opp.pos) % 52 === trackIdx;
              });
            });
            if (captureMove) {
              moveToken(captureMove);
              return;
            }
            // 3. Bring out from yard if 6
            if (diceVal === 6) {
              const yardToken = movable.find((t) => t.inYard);
              if (yardToken) {
                moveToken(yardToken);
                return;
              }
            }
            // 4. Move most advanced token
            const chosen = [...movable].sort((a, b) => b.pos - a.pos)[0];
            moveToken(chosen);
          } else {
            nextTurn(false);
          }
        }, 1500); // 1.5 seconds visible roll pause
        return () => clearTimeout(timer);
      }
    }
  }, [view, turn, diceVal, mustMove, isRolling, winner, tokens]);

  // Auto-play / Timeout execution when turn timer hits 0 in local / offline play
  useEffect(() => {
    if (view !== 'board' || winner || snapshot?.ludoState) return;
    if (secondsRemaining === 0 && !isRolling) {
      const currentConfig = getColorConfig(turn);
      if (diceVal === null && !mustMove) {
        addLog(`⏰ Time expired for ${currentConfig.name}! Auto-rolling die...`);
        handleRollDice();
      } else if (mustMove && diceVal !== null) {
        const myTokens = tokens.filter((t) => t.color === turn && !t.isHome);
        const movable = myTokens.filter((t) => (t.inYard && diceVal === 6) || (!t.inYard && t.pos + diceVal <= 56));
        if (movable.length > 0) {
          const chosen = [...movable].sort((a, b) => b.pos - a.pos)[0];
          addLog(`⏰ Time expired! Auto-moved token for ${currentConfig.name}.`);
          moveToken(chosen);
        } else {
          nextTurn(false);
        }
      }
    }
  }, [secondsRemaining, view, winner, turn, diceVal, mustMove, isRolling, snapshot]);

  const moveToken = (token: Token) => {
    const currentTurn = turn || userColor || 'red';
    if (token.color !== currentTurn || !mustMove || diceVal === null) return;
    if (token.inYard && diceVal !== 6) return;
    if (!token.inYard && token.pos + diceVal > 56) return;

    if (socket && snapshot?.ludoState) {
      // Authoritative backend token move
      const tokenId = `${token.color}-${token.id % 4}`;
      socket.emit('ludo:move', { tokenId });
      return;
    }

    let newTokens = [...tokens];
    let extraTurn = diceVal === 6;
    let captured = false;
    let reachedHome = false;
    const currentConfig = getColorConfig(currentTurn);

    if (token.inYard && diceVal === 6) {
      newTokens = newTokens.map((t) => (t.id === token.id ? { ...t, inYard: false, pos: 0 } : t));
      addLog(`${currentConfig.emoji} Moved token out of yard onto the start tile! 🚀`);
    } else {
      const newPos = token.pos + diceVal;
      if (newPos > 56) return; // exact landing required

      if (newPos === 56) {
        newTokens = newTokens.map((t) => (t.id === token.id ? { ...t, isHome: true, pos: 56 } : t));
        addLog(`🎉 ${currentConfig.emoji} Token reached the HOME triangle!`);
        reachedHome = true;
        extraTurn = true;
      } else {
        // Check capturing on common track (0 to 50)
        if (newPos <= 50) {
          const myStart = LUDO_START_INDEX[currentTurn] || 0;
          const trackIdx = (myStart + newPos) % 52;

          if (!LUDO_SAFE_INDEXES.has(trackIdx)) {
            const opponentsOnSpot = newTokens.filter((t) => {
              if (t.color === currentTurn || t.inYard || t.isHome || t.pos > 50) return false;
              const oppStart = LUDO_START_INDEX[t.color] || 0;
              return (oppStart + t.pos) % 52 === trackIdx;
            });

            if (opponentsOnSpot.length > 0) {
              const oppIds = new Set(opponentsOnSpot.map((o) => o.id));
              newTokens = newTokens.map((t) => (oppIds.has(t.id) ? { ...t, inYard: true, pos: -1 } : t));
              captured = true;
              extraTurn = true;
              opponentsOnSpot.forEach((opp) => {
                const oppConfig = getColorConfig(opp.color);
                addLog(`⚔️ ${currentConfig.emoji} Captured ${oppConfig.name}'s token and sent it home! 💥`);
              });
            }
          }
        }
        newTokens = newTokens.map((t) => (t.id === token.id ? { ...t, pos: newPos } : t));
      }
    }

    setTokens(newTokens);
    const homeCount = newTokens.filter((t) => t.color === currentTurn && t.isHome).length;
    if (homeCount === tokenCount) {
      setWinner(currentConfig.name);
      addLog(`🏆 ${currentConfig.name} WON LUDO KINGDOM!`);

      const sortedRankings = [...slots].sort((a, b) => {
        const aHome = newTokens.filter((t) => t.color === a.color && t.isHome).length;
        const bHome = newTokens.filter((t) => t.color === b.color && t.isHome).length;
        return bHome - aHome;
      });
      setRankings(sortedRankings);
      setResultModal(true);
    } else {
      if (extraTurn) {
        if (captured) {
          addLog(`🎁 Bonus roll awarded for capturing!`);
        } else if (reachedHome) {
          addLog(`🎁 Bonus roll awarded for reaching home!`);
        }
      }
      nextTurn(extraTurn);
    }
  };

  // ----------------------------------------------------
  // VIEW 1: LUDO KINGDOM LANDING PAGE
  // ----------------------------------------------------
  if (view === 'home') {
    return (
      <div className="landing-v2-container">
        {/* HERO SECTION */}
        <section className="hero">
          <div className="hero-content">
            <div className="hero-badge">👑 MULTIPLAYER ARENA</div>
            <h1>
              Roll the die. <span>Rule the Kingdom.</span>
            </h1>
            <p>
              The definitive 4-player online Ludo experience. Instant matchmaking, private 4-digit rooms, offline bot battles, and real-time multiplayer board gameplay.
            </p>

            {/* ARCHITECTURE ACTIONS */}
            <div className="cta-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem' }}>
              <button type="button" className="btn btn-primary" onClick={() => handleQuickMatch(4)}>
                ⚡ Quick Match (4P)
              </button>
              <button type="button" className="btn btn-primary" onClick={() => handleQuickMatch(2)}>
                ⚔️ 1v1 Match (2P)
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleCreatePrivateRoom}>
                🔒 Create Private Room
              </button>
              <button type="button" className="btn btn-secondary" onClick={handlePlayVsBot}>
                🤖 Play vs Bot (Offline)
              </button>
            </div>

            <div className="cta-row tertiary-row" style={{ marginTop: '0.8rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setHowModal(true)}>
                📖 How to Play Guide
              </button>
            </div>

            {/* ROOM CODE JOIN BAR */}
            <div className="room-code-row" style={{ marginTop: '1.2rem' }}>
              <input
                type="text"
                className="room-code-input mono"
                value={joinInputCode}
                onChange={(e) => {
                  setJoinInputCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
                  setCodeError('');
                }}
                placeholder="ROOM CODE (4-6 CHARS)"
                maxLength={6}
                autoComplete="off"
                aria-label="Room Code"
              />
              <button
                type="button"
                className="btn btn-secondary"
                disabled={joinInputCode.length < 4}
                onClick={handleValidateJoinCode}
              >
                Join Room
              </button>
            </div>
            {codeError && <p className="error margin-top-sm">{codeError}</p>}
          </div>

          {/* 3D HERO DISPLAY */}
          <div>
            <InteractiveRollingDiceWidget />
          </div>
        </section>

        {/* MODES GRID */}
        <section id="modes">
          <div className="wrap">
            <div className="section-head">
              <h2>Select your game table mode.</h2>
            </div>
            <div className="modes-grid">
              <div className="mode-card" style={{ '--mode-color': 'var(--green)' } as React.CSSProperties} onClick={() => handleQuickMatch(4)}>
                <span className="tag">01 · QUICK MATCH</span>
                <h3>4-Player Lobby</h3>
                <p>Instant matchmaking with 4 real players or smart bot fill-ins.</p>
                <span className="go">Play 4P Match <span className="arrow">→</span></span>
              </div>

              <div className="mode-card" style={{ '--mode-color': 'var(--yellow)' } as React.CSSProperties} onClick={() => handleQuickMatch(2)}>
                <span className="tag">02 · 1v1 DUEL</span>
                <h3>2-Player Lobby</h3>
                <p>Head-to-head fast duel on the 15x15 board.</p>
                <span className="go">Play 1v1 Duel <span className="arrow">→</span></span>
              </div>

              <div className="mode-card" style={{ '--mode-color': 'var(--blue)' } as React.CSSProperties} onClick={handleCreatePrivateRoom}>
                <span className="tag">03 · PRIVATE ROOM</span>
                <h3>Invite Friends (4-Digit)</h3>
                <p>Create a private room, choose token rules, and share 4-digit code.</p>
                <span className="go">Create Room <span className="arrow">→</span></span>
              </div>

              <div className="mode-card" style={{ '--mode-color': 'var(--red)' } as React.CSSProperties} onClick={handlePlayVsBot}>
                <span className="tag">04 · OFFLINE BOT</span>
                <h3>Bot Challenge</h3>
                <p>Play offline immediately against 3 smart AI bots.</p>
                <span className="go">Play Offline <span className="arrow">→</span></span>
              </div>
            </div>
          </div>
        </section>

        {/* HOW TO PLAY SECTION */}
        <section className="how" id="how">
          <div className="wrap">
            <div className="section-head">
              <h2>Four steps to victory.</h2>
              <p>New to Ludo Kingdom? Learn how to roll, advance, capture, and win in seconds.</p>
            </div>
            <div className="steps">
              <div className="step" style={{ '--step-color': 'var(--red)' } as React.CSSProperties}>
                <div className="n">01</div>
                <h3>Roll the die</h3>
                <p>Roll a 6 on your turn to spawn a colored token out of your home yard onto the start tile.</p>
              </div>

              <div className="step" style={{ '--step-color': 'var(--yellow)' } as React.CSSProperties}>
                <div className="n">02</div>
                <h3>Move your token</h3>
                <p>Advance clockwise around the 52-tile perimeter track matching your die roll numbers.</p>
              </div>

              <div className="step" style={{ '--step-color': 'var(--green)' } as React.CSSProperties}>
                <div className="n">03</div>
                <h3>Capture opponents</h3>
                <p>Land directly on an opponent's token on non-star tiles to knock it back to their yard!</p>
              </div>

              <div className="step" style={{ '--step-color': 'var(--blue)' } as React.CSSProperties}>
                <div className="n">04</div>
                <h3>Reach Home</h3>
                <p>Guide all 4 of your tokens into the central home triangle to claim victory for your team!</p>
              </div>
            </div>
          </div>
        </section>

        {/* LIVE ROOM & LEADERBOARD STATS */}
        <section id="room">
          <div className="wrap">
            <div className="section-head">
              <h2>A live board, day or night.</h2>
              <p>Real seats, filling up in real time. Climb the board and your name shows up here too.</p>
            </div>
            <div className="room-grid">
              <div className="quickstats">
                <div className="qstat">
                  <div className="big" style={{ color: 'var(--red)' }}>{serverStats?.activeTables ?? lobbyRooms.length}</div>
                  <div className="lbl2">active tables</div>
                </div>
                <div className="qstat">
                  <div className="big" style={{ color: 'var(--yellow)' }}>{serverStats?.onlinePlayers ?? Math.max(1, lobbyRooms.reduce((a, r) => a + r.players, 0))}</div>
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
                    <span className="lb-name">{user?.username ?? 'LudoKing'}</span>
                    <span className="lb-points">1,000 pts</span>
                    <span className="lb-streak">▲ 0 wins</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <FeedbackSection user={user} gameTitle="Ludo Kingdom" accentColor="#3b82f6" defaultRolePlaceholder="Ludo Master" />

        {/* CTA BAND */}
        <section>
          <div className="wrap">
            <div className="ctaband" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.3) 0%, rgba(59,130,246,0.3) 100%)', border: '1px solid rgba(45,212,191,0.4)', borderRadius: '1.5rem', padding: '2.5rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '2.2rem', fontFamily: 'Fredoka, sans-serif', color: '#fff', margin: '0 0 0.5rem 0' }}>Your seat's open. Roll the die and find out.</h2>
                <p style={{ color: '#cbd5e1', margin: 0, maxWidth: '600px' }}>No account needed to try a match — sign in later to save your stats and climb the Ludo Kingdom leaderboard.</p>
              </div>
              <button type="button" className="btn btn-primary" onClick={() => handleQuickMatch(4)} style={{ padding: '0.9rem 1.8rem', fontSize: '1.05rem' }}>
                Play 4P Ludo Now →
              </button>
            </div>
          </div>
        </section>

        {/* HOW TO PLAY MODAL */}
        {howModal && (
          <div className="modal-backdrop" onClick={() => setHowModal(false)}>
            <div className="modal panel" onClick={(e) => e.stopPropagation()} style={{ background: '#0f172a', padding: '2rem', borderRadius: '1.5rem', border: '1.5px solid #2dd4bf', color: '#fff', maxWidth: '540px' }}>
              <button className="close" onClick={() => setHowModal(false)}>×</button>
              <h2 style={{ fontFamily: 'Fredoka, sans-serif', color: '#fbbf24', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>👑</span> Official Ludo Kingdom Rules
              </h2>
              <ul style={{ lineHeight: '1.8', color: '#cbd5e1', fontSize: '0.92rem', paddingLeft: '1.2rem' }}>
                <li><b>Starting a Token:</b> You must roll a <b>6</b> to bring a token out of your yard onto your start tile.</li>
                <li><b>Clockwise Movement:</b> Advance your pawn clockwise around the 52-tile perimeter track matching your die roll.</li>
                <li><b>Safe Star Squares:</b> The 4 starting spots and 4 star tiles (★) are safe. Multiple pawns can rest here without danger.</li>
                <li><b>Capturing Opponents:</b> Landing on an opponent's token on a normal tile knocks it back to their yard and awards you an <b>Extra Bonus Roll</b>!</li>
                <li><b>Home Run & Finish:</b> Enter your color's private home stretch. Landing in the central Home Triangle by exact roll awards an <b>Extra Bonus Roll</b>!</li>
                <li><b>Bonus on 6:</b> Rolling a 6 grants an extra roll. Rolling <b>three consecutive 6s</b> forfeits your turn immediately.</li>
                <li><b>Winning:</b> The first player to successfully guide all 4 tokens into the central Home Triangle wins!</li>
              </ul>
              <button type="button" className="btn btn-primary" onClick={() => setHowModal(false)} style={{ width: '100%', marginTop: '1.2rem', padding: '0.75rem' }}>
                Understood! Return to Game
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW 2: QUICK MATCH FINDING OPPONENTS
  // ----------------------------------------------------
  if (view === 'quick_match') {
    return (
      <div className="landing-v2-container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid #2dd4bf', borderRadius: '1.5rem', padding: '2.5rem', maxWidth: '480px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
          <div className="dice-spinning" style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎲</div>
          <h2 style={{ fontFamily: 'Fredoka, sans-serif', color: '#2dd4bf', margin: 0 }}>Finding Opponents...</h2>
          <p style={{ color: '#94a3b8', margin: '0.5rem 0 1.5rem 0' }}>Searching for {playerMode}P Ludo Kingdom players</p>

          <div style={{ background: 'rgba(30,41,59,0.8)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-around' }}>
            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>🔴 You (Connected)</span>
            <span style={{ color: '#94a3b8' }}>⏳ Matching...</span>
          </div>

          <div style={{ display: 'flex', gap: '0.8rem', width: '100%', marginTop: '1rem' }}>
            <button onClick={() => setView('home')} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button
              onClick={() => {
                const s = slots.length ? slots : setupSlots('quick', playerMode, userColor);
                initBoardGame(s);
              }}
              className="btn btn-primary"
              style={{ flex: 1.5 }}
            >
              Start Game Now ➔
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW 3: PRIVATE LOBBY (SETUP & INVITE)
  // ----------------------------------------------------
  if (view === 'private_lobby') {
    return (
      <div className="landing-v2-container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid #2dd4bf', borderRadius: '1.5rem', padding: '2rem', maxWidth: '520px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
          <h2 style={{ fontFamily: 'Fredoka, sans-serif', color: '#2dd4bf', textAlign: 'center', marginTop: 0 }}>🔒 Private Ludo Lobby Setup</h2>

          {privateRoomError && (
            <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
              {privateRoomError}
            </div>
          )}

          {/* CUSTOM ROOM CODE BOX */}
          <div style={{ background: 'rgba(45,212,191,0.12)', border: '1px dashed #2dd4bf', borderRadius: '12px', padding: '1.2rem', textAlign: 'center', margin: '1rem 0' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.4rem', fontWeight: 'bold' }}>
              CUSTOM ROOM CODE (4-6 CHARS):
            </span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <input
                type="text"
                value={roomCode4}
                onChange={(e) => {
                  setRoomCode4(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
                  setPrivateRoomError('');
                }}
                placeholder="e.g. LUDO1"
                maxLength={6}
                style={{
                  background: 'rgba(15,23,42,0.9)',
                  border: '2px solid #fbbf24',
                  borderRadius: '10px',
                  color: '#fbbf24',
                  fontSize: '2rem',
                  fontFamily: 'Space Mono, monospace',
                  fontWeight: 'bold',
                  letterSpacing: '4px',
                  textAlign: 'center',
                  padding: '0.3rem 0.6rem',
                  width: '200px',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setRoomCode4(Math.floor(1000 + Math.random() * 9000).toString());
                  setPrivateRoomError('');
                }}
                title="Generate Random Code"
                style={{ padding: '0.6rem 0.9rem', fontSize: '1.1rem' }}
              >
                🎲
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.8rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (roomCode4.trim()) {
                    navigator.clipboard.writeText(`${window.location.origin}/join/${roomCode4.trim().toUpperCase()}`);
                  }
                }}
                style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}
              >
                📋 Copy Invite Link
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: '0.5rem 0 0 0' }}>
              Friends join via this code or direct link. Real players will occupy the seats (0 bots added by default).
            </p>
          </div>

          {/* COLOR SELECTION */}
          <div style={{ margin: '1.2rem 0' }}>
            <label style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Select Your Preferred Pawn Color:</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {(['red', 'green', 'yellow', 'blue'] as const).map((col) => (
                <button
                  key={col}
                  onClick={() => setUserColor(col)}
                  style={{
                    background: COLOR_CONFIG[col].color,
                    border: userColor === col ? '3px solid #fff' : 'none',
                    borderRadius: '10px',
                    padding: '0.6rem',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {COLOR_CONFIG[col].emoji} {col.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.5rem' }}>
            <button onClick={() => setView('home')} className="btn btn-secondary" style={{ flex: 1 }}>Back</button>
            <button
              type="button"
              onClick={handleProceedCreateRealRoom}
              disabled={isCreatingRoom || roomCode4.trim().length < 4}
              className="btn btn-primary"
              style={{ flex: 2 }}
            >
              {isCreatingRoom ? '⏳ Creating Room...' : 'Create Room & Enter Lobby →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW 4: WAITING ROOM (CHOOSE COLOR & TOKENS)
  // ----------------------------------------------------
  if (view === 'waiting_room') {
    return (
      <div className="landing-v2-container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'rgba(15,23,42,0.95)', border: '1.5px solid #2dd4bf', borderRadius: '1.5rem', padding: '2rem', maxWidth: '580px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
          <h2 style={{ fontFamily: 'Fredoka, sans-serif', color: '#2dd4bf', margin: 0, textAlign: 'center' }}>🚪 Match Waiting Room</h2>
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', margin: '0.3rem 0 1.2rem 0' }}>
            Room Code: <strong style={{ color: '#fbbf24' }}>#{roomCode4 || 'QUICK-MATCH'}</strong> · {playerMode} Players · {tokenCount} Tokens
          </p>

          {/* PLAYER SLOTS LIST */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {slots.map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(30,41,59,0.8)', border: `1.5px solid ${s.color}`, padding: '0.8rem 1rem', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{s.emoji}</span>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.95rem' }}>{s.name} {s.isBot ? '🤖' : '👤'}</div>
                    <div style={{ color: s.color, fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 'bold' }}>{s.color} Team</div>
                  </div>
                </div>
                <span style={{ background: 'rgba(34,197,94,0.2)', color: '#86efac', padding: '0.3rem 0.7rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  READY ✓
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button type="button" onClick={(e) => { e.preventDefault(); setView('home'); }} className="btn btn-secondary" style={{ flex: 1 }}>Leave Room</button>
            <button type="button" onClick={(e) => { e.preventDefault(); launchMatchFromWaitingRoom(); }} className="btn btn-primary" style={{ flex: 2, padding: '0.85rem', fontSize: '1.1rem' }}>🚀 START MATCH NOW</button>
          </div>
        </div>
      </div>
    );
  }

  // Helper to render the 4 corner player badges
  const renderCornerBadge = (color: 'red' | 'green' | 'yellow' | 'blue', cornerClass: 'tl' | 'tr' | 'bl' | 'br') => {
    const slot = slots.find((s) => s.color === color);
    const colorStyle = color === 'red' ? 'var(--ludo-red)' : color === 'green' ? 'var(--ludo-green)' : color === 'yellow' ? 'var(--ludo-gold)' : 'var(--ludo-blue)';
    const isActive = turn === color;
    const isMe = color === userColor || (slot && slot.id === user?.id) || (!slot?.isBot && !snapshot && color === userColor);
    
    // Resolve real player name
    let displayName = slot?.name;
    if (isMe && user?.username) {
      displayName = user.username;
    }
    if (!displayName) {
      displayName = color === 'red' ? 'Red Player' : color === 'green' ? 'Green Player' : color === 'yellow' ? 'Yellow Player' : 'Blue Player';
    }

    return (
      <div
        className={`ludo-badge ${cornerClass} ${isActive ? 'on' : ''}`}
        style={{ '--c': colorStyle } as React.CSSProperties}
      >
        <div className="av">
          {slot?.emoji || (color === 'red' ? '🔴' : color === 'green' ? '🟩' : color === 'yellow' ? '🟡' : '🔵')}
        </div>
        <div className="info">
          <div className="nm" title={displayName}>
            <span className="player-name-text">{displayName}</span>
            {isMe && <span className="you-pill">You</span>}
            {slot?.connected === false && !slot?.isBot && <span className="offline-tag">(Offline)</span>}
          </div>
          <div className={`turn-tag ${isActive && isTimerUrgent ? 'urgent' : ''}`}>
            <span className="p" />
            <span>{`⏱️ ${secondsRemaining}s`}</span>
          </div>
          {slot?.connected === false && !slot?.isBot && slot?.disconnectDeadline && (
            <div className="grace-period-pill" style={{ marginTop: '0.2rem' }}>
              <span className="pulsing-warning-dot" />
              <span>Reconnecting… {Math.max(0, Math.ceil((slot.disconnectDeadline - now) / 1000))}s</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // VIEW 5: PLAYABLE LUDO GAME BOARD (UNO-STYLE APP SHELL & ARENA)
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
            onClick={() => setConfirmLeaveModal(true)}
            title="Leave Match"
          >
            ← Back
          </button>
          <div className="brand game-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
            <span style={{ fontSize: '1.25rem' }}>👑</span>
            <span><b>LUDO</b> KINGDOM</span>
          </div>
        </div>

        <div className="top-bar-center">
          <span
            className="turn-status-indicator"
            style={{
              color: turn === 'red' ? '#f87171' : turn === 'green' ? '#34d399' : turn === 'yellow' ? '#fbbf24' : '#60a5fa'
            }}
          >
            {(() => {
              if (snapshot?.isSpectator) return 'SPECTATING';
              if (turn === userColor) return 'YOUR TURN';
              const curSlot = slots.find((s) => s.color === turn);
              return `${(curSlot?.name || getColorConfig(turn).name).toUpperCase()}’S TURN`;
            })()}
          </span>
          <span
            className={`turn-timer-pill ${isTimerUrgent ? 'urgent-pulse' : ''}`}
            style={{
              background: isTimerUrgent
                ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                : turn === 'red'
                ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                : turn === 'green'
                ? 'linear-gradient(135deg, #10b981, #047857)'
                : turn === 'yellow'
                ? 'linear-gradient(135deg, #f59e0b, #b45309)'
                : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              boxShadow: isTimerUrgent ? '0 0 16px rgba(239, 68, 68, 0.8)' : undefined
            }}
          >
            {`${secondsRemaining}s`}
          </span>
        </div>

        <div className="top-bar-right">
          <VoiceChatBar
            socket={socket || null}
            currentUserId={user?.id || ''}
            roomCode={roomCode4 || snapshot?.roomId || ''}
            players={slots.map((s) => ({ id: s.id, username: s.name }))}
          />
          <ReactionWheel onSendEmote={handleEmote} position="top-right" />
          <div className="connection-status-pill in-game status-connected" title="Heartbeat latency">
            <span className="status-dot" />
            <span className="status-text">{snapshot?.ping ? `${snapshot.ping}ms` : '1ms'}</span>
          </div>
          <div className="room-code-tag">
            <span>ROOM <b>{roomCode4 || snapshot?.roomId || 'LIVE-01'}</b></span>
            <button className="icon-btn-small" onClick={() => setShowInviteModal(true)} title="Share & Invite Friends">
              🔗 Share
            </button>
          </div>
          <button
            type="button"
            className={`icon-btn-small ${showLudoChat ? 'active' : ''}`}
            onClick={() => setShowLudoChat(!showLudoChat)}
            title="Toggle Live Chat"
          >
            💬 GAME CHAT
          </button>
        </div>
      </div>

      {/* Main Game Arena Layout */}
      <div className={`game-arena ${showLudoChat ? 'with-chat' : 'full-table'}`}>
        {/* CENTER TABLE STAGE */}
        <div className="table-stage ludo-table-stage">
          {/* CENTER COLUMN: ARENA BOARD & CONTROL PANEL */}
          <div className="ludo-center-col">
          {/* SPECTATOR BANNER */}
          {snapshot?.isSpectator && (
            <div
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
                margin: '0 auto 0.5rem'
              }}
            >
              <span>👀</span>
              <span>Spectator Channel · Live Ludo Feed (Open seats offered on rematch)</span>
            </div>
          )}

          {/* BOARD WRAPPER WITH 4 CORNER PLAYER BADGES */}
          <div className="ludo-board-wrap">
            {renderCornerBadge('red', 'tl')}
            {renderCornerBadge('green', 'tr')}
            {renderCornerBadge('yellow', 'bl')}
            {renderCornerBadge('blue', 'br')}

            {/* WOODEN BOARD FRAME */}
            <div className="ludo-board-frame">
              {/* FELT INNER BACKGROUND */}
              <div className="ludo-board-inner">
                <div className="ludo-board-canvas">
                  {/* 15x15 GRID CELLS */}
                  <div className="ludo-grid">
                    {/* Render static grid cross cells */}
                    {(() => {
                      const cells = [];
                      for (let r = 0; r < 15; r++) {
                        for (let c = 0; c < 15; c++) {
                          const inV = c >= 6 && c <= 8;
                          const inH = r >= 6 && r <= 8;
                          if (!inV && !inH) continue; // inside yards

                          if (inV && inH) {
                            cells.push(
                              <div
                                key={`cell-${r}-${c}`}
                                className="ludo-cell center"
                                style={{ gridRow: r + 1, gridColumn: c + 1 }}
                              />
                            );
                            continue;
                          }

                          const idx = LUDO_PATH_MAP.get(`${r},${c}`);
                          let cellClass = 'ludo-cell';
                          if (idx !== undefined) {
                            for (const col of ['red', 'green', 'yellow', 'blue']) {
                              if (LUDO_START_INDEX[col] === idx) cellClass += ` start-${col}`;
                            }
                            if (LUDO_SAFE_INDEXES.has(idx)) cellClass += ' safe';
                          } else {
                            for (const col of ['red', 'green', 'yellow', 'blue']) {
                              const lane = LUDO_HOME_STRETCH[col] || [];
                              if (lane.some((rc) => rc[0] === r && rc[1] === c)) {
                                cellClass += ` lane-${col}`;
                              }
                            }
                          }

                          cells.push(
                            <div
                              key={`cell-${r}-${c}`}
                              className={cellClass}
                              style={{ gridRow: r + 1, gridColumn: c + 1 }}
                            />
                          );
                        }
                      }
                      return cells;
                    })()}

                    {/* 4 YARD PANELS */}
                    <div className="ludo-yard red" style={{ gridRow: '1 / span 6', gridColumn: '1 / span 6' }}>
                      <div className="ludo-yard-slot" />
                      <div className="ludo-yard-slot" />
                      <div className="ludo-yard-slot" />
                      <div className="ludo-yard-slot" />
                    </div>

                    <div className="ludo-yard green" style={{ gridRow: '1 / span 6', gridColumn: '10 / span 6' }}>
                      <div className="ludo-yard-slot" />
                      <div className="ludo-yard-slot" />
                      <div className="ludo-yard-slot" />
                      <div className="ludo-yard-slot" />
                    </div>

                    <div className="ludo-yard yellow" style={{ gridRow: '10 / span 6', gridColumn: '1 / span 6' }}>
                      <div className="ludo-yard-slot" />
                      <div className="ludo-yard-slot" />
                      <div className="ludo-yard-slot" />
                      <div className="ludo-yard-slot" />
                    </div>

                    <div className="ludo-yard blue" style={{ gridRow: '10 / span 6', gridColumn: '10 / span 6' }}>
                      <div className="ludo-yard-slot" />
                      <div className="ludo-yard-slot" />
                      <div className="ludo-yard-slot" />
                      <div className="ludo-yard-slot" />
                    </div>

                    {/* CENTER HUB MEDALLION */}
                    <div className="ludo-hub" style={{ gridRow: '7 / span 3', gridColumn: '7 / span 3' }}>
                      <svg viewBox="0 0 100 100">
                        <polygon points="50,50 0,0 100,0" fill="var(--ludo-green)"/>
                        <polygon points="50,50 100,0 100,100" fill="var(--ludo-blue)"/>
                        <polygon points="50,50 100,100 0,100" fill="var(--ludo-gold)"/>
                        <polygon points="50,50 0,100 0,0" fill="var(--ludo-red)"/>
                        <circle cx="50" cy="50" r="11" fill="#fff2d0" stroke="#8a5a15" strokeWidth="2.5"/>
                        <text x="50" y="54" textAnchor="middle" fontSize="10" fill="#8a5a15" fontWeight="bold">👑</text>
                      </svg>
                    </div>
                  </div>

                  {/* 3D GLOSSY TOKENS LAYER */}
                  <div className="ludo-tokens-layer">
                    {tokens.map((t, idx) => {
                      const [r, c] = getLudoPos(t, idx);
                      const isMyTurn = turn === userColor;
                      const isMovable = (isMyTurn && mustMove && !t.isHome && (
                        (t.inYard && diceVal === 6) || (!t.inYard && t.pos + (diceVal || 0) <= 56)
                      ) && t.color === turn) || (snapshot?.ludoState?.movableTokens?.some((tok: any) => tok.id === `${t.color}-${idx % 4}`));

                      return (
                        <div
                          key={t.id}
                          className={`ludo-token-pawn ${t.color} ${isMovable ? 'movable' : ''} ${t.inYard || t.pos === -1 ? 'in-home' : 'on-track'}`}
                          style={{
                            left: `${((c + 0.5) / 15) * 100}%`,
                            top: `${((r + 0.5) / 15) * 100}%`
                          }}
                          onClick={() => {
                            if (isMovable) moveToken(t);
                          }}
                          title={`${t.color.toUpperCase()} Token (${t.inYard ? 'In Yard' : t.isHome ? 'Home' : `Pos ${t.pos}`})`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CONTROL PANEL: 9-PIP 3D DIE & ACTIONS */}
          <div className="ludo-ctrl-panel">
            <div className="ludo-ctrl-top">
              <h2 className="ludo-ctrl-heading">ROLL DICE</h2>
              <div
                className="ludo-turn-chip"
                style={{
                  '--tc': turn === 'red' ? 'var(--ludo-red)' : turn === 'green' ? 'var(--ludo-green)' : turn === 'yellow' ? 'var(--ludo-gold)' : 'var(--ludo-blue)'
                } as React.CSSProperties}
              >
                <span className="dot" />
                <span>
                  {turn.charAt(0).toUpperCase() + turn.slice(1)}'s turn {turn === userColor ? '(you)' : ''}
                </span>
              </div>
            </div>

            <div className="ludo-ctrl-body">
              {/* 3D DIE BOX */}
              <div className="ludo-die-box">
                <div
                  className={`ludo-die ${isRolling ? 'rolling' : ''}`}
                  style={{
                    '--tc': turn === 'red' ? 'var(--ludo-red)' : turn === 'green' ? 'var(--ludo-green)' : turn === 'yellow' ? 'var(--ludo-gold)' : 'var(--ludo-blue)'
                  } as React.CSSProperties}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((pipNum) => {
                    const displayVal = diceVal || lastRollVal || 1;
                    const activePips = new Set(LUDO_PIP_LAYOUT[displayVal] || [5]);
                    const isOn = activePips.has(pipNum);
                    return <div key={pipNum} className={`ludo-pip ${isOn ? 'on' : ''}`} />;
                  })}
                </div>
              </div>

              {/* PANEL INFO & CTA */}
              <div className="ludo-panel-info">
                <p className="ludo-panel-hint">
                  {isRolling ? 'Rolling 3D Die…' : mustMove ? 'Tap a glowing token to move it!' : turn === userColor ? 'Roll the dice to start your move.' : `Waiting for ${getColorConfig(turn).name}…`}
                </p>
                <p
                  className="ludo-panel-last"
                  style={showRollHighlight ? { borderColor: '#fbbf24', color: '#fbbf24', fontWeight: 800, transform: 'scale(1.04)', transition: 'all 0.2s ease' } : undefined}
                >
                  {(diceVal === 6 || (!diceVal && lastRollVal === 6))
                    ? '🎉 Rolled a 6! Extra turn granted!'
                    : (diceVal || lastRollVal)
                    ? `Last roll: ${diceVal || lastRollVal}`
                    : 'Last roll: —'}
                </p>

                {snapshot?.isSpectator ? (
                  <div
                    style={{
                      marginTop: '10px',
                      background: 'rgba(15,23,42,0.8)',
                      border: '1px solid rgba(245,158,11,0.4)',
                      borderRadius: '10px',
                      padding: '10px',
                      color: '#bae6fd',
                      fontWeight: 700,
                      fontSize: '0.88rem'
                    }}
                  >
                    👀 Spectating Live Match · {getColorConfig(turn).name}'s Turn
                  </div>
                ) : (
                  <button
                    type="button"
                    className="ludo-cta-btn"
                    onClick={handleRollDice}
                    disabled={turn !== userColor || isRolling || mustMove || !!winner}
                  >
                    {isRolling ? 'Rolling Die…' : mustMove ? 'Move Pawn on Board →' : 'Roll Dice 🎲'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* QUICK IN-GAME REACTIONS DOCK */}
          <div className="ludo-quick-reactions-dock">
            <span className="dock-label">Reactions</span>
            <div className="dock-emotes-row">
              {['🔥', '😂', '🎉', '👑', '💀', '👏'].map((em) => (
                <button
                  key={em}
                  type="button"
                  className="quick-dock-emote-btn"
                  onClick={() => handleEmote({ emote: em })}
                  title={`Send ${em} reaction`}
                >
                  {em}
                </button>
              ))}
              <ReactionWheel
                onSendEmote={handleEmote}
                position="bottom-left"
                size="sm"
                customLabel="More 🎯"
              />
            </div>
          </div>

          {/* COLOR LEGEND BAR */}
          <div className="ludo-legend-bar">
            <span><i style={{ background: 'var(--ludo-red)' }} /> Red {userColor === 'red' ? '— you' : ''}</span>
            <span><i style={{ background: 'var(--ludo-green)' }} /> Green {userColor === 'green' ? '— you' : ''}</span>
            <span><i style={{ background: 'var(--ludo-gold)' }} /> Yellow {userColor === 'yellow' ? '— you' : ''}</span>
            <span><i style={{ background: 'var(--ludo-blue)' }} /> Blue {userColor === 'blue' ? '— you' : ''}</span>
          </div>
        </div>
      </div>

        {/* RIGHT LIVE CHAT SIDEBAR (MATCHING UNO SIDE-BY-SIDE) */}
        {showLudoChat && (
          <GameChatPanel
            chat={chatMessages}
            onSend={handleSendChat}
            onReact={handleReactChat}
            onClose={() => setShowLudoChat(false)}
            title="LUDO ARENA CHAT"
            isCollapsible
          />
        )}
      </div>

      {showInviteModal && (
        <ShareInviteModal
          roomCode={roomCode4 || snapshot?.roomId || 'LIVE-01'}
          gameType="ludo"
          roomMeta={roomMeta}
          snapshot={snapshot}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* CONFIRM LEAVE MATCH MODAL */}
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
              Leave Active Match?
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.55', margin: '0 0 1.5rem 0' }}>
              Are you sure you want to leave this game? Your active match progress will be abandoned and your seat will be forfeited.
            </p>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, padding: '0.7rem', fontWeight: 600 }}
                onClick={() => setConfirmLeaveModal(false)}
              >
                Stay in Game
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
                Leave Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESULT MODAL (RANKINGS 1 TO 4) */}
      {resultModal && (
        <div className="modal-backdrop">
          <div className="modal panel" style={{ background: '#0f172a', padding: '2rem', borderRadius: '1.5rem', border: '2px solid #fbbf24', maxWidth: '480px', width: '100%', textAlign: 'center' }}>
            <span style={{ fontSize: '4rem' }}>🏆</span>
            <h2 style={{ fontFamily: 'Fredoka, sans-serif', color: '#fbbf24', margin: '0.5rem 0' }}>MATCH COMPLETED!</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Ludo Kingdom Final Match Rankings (1st - 4th):</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', margin: '1.2rem 0' }}>
              {rankings.map((p, rankIdx) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: rankIdx === 0 ? 'rgba(251,191,36,0.18)' : 'rgba(30,41,59,0.8)', border: rankIdx === 0 ? '1px solid #fbbf24' : '1px solid transparent', padding: '0.8rem 1rem', borderRadius: '12px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: rankIdx === 0 ? '#fbbf24' : '#fff' }}>
                    {rankIdx === 0 ? '🥇 1st Place' : rankIdx === 1 ? '🥈 2nd Place' : rankIdx === 2 ? '🥉 3rd Place' : '4th Place'}
                  </span>
                  <span style={{ fontWeight: 'bold', color: p.color }}>{p.emoji} {p.name}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button onClick={() => setView('home')} className="btn btn-secondary" style={{ flex: 1 }}>Home</button>
              <button onClick={() => initBoardGame()} className="btn btn-primary" style={{ flex: 1 }}>Play Again 🔄</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
