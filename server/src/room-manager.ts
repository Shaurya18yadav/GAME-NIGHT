import { randomUUID } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import { GameRuleError, UnoGame } from './game-engine.js';
import { repository, type Repository } from './repository.js';
import { sanitizeText } from './security.js';
import type { Color, HouseRules, LudoState, LudoToken, Player, SessionUser } from './types.js';
import { config } from './config.js';

export function initLudoState(players: Player[]): LudoState {
  const colors: Color[] = ['red', 'green', 'blue', 'yellow'];
  const taken = new Set(players.map((p) => p.ludoColor).filter(Boolean));
  for (const player of players) {
    if (!player.ludoColor) {
      const free = colors.find((c) => !taken.has(c)) || 'yellow';
      player.ludoColor = free;
      taken.add(free);
    }
  }

  const tokens: Record<Color, LudoToken[]> = {
    red: [0, 1, 2, 3].map((i) => ({ id: `red-${i}`, color: 'red', pos: -1 })),
    green: [0, 1, 2, 3].map((i) => ({ id: `green-${i}`, color: 'green', pos: -1 })),
    blue: [0, 1, 2, 3].map((i) => ({ id: `blue-${i}`, color: 'blue', pos: -1 })),
    yellow: [0, 1, 2, 3].map((i) => ({ id: `yellow-${i}`, color: 'yellow', pos: -1 })),
  };

  return {
    tokens,
    turnColor: players[0]?.ludoColor || 'red',
    dice: 1,
    phase: 'awaiting-roll',
    movableTokens: [],
    consecutiveSixes: 0,
    rankings: [],
    logs: [{ from: 'system', text: "Table's set. Roll a 6 to bring a token out onto the board.", time: Date.now() }]
  };
}

function movableLudoTokens(tokens: Record<Color, LudoToken[]>, color: Color, dice: number) {
  return (tokens[color] || []).filter((tok) => {
    if (tok.pos === -1) return dice === 6;
    if (tok.pos >= 56) return false;
    return tok.pos + dice <= 56;
  });
}

function pickBestLudoToken(list: { id: string; pos: number }[], toks: Record<Color, LudoToken[]>, color: Color, dice: number) {
  const startIndexMap: Record<string, number> = { red: 0, green: 13, blue: 26, yellow: 39 };
  const safeIndices = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

  // 1. Move piece into Home triangle if exact roll lands on 56
  const homeMove = list.find((t) => t.pos !== -1 && t.pos + dice === 56);
  if (homeMove) return homeMove;

  // 2. Capture opponent piece on non-safe tiles
  for (const tok of list) {
    if (tok.pos === -1) continue;
    const newPos = tok.pos + dice;
    if (newPos <= 50) {
      const trackIdx = (startIndexMap[color] + newPos) % 52;
      if (!safeIndices.has(trackIdx)) {
        for (const c of ['red', 'green', 'blue', 'yellow'] as Color[]) {
          if (c === color) continue;
          const hits = toks[c]?.filter((t) => t.pos >= 0 && t.pos <= 50 && (startIndexMap[c] + t.pos) % 52 === trackIdx);
          if (hits && hits.length > 0) return tok;
        }
      }
    }
  }

  // 3. Roll of 6: bring out from yard
  if (dice === 6) {
    const fromBase = list.find((t) => t.pos === -1);
    if (fromBase) return fromBase;
  }

  // 4. Default: advance the most forward piece
  return [...list].sort((a, b) => b.pos - a.pos)[0];
}

type RoomOptions = { gameType?: 'uno' | 'ludo' | 'snake'; isPrivate: boolean; maxPlayers: number; botCount: number; autoStart: boolean; targetScore: number; maxRounds: number; rules: Partial<HouseRules>; customCode?: string };
type Room = {
  code: string;
  gameType: 'uno' | 'ludo' | 'snake';
  hostId: string;
  isPrivate: boolean;
  maxPlayers: number;
  game: UnoGame;
  users: Map<string, Set<string>>;
  rematchVotes: Set<string>;
  voiceUsers: Set<string>;
  timer?: NodeJS.Timeout;
  botTimer?: NodeJS.Timeout;
  persisted: boolean;
  createdAt: number;
};

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const reactionSet = new Set(['👍', '😂', '🔥', '👏', '😮', '🎉']);

const makeCode = () => Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
const channel = (code: string) => `room:${code}`;

export class RoomManager {
  private rooms = new Map<string, Room>();
  private chatEvents = new Map<string, number[]>();
  private graceTimers = new Map<string, NodeJS.Timeout>();
  constructor(private io: Server, private db: Repository = repository) {}

  createRoom(creator: SessionUser, options: RoomOptions) {
    let code: string;
    if (options.customCode) {
      code = options.customCode.trim().toUpperCase();
      if (this.rooms.has(code)) {
        throw new GameRuleError(`A room with code "${code}" already exists. Please choose a different code or join it.`);
      }
    } else {
      code = makeCode();
      while (this.rooms.has(code)) code = makeCode();
    }
    const gType = options.gameType ?? 'uno';
    const maxP = gType === 'ludo' ? Math.min(options.maxPlayers, 4) : options.maxPlayers;
    const game = new UnoGame(code, { targetScore: options.targetScore, maxRounds: options.maxRounds, rules: options.rules });
    game.state.gameType = gType;
    game.addPlayer(creator);
    
    // Default Ludo colors assignment
    if (gType === 'ludo') {
      game.state.players[0].ludoColor = 'red';
    }

    for (let number = 1; number <= options.botCount; number++) {
      const botColor: ('red' | 'green' | 'blue' | 'yellow')[] = ['green', 'blue', 'yellow'];
      game.addPlayer({ id: randomUUID(), username: `${gType === 'ludo' ? 'Ludo Bot' : 'UNO Bot'} ${number}`, isGuest: true, isBot: true });
      const added = game.state.players.at(-1)!;
      added.ready = true;
      if (gType === 'ludo') added.ludoColor = botColor[number - 1] || 'yellow';
    }
    const room: Room = { code, gameType: gType, hostId: creator.id, isPrivate: options.isPrivate, maxPlayers: maxP, game, users: new Map(), rematchVotes: new Set(), voiceUsers: new Set(), persisted: false, createdAt: Date.now() };
    this.rooms.set(code, room);
    if (options.autoStart) {
      game.state.players[0].ready = true;
      game.startMatch();
      if (gType === 'ludo') {
        game.state.ludoState = initLudoState(game.state.players);
      }
      this.armTimer(room);
      this.armBotTurn(room);
    }
    return this.roomInfo(room);
  }

  join(socket: Socket, user: SessionUser, roomCode: string): void {
    const code = roomCode.trim().toUpperCase();
    const room = this.requireRoom(code);
    const player = room.game.state.players.find((candidate) => candidate.id === user.id);
    if (player) {
      const timerKey = `${room.code}:${player.id}`;
      if (this.graceTimers.has(timerKey)) {
        clearTimeout(this.graceTimers.get(timerKey)!);
        this.graceTimers.delete(timerKey);
        room.game.state.chat.push({
          id: randomUUID(),
          playerId: 'system',
          username: 'SYSTEM',
          text: `✓ ${player.username} reconnected! Resuming match.`,
          createdAt: Date.now(),
          reactions: {}
        });
      }
      player.connected = true;
      player.disconnectDeadline = undefined;
      player.username = user.username;
      player.avatarUrl = user.avatarUrl;
    } else if (room.game.state.status === 'waiting' && room.game.state.players.length < room.maxPlayers) {
      room.game.addPlayer(user);
      if (room.gameType === 'ludo') {
        const colors: ('red' | 'green' | 'yellow' | 'blue')[] = ['red', 'green', 'yellow', 'blue'];
        const takenColors = new Set(room.game.state.players.map((p) => p.ludoColor).filter(Boolean));
        const freeColor = colors.find((c) => !takenColors.has(c));
        const added = room.game.state.players.find((p) => p.id === user.id);
        if (added && freeColor) added.ludoColor = freeColor;
      }
    } else {
      const isNewSpectator = !room.game.state.spectators.has(user.id);
      room.game.state.spectators.set(user.id, { id: user.id, username: user.username, connected: true });
      if (isNewSpectator) {
        room.game.state.chat.push({
          id: randomUUID(),
          playerId: 'system',
          username: 'SYSTEM',
          text: `👀 ${user.username} joined as a spectator (Match in progress).`,
          createdAt: Date.now(),
          reactions: {}
        });
      }
    }
    if (socket.data.roomCode && socket.data.roomCode !== code) this.detachSocket(socket);
    socket.join(channel(code));
    socket.data.roomCode = code;
    const sockets = room.users.get(user.id) ?? new Set<string>();
    sockets.add(socket.id); room.users.set(user.id, sockets);
    this.publish(room, false);
  }

  disconnect(socket: Socket): void {
    this.detachSocket(socket);
  }

  private detachSocket(socket: Socket): void {
    const code: string | undefined = socket.data.roomCode;
    const user: SessionUser | undefined = socket.data.user;
    if (!code || !user) return;
    const room = this.rooms.get(code);
    if (!room) return;
    socket.leave(channel(code));
    const sockets = room.users.get(user.id);
    sockets?.delete(socket.id);
    if (!sockets?.size) {
      room.users.delete(user.id);
      const player = room.game.state.players.find((candidate) => candidate.id === user.id);
      if (player) {
        player.connected = false;
        if (room.game.state.status === 'playing' && !player.isBot) {
          const GRACE_PERIOD_MS = 45_000;
          player.disconnectDeadline = Date.now() + GRACE_PERIOD_MS;
          const timerKey = `${room.code}:${player.id}`;
          if (this.graceTimers.has(timerKey)) {
            clearTimeout(this.graceTimers.get(timerKey)!);
          }
          room.game.state.chat.push({
            id: randomUUID(),
            playerId: 'system',
            username: 'SYSTEM',
            text: `⚠️ ${player.username} disconnected. 45s grace period started.`,
            createdAt: Date.now(),
            reactions: {}
          });

          const timer = setTimeout(() => {
            this.onGracePeriodExpired(room.code, player.id);
          }, GRACE_PERIOD_MS);
          this.graceTimers.set(timerKey, timer);
        }
      }
      const spectator = room.game.state.spectators.get(user.id);
      if (spectator) spectator.connected = false;

      // Clean up voice session if user disconnected
      if (room.voiceUsers.has(user.id)) {
        room.voiceUsers.delete(user.id);
        this.io.to(channel(room.code)).emit('webrtc:voice-roster', { activeVoiceUsers: Array.from(room.voiceUsers) });
      }

      // If the host disconnected in waiting room, migrate host immediately so the room stays responsive
      if (room.game.state.status === 'waiting' && room.hostId === user.id) {
        this.migrateHostIfNeeded(room, user.id);
      }

      this.publish(room, false);
    }
    socket.data.roomCode = undefined;
  }

  private onGracePeriodExpired(code: string, userId: string): void {
    const room = this.rooms.get(code);
    if (!room || room.game.state.status !== 'playing') return;
    const timerKey = `${code}:${userId}`;
    this.graceTimers.delete(timerKey);
    const player = room.game.state.players.find((p) => p.id === userId);
    if (!player || player.connected || player.isBot) return;

    player.isBot = true;
    player.disconnectDeadline = undefined;
    player.username = `${player.username} (Bot)`;
    room.game.state.chat.push({
      id: randomUUID(),
      playerId: 'system',
      username: 'SYSTEM',
      text: `⏱️ ${player.username} failed to reconnect within grace period. AI Bot took over.`,
      createdAt: Date.now(),
      reactions: {}
    });

    if (room.hostId === userId) {
      this.migrateHostIfNeeded(room, userId);
    }

    this.armBotTurn(room);
    this.publish(room, false);
  }

  leaveRoom(user: SessionUser, socket: Socket): void {
    const code: string | undefined = socket.data.roomCode;
    if (code) {
      const room = this.rooms.get(code);
      if (room) {
        const timerKey = `${code}:${user.id}`;
        if (this.graceTimers.has(timerKey)) {
          clearTimeout(this.graceTimers.get(timerKey)!);
          this.graceTimers.delete(timerKey);
        }
        if (room.game.state.status === 'playing') {
          const player = room.game.state.players.find((candidate) => candidate.id === user.id);
          if (player && !player.isBot) {
            player.isBot = true;
            player.username = `${player.username} (Bot)`;
          }
        } else if (room.game.state.status === 'waiting') {
          room.game.removeWaitingPlayer(user.id);
        }

        if (room.hostId === user.id) {
          this.migrateHostIfNeeded(room, user.id);
        }
      }
    }
    this.detachSocket(socket);
  }

  private migrateHostIfNeeded(room: Room, departingHostId: string): void {
    if (room.hostId !== departingHostId) return;

    // Filter candidate players: active human players first, sorted by joinedAt timestamp
    const humanCandidates = room.game.state.players
      .filter((p) => p.id !== departingHostId && !p.isBot && p.connected !== false)
      .sort((a, b) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0));

    // Fallback to any remaining non-bot player, sorted by joinedAt
    const candidates = humanCandidates.length > 0
      ? humanCandidates
      : room.game.state.players
          .filter((p) => p.id !== departingHostId && !p.isBot)
          .sort((a, b) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0));

    if (candidates.length === 0) return; // No eligible human players remaining

    const newHost = candidates[0];
    room.hostId = newHost.id;

    for (const player of room.game.state.players) {
      player.isHost = player.id === newHost.id;
    }

    // Announce in chat
    room.game.state.chat.push({
      id: randomUUID(),
      playerId: 'system',
      username: 'SYSTEM',
      text: `👑 Room host migrated to ${newHost.username}.`,
      createdAt: Date.now(),
      reactions: {}
    });

    // Backend sends HOST_MIGRATED event to all clients in the room
    this.io.to(channel(room.code)).emit('HOST_MIGRATED', {
      newHostId: newHost.id,
      newHostUsername: newHost.username,
      roomCode: room.code
    });
  }

  setReady(user: SessionUser, code: string, ready: boolean): void {
    const room = this.requirePlayerRoom(code, user.id);
    room.game.setReady(user.id, ready);
    this.publish(room, false);
  }

  addBot(user: SessionUser, code: string): void {
    const room = this.requirePlayerRoom(code, user.id);
    if (room.hostId !== user.id) throw new GameRuleError('Only the host can add bots.');
    if (room.game.state.status !== 'waiting') throw new GameRuleError('Bots can only be added before the match starts.');
    if (room.game.state.players.length >= room.maxPlayers) throw new GameRuleError('Room is full.');
    const botNum = room.game.state.players.filter((p) => p.isBot).length + 1;
    const botColorList: ('red' | 'green' | 'yellow' | 'blue')[] = ['red', 'green', 'yellow', 'blue'];
    const takenColors = new Set(room.game.state.players.map((p) => p.ludoColor).filter(Boolean));
    const freeColor = botColorList.find((c) => !takenColors.has(c));

    room.game.addPlayer({ id: randomUUID(), username: `${room.gameType === 'ludo' ? 'Ludo Bot' : 'UNO Bot'} ${botNum}`, isGuest: true, isBot: true });
    const added = room.game.state.players.at(-1)!;
    added.ready = true;
    if (room.gameType === 'ludo' && freeColor) added.ludoColor = freeColor;
    this.publish(room, false);
  }

  setLudoColor(user: SessionUser, code: string, color: 'red' | 'green' | 'yellow' | 'blue'): void {
    const room = this.requirePlayerRoom(code, user.id);
    const existing = room.game.state.players.find((p) => p.ludoColor === color && p.id !== user.id);
    if (existing) throw new GameRuleError(`Color ${color.toUpperCase()} is already chosen by ${existing.username}.`);
    const me = room.game.state.players.find((p) => p.id === user.id);
    if (me) me.ludoColor = color;
    this.publish(room, false);
  }

  removeBot(user: SessionUser, code: string, botId?: string): void {
    const room = this.requirePlayerRoom(code, user.id);
    if (room.hostId !== user.id) throw new GameRuleError('Only the host can remove bots.');
    const botIndex = botId
      ? room.game.state.players.findIndex((p) => p.id === botId && p.isBot)
      : room.game.state.players.map((p) => Boolean(p.isBot)).lastIndexOf(true);
    if (botIndex !== -1) {
      room.game.state.players.splice(botIndex, 1);
      this.publish(room, false);
    }
  }

  switchGame(user: SessionUser, code: string, newGame: 'uno' | 'ludo' | 'snake'): void {
    const room = this.requirePlayerRoom(code, user.id);
    if (room.hostId !== user.id) throw new GameRuleError('Only the host can switch games.');

    const targetMax = newGame === 'ludo' ? 4 : newGame === 'snake' ? 2 : 10;
    room.maxPlayers = targetMax;
    room.gameType = newGame;
    room.game.state.gameType = newGame;
    room.game.state.status = 'waiting';

    if (newGame === 'ludo') {
      if (room.game.state.players.length > 4) {
        // Sort players so host and earliest-joined stay in active seats
        const sorted = [...room.game.state.players].sort((a, b) => {
          if (a.id === room.hostId) return -1;
          if (b.id === room.hostId) return 1;
          return (a.joinedAt ?? 0) - (b.joinedAt ?? 0);
        });

        const activePlayers = sorted.slice(0, 4);
        const excessPlayers = sorted.slice(4);

        for (const excess of excessPlayers) {
          room.game.state.spectators.set(excess.id, {
            id: excess.id,
            username: excess.username,
            connected: excess.connected
          });
        }
        room.game.state.players = activePlayers;

        const excessNames = excessPlayers.map((p) => p.username).join(', ');
        room.game.state.chat.push({
          id: randomUUID(),
          playerId: 'system',
          username: 'SYSTEM',
          text: `🎲 Switched to Ludo Kingdom (4 player cap). ${excessNames} moved to Spectator role.`,
          createdAt: Date.now(),
          reactions: {}
        });
      }

      // Assign default Ludo colors to active players
      const colors: ('red' | 'green' | 'yellow' | 'blue')[] = ['red', 'green', 'yellow', 'blue'];
      room.game.state.players.forEach((p, idx) => {
        p.ludoColor = colors[idx] || 'red';
      });
    } else if (newGame === 'uno') {
      room.game.state.chat.push({
        id: randomUUID(),
        playerId: 'system',
        username: 'SYSTEM',
        text: `🃏 Switched to UNO Night (10 player cap). Spectators can claim open seats.`,
        createdAt: Date.now(),
        reactions: {}
      });
    }

    this.publish(room, false);
  }

  claimSeat(user: SessionUser, code: string): void {
    const room = this.requireRoom(code);
    if (room.game.state.status !== 'waiting') {
      throw new GameRuleError('Cannot join as a player after the match has started.');
    }
    if (room.game.state.players.some((p) => p.id === user.id)) {
      return; // Already an active player
    }
    if (room.game.state.players.length >= room.maxPlayers) {
      throw new GameRuleError(`Room has reached maximum capacity of ${room.maxPlayers} players.`);
    }

    // Remove from spectators if present
    room.game.state.spectators.delete(user.id);

    // Assign color for Ludo if applicable
    const colors: ('red' | 'green' | 'yellow' | 'blue')[] = ['red', 'green', 'yellow', 'blue'];
    const takenColors = new Set(room.game.state.players.map((p) => p.ludoColor).filter(Boolean));
    const availableColor = colors.find((c) => !takenColors.has(c));

    room.game.addPlayer({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      avatarPreset: user.avatarPreset,
      isGuest: user.isGuest,
      joinedAt: Date.now(),
      isHost: false
    });

    const newPlayer = room.game.state.players.at(-1);
    if (newPlayer && room.gameType === 'ludo' && availableColor) {
      newPlayer.ludoColor = availableColor;
    }

    room.game.state.chat.push({
      id: randomUUID(),
      playerId: 'system',
      username: 'SYSTEM',
      text: `🙋 ${user.username} joined the match from spectator mode.`,
      createdAt: Date.now(),
      reactions: {}
    });

    this.publish(room, false);
  }

  rematch(user: SessionUser, code: string): void {
    const room = this.requirePlayerRoom(code, user.id);
    room.game.state.status = 'waiting';
    room.persisted = false;
    for (const p of room.game.state.players) p.ready = Boolean(p.isBot);

    // Automatically offer the first open player slots to connected spectators for the rematch
    this.promoteSpectatorsToOpenSeats(room);

    this.publish(room, false);
  }

  private promoteSpectatorsToOpenSeats(room: Room): void {
    if (room.game.state.spectators.size === 0) return;
    const availableSeats = room.maxPlayers - room.game.state.players.length;
    if (availableSeats <= 0) return;

    const connectedSpectators = [...room.game.state.spectators.values()].filter((s) => s.connected);
    const toPromote = connectedSpectators.slice(0, availableSeats);

    const colors: ('red' | 'green' | 'yellow' | 'blue')[] = ['red', 'green', 'yellow', 'blue'];
    const takenColors = new Set(room.game.state.players.map((p) => p.ludoColor).filter(Boolean));

    for (const spec of toPromote) {
      room.game.state.spectators.delete(spec.id);
      const freeColor = colors.find((c) => !takenColors.has(c));
      if (freeColor) takenColors.add(freeColor);

      room.game.addPlayer({
        id: spec.id,
        username: spec.username,
        isGuest: true,
        joinedAt: Date.now(),
        isHost: false
      });

      const added = room.game.state.players.at(-1);
      if (added && room.gameType === 'ludo' && freeColor) {
        added.ludoColor = freeColor;
      }
    }

    if (toPromote.length > 0) {
      const names = toPromote.map((p) => p.username).join(', ');
      room.game.state.chat.push({
        id: randomUUID(),
        playerId: 'system',
        username: 'SYSTEM',
        text: `🎟️ Rematch lobby opened: Spectator(s) ${names} promoted to active player seats!`,
        createdAt: Date.now(),
        reactions: {}
      });
    }
  }

  start(user: SessionUser, code: string): void {
    const room = this.requirePlayerRoom(code, user.id);
    if (room.hostId !== user.id) throw new GameRuleError('Only the host can start the match.');
    room.game.startMatch();
    if (room.gameType === 'ludo') {
      room.game.state.ludoState = initLudoState(room.game.state.players);
    }
    this.publish(room, true);
  }

  ludoRoll(user: SessionUser, code: string): void {
    const room = this.requirePlayerRoom(code, user.id);
    const ls = room.game.state.ludoState;
    if (!ls) throw new GameRuleError('Ludo match is not active.');
    const activePlayer = room.game.state.players.find((p) => p.ludoColor === ls.turnColor);
    if (activePlayer && activePlayer.id !== user.id && !activePlayer.isBot) {
      throw new GameRuleError("It is not your turn to roll.");
    }
    if (ls.phase !== 'awaiting-roll') return;

    const val = 1 + Math.floor(Math.random() * 6);
    ls.dice = val;
    const nextSixes = val === 6 ? ls.consecutiveSixes + 1 : 0;
    ls.consecutiveSixes = nextSixes;

    ls.logs.push({ from: ls.turnColor, text: `rolled a ${val}${val === 6 ? " 🎲" : ""}`, time: Date.now() });

    if (val === 6 && nextSixes >= 3) {
      ls.logs.push({ from: 'system', text: `${ls.turnColor.toUpperCase()} rolled three 6s in a row — turn forfeited.`, time: Date.now() });
      ls.consecutiveSixes = 0;
      this.advanceLudoTurn(room, false);
      this.afterGameAction(room);
      return;
    }

    const mv = movableLudoTokens(ls.tokens, ls.turnColor, val);
    if (!mv.length) {
      ls.logs.push({ from: 'system', text: `No legal move for ${ls.turnColor.toUpperCase()}.`, time: Date.now() });
      this.advanceLudoTurn(room, val === 6);
    } else {
      ls.movableTokens = mv;
      ls.phase = 'awaiting-choice';
    }
    this.afterGameAction(room);
  }

  ludoMove(user: SessionUser, code: string, tokenId: string): void {
    const room = this.requirePlayerRoom(code, user.id);
    const ls = room.game.state.ludoState;
    if (!ls) throw new GameRuleError('Ludo match is not active.');
    const activePlayer = room.game.state.players.find((p) => p.ludoColor === ls.turnColor);
    if (activePlayer && activePlayer.id !== user.id && !activePlayer.isBot) {
      throw new GameRuleError("It is not your turn to move.");
    }
    if (ls.phase !== 'awaiting-choice') return;

    this.executeLudoMove(room, ls.turnColor, tokenId);
  }

  private executeLudoMove(room: Room, color: Color, tokenId: string): void {
    const ls = room.game.state.ludoState;
    if (!ls) return;

    const tok = ls.tokens[color]?.find((t) => t.id === tokenId);
    if (!tok) return;

    const dice = ls.dice;
    let captured = false;
    let reachedHome = false;

    if (tok.pos === -1) {
      if (dice === 6) {
        tok.pos = 0;
        ls.logs.push({ from: color, text: `brought a token out of the yard onto the board! 🚀`, time: Date.now() });
      } else {
        return;
      }
    } else {
      const newPos = tok.pos + dice;
      if (newPos > 56) return; // exact landing required
      tok.pos = newPos;
      if (newPos === 56) {
        reachedHome = true;
        ls.logs.push({ from: color, text: `Token reached the HOME triangle! 🎯`, time: Date.now() });
      }
    }

    // Check capturing on common track (relative positions 0 to 50)
    if (tok.pos >= 0 && tok.pos <= 50) {
      const startIndexMap: Record<string, number> = { red: 0, green: 13, blue: 26, yellow: 39 };
      const safeIndices = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
      const trackIdx = (startIndexMap[color] + tok.pos) % 52;
      if (!safeIndices.has(trackIdx)) {
        for (const c of ['red', 'green', 'blue', 'yellow'] as Color[]) {
          if (c === color) continue;
          const hits = ls.tokens[c]?.filter((t) => t.pos >= 0 && t.pos <= 50 && (startIndexMap[c] + t.pos) % 52 === trackIdx);
          if (hits && hits.length > 0) {
            for (const hit of hits) {
              hit.pos = -1;
              captured = true;
              ls.logs.push({ from: color, text: `captured ${c.toUpperCase()}'s token and sent it home! 💥`, time: Date.now() });
            }
          }
        }
      }
    }

    const allHome = ls.tokens[color].every((t) => t.pos >= 56);
    if (allHome) {
      ls.logs.push({ from: 'system', text: `🏆 ${color.toUpperCase()} has moved all 4 tokens home and won!`, time: Date.now() });
      if (!ls.rankings.includes(color)) ls.rankings.push(color);
      if (!ls.winnerColor) ls.winnerColor = color;
      ls.phase = 'gameover';
      room.game.state.status = 'match-over';
      const winnerPlayer = room.game.state.players.find((p) => p.ludoColor === color);
      if (winnerPlayer) room.game.state.winnerId = winnerPlayer.id;
    } else {
      // Official Rule: Rolling 6, capturing an opponent, or reaching home grants an extra roll!
      const bonusTurn = dice === 6 || captured || reachedHome;
      if (bonusTurn) {
        if (captured) {
          ls.logs.push({ from: 'system', text: `⚔️ ${color.toUpperCase()} earned a bonus turn for capturing!`, time: Date.now() });
        } else if (reachedHome) {
          ls.logs.push({ from: 'system', text: `🎉 ${color.toUpperCase()} earned a bonus turn for reaching Home!`, time: Date.now() });
        }
      }
      this.advanceLudoTurn(room, bonusTurn);
    }
    this.afterGameAction(room);
  }

  private autoPlayLudoTurn(room: Room): void {
    if (room.game.state.status !== 'playing' || !room.game.state.ludoState) return;
    const ls = room.game.state.ludoState;
    if (ls.phase === 'gameover') return;

    if (ls.phase === 'awaiting-roll') {
      const val = 1 + Math.floor(Math.random() * 6);
      ls.dice = val;
      const nextSixes = val === 6 ? ls.consecutiveSixes + 1 : 0;
      ls.consecutiveSixes = nextSixes;
      ls.logs.push({ from: ls.turnColor, text: `[Timeout] auto-rolled a ${val}${val === 6 ? " 🎲" : ""}`, time: Date.now() });

      if (val === 6 && nextSixes >= 3) {
        ls.logs.push({ from: 'system', text: `${ls.turnColor.toUpperCase()} rolled three 6s in a row — turn forfeited.`, time: Date.now() });
        ls.consecutiveSixes = 0;
        this.advanceLudoTurn(room, false);
        this.afterGameAction(room);
        return;
      }

      const mv = movableLudoTokens(ls.tokens, ls.turnColor, val);
      if (!mv.length) {
        ls.logs.push({ from: 'system', text: `No legal move for ${ls.turnColor.toUpperCase()}.`, time: Date.now() });
        this.advanceLudoTurn(room, val === 6);
        this.afterGameAction(room);
      } else {
        const best = pickBestLudoToken(mv, ls.tokens, ls.turnColor, val);
        if (best) {
          this.executeLudoMove(room, ls.turnColor, best.id);
        }
      }
    } else if (ls.phase === 'awaiting-choice') {
      if (ls.movableTokens.length > 0) {
        const best = pickBestLudoToken(ls.movableTokens, ls.tokens, ls.turnColor, ls.dice);
        if (best) {
          this.executeLudoMove(room, ls.turnColor, best.id);
        }
      } else {
        this.advanceLudoTurn(room, false);
        this.afterGameAction(room);
      }
    }
  }

  private advanceLudoTurn(room: Room, goAgain: boolean): void {
    const ls = room.game.state.ludoState;
    if (!ls) return;
    ls.movableTokens = [];
    if (goAgain && ls.phase !== 'gameover') {
      ls.phase = 'awaiting-roll';
      return;
    }
    ls.consecutiveSixes = 0;
    const turnOrder: Color[] = ['red', 'green', 'blue', 'yellow'];
    const activeColors = room.game.state.players.map((p) => p.ludoColor).filter(Boolean) as Color[];
    const available = turnOrder.filter((c) => activeColors.includes(c));
    if (!available.length) return;
    const currentIdx = available.indexOf(ls.turnColor);
    const nextIdx = (currentIdx + 1) % available.length;
    ls.turnColor = available[nextIdx];
    ls.phase = 'awaiting-roll';
    const nextPlayerIdx = room.game.state.players.findIndex((p) => p.ludoColor === ls.turnColor);
    if (nextPlayerIdx !== -1) room.game.state.currentPlayerIndex = nextPlayerIdx;
  }

  play(user: SessionUser, code: string, input: { cardId: string; chosenColor?: 'red' | 'yellow' | 'green' | 'blue'; swapWithPlayerId?: string; callUno?: boolean }): void {
    const room = this.requirePlayerRoom(code, user.id);
    room.game.play({ playerId: user.id, ...input });
    this.afterGameAction(room);
  }

  draw(user: SessionUser, code: string): void {
    const room = this.requirePlayerRoom(code, user.id);
    room.game.draw(user.id);
    this.afterGameAction(room);
  }

  pass(user: SessionUser, code: string): void {
    const room = this.requirePlayerRoom(code, user.id);
    room.game.pass(user.id);
    this.afterGameAction(room);
  }

  acceptPenalty(user: SessionUser, code: string): void {
    const room = this.requirePlayerRoom(code, user.id);
    room.game.acceptPenalty(user.id);
    this.afterGameAction(room);
  }

  challenge(user: SessionUser, code: string): void {
    const room = this.requirePlayerRoom(code, user.id);
    room.game.challengeWildDrawFour(user.id);
    this.afterGameAction(room);
  }

  callUno(user: SessionUser, code: string): void {
    const room = this.requirePlayerRoom(code, user.id);
    room.game.callUno(user.id);
    this.publish(room, false);
  }

  catchUno(user: SessionUser, code: string, targetPlayerId: string): void {
    const room = this.requirePlayerRoom(code, user.id);
    room.game.catchUno(user.id, targetPlayerId);
    this.publish(room, false);
  }

  nextRound(user: SessionUser, code: string): void {
    const room = this.requirePlayerRoom(code, user.id);
    if (room.hostId !== user.id) throw new GameRuleError('Only the host can start the next round.');
    room.game.startNextRound();
    this.publish(room, true);
  }

  voteRematch(user: SessionUser, code: string): void {
    const room = this.requirePlayerRoom(code, user.id);
    if (room.game.state.status !== 'match-over') throw new GameRuleError('A rematch is available after the match ends.');
    room.rematchVotes.add(user.id);
    for (const bot of room.game.state.players.filter((player) => player.isBot)) room.rematchVotes.add(bot.id);
    if (room.game.state.players.every((player) => room.rematchVotes.has(player.id))) {
      room.rematchVotes.clear();
      room.persisted = false;
      room.game.prepareRematch();
      room.game.startMatch();
      this.publish(room, true);
      return;
    }
    this.publish(room, false);
  }

  addChat(user: SessionUser, code: string, rawText: string): void {
    const room = this.requireRoom(code);
    if (![...room.game.state.players, ...room.game.state.spectators.values()].some((person) => person.id === user.id)) throw new GameRuleError('Join the room before chatting.');
    this.enforceChatRate(user.id);
    const text = sanitizeText(rawText, 280);
    room.game.state.chat.push({ id: randomUUID(), playerId: user.id, username: user.username, text, createdAt: Date.now(), reactions: {} });
    if (room.game.state.chat.length > 100) room.game.state.chat.shift();
    this.publish(room, false);
  }

  react(user: SessionUser, code: string, messageId: string, emoji: string): void {
    const room = this.requireRoom(code);
    if (!reactionSet.has(emoji)) throw new GameRuleError('Unsupported reaction.');
    const message = room.game.state.chat.find((item) => item.id === messageId);
    if (!message) throw new GameRuleError('Chat message not found.');
    const people = new Set(message.reactions[emoji] ?? []);
    people.has(user.id) ? people.delete(user.id) : people.add(user.id);
    message.reactions[emoji] = [...people];
    this.publish(room, false);
  }

  broadcastEmote(user: SessionUser, code: string, data: { emote?: string; phrase?: string; sfx?: string }): void {
    const room = this.requireRoom(code);
    this.io.to(channel(room.code)).emit('room:emote-broadcast', {
      senderId: user.id,
      senderUsername: user.username,
      emote: data.emote,
      phrase: data.phrase,
      sfx: data.sfx,
      timestamp: Date.now()
    });
  }

  joinVoice(user: SessionUser, code: string): void {
    const room = this.requireRoom(code);
    room.voiceUsers.add(user.id);
    this.io.to(channel(room.code)).emit('webrtc:voice-roster', {
      activeVoiceUsers: Array.from(room.voiceUsers)
    });
  }

  leaveVoice(user: SessionUser, code: string): void {
    const room = this.rooms.get(code.trim().toUpperCase());
    if (!room) return;
    room.voiceUsers.delete(user.id);
    this.io.to(channel(room.code)).emit('webrtc:voice-roster', {
      activeVoiceUsers: Array.from(room.voiceUsers)
    });
  }

  relayWebRTCSignal(user: SessionUser, code: string, toUserId: string, signal: unknown, type: string): void {
    const room = this.requireRoom(code);
    const targetSockets = room.users.get(toUserId);
    if (!targetSockets || targetSockets.size === 0) return;

    for (const socketId of targetSockets) {
      this.io.to(socketId).emit('webrtc:signal', {
        fromUserId: user.id,
        fromUsername: user.username,
        signal,
        type
      });
    }
  }

  lobby() {
    const now = Date.now();
    for (const [code, room] of this.rooms.entries()) {
      if (room.users.size === 0 && (now - room.createdAt > 15 * 60 * 1000 || room.game.state.status === 'match-over')) {
        if (room.timer) clearTimeout(room.timer);
        if (room.botTimer) clearTimeout(room.botTimer);
        for (const [key, timer] of this.graceTimers.entries()) {
          if (key.startsWith(`${code}:`)) {
            clearTimeout(timer);
            this.graceTimers.delete(key);
          }
        }
        this.rooms.delete(code);
      }
    }
    return [...this.rooms.values()].filter((room) => !room.isPrivate && room.game.state.status === 'waiting').map((room) => this.roomInfo(room));
  }

  getStats() {
    let totalPlayersAtTables = 0;
    let activeRooms = 0;
    for (const room of this.rooms.values()) {
      if (room.game.state.status !== 'match-over') {
        activeRooms++;
        totalPlayersAtTables += room.game.state.players.length;
      }
    }
    return {
      activeRooms,
      totalPlayersAtTables,
      publicRooms: [...this.rooms.values()].filter((room) => !room.isPrivate && room.game.state.status === 'waiting').length
    };
  }

  roomInfo(room: Room) { return { code: room.code, gameType: room.gameType, isPrivate: room.isPrivate, players: room.game.state.players.length, bots: room.game.state.players.filter((player) => player.isBot).length, maxPlayers: room.maxPlayers, status: room.game.state.status, hostId: room.hostId, host: room.game.state.players.find((player) => player.id === room.hostId)?.username, rules: room.game.state.rules, createdAt: room.createdAt }; }

  private afterGameAction(room: Room): void {
    if (room.game.state.status === 'match-over' && !room.persisted) {
      room.persisted = true;
      void this.db.saveCompletedMatch(room.game.state).catch(() => { room.persisted = false; });
    }
    this.publish(room, true);
  }

  private publish(room: Room, resetTimer: boolean): void {
    if (resetTimer && room.game.state.status === 'playing') { this.armTimer(room); this.armBotTurn(room); }
    if (room.game.state.status !== 'playing') {
      if (room.timer) clearTimeout(room.timer);
      if (room.botTimer) clearTimeout(room.botTimer);
      room.timer = undefined; room.botTimer = undefined; room.game.state.turnDeadline = undefined;
    }
    for (const socketId of this.io.sockets.adapter.rooms.get(channel(room.code)) ?? []) {
      const socket = this.io.sockets.sockets.get(socketId);
      const user: SessionUser | undefined = socket?.data.user;
      if (socket && user) socket.emit('room:state', room.game.snapshotFor(user.id));
    }
    this.io.to(channel(room.code)).emit('room:meta', this.roomInfo(room));
  }

  private armTimer(room: Room): void {
    if (room.timer) clearTimeout(room.timer);
    room.game.state.turnDeadline = Date.now() + config.turnSeconds * 1000;
    room.timer = setTimeout(() => {
      try {
        if (room.gameType === 'ludo') {
          this.autoPlayLudoTurn(room);
        } else {
          room.game.autoPlayTurn(true);
          this.afterGameAction(room);
        }
      } catch {
        this.publish(room, true);
      }
    }, config.turnSeconds * 1000);
  }

  private armBotTurn(room: Room): void {
    if (room.botTimer) clearTimeout(room.botTimer);
    if (room.gameType === 'ludo') {
      const ls = room.game.state.ludoState;
      if (!ls || ls.phase === 'gameover') { room.botTimer = undefined; return; }
      const activePlayer = room.game.state.players.find((p) => p.ludoColor === ls.turnColor);
      if (!activePlayer?.isBot) { room.botTimer = undefined; return; }
      const botUser: SessionUser = { id: activePlayer.id, username: activePlayer.username, isGuest: true };
      room.botTimer = setTimeout(() => {
        if (room.game.state.status !== 'playing' || !room.game.state.ludoState) return;
        try {
          if (ls.phase === 'awaiting-roll') {
            this.ludoRoll(botUser, room.code);
          } else if (ls.phase === 'awaiting-choice' && ls.movableTokens.length) {
            const best = pickBestLudoToken(ls.movableTokens, ls.tokens, ls.turnColor, ls.dice);
            if (best) this.ludoMove(botUser, room.code, best.id);
          }
        } catch {
          this.publish(room, true);
        }
      }, 750);
      return;
    }

    const active = room.game.state.players[room.game.state.currentPlayerIndex];
    if (!active?.isBot) { room.botTimer = undefined; return; }
    const botId = active.id;
    room.botTimer = setTimeout(() => {
      const current = room.game.state.players[room.game.state.currentPlayerIndex];
      if (room.game.state.status !== 'playing' || current?.id !== botId || !current.isBot) return;
      try { room.game.autoPlayTurn(); this.afterGameAction(room); }
      catch { this.publish(room, true); }
    }, 650);
  }

  private enforceChatRate(userId: string): void {
    const now = Date.now();
    const entries = (this.chatEvents.get(userId) ?? []).filter((time) => now - time < 10_000);
    if (entries.length >= 5) throw new GameRuleError('Chat rate limit exceeded. Please wait a moment.');
    entries.push(now); this.chatEvents.set(userId, entries);
  }

  private requireRoom(code: string): Room {
    const room = this.rooms.get(code.trim().toUpperCase());
    if (!room) throw new GameRuleError('Room not found.');
    return room;
  }
  private requirePlayerRoom(code: string, userId: string): Room {
    const room = this.requireRoom(code);
    if (!room.game.state.players.some((player) => player.id === userId)) throw new GameRuleError('Spectators cannot take game actions.');
    return room;
  }
}
