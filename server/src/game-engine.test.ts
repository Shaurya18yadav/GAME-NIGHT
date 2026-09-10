import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeck } from './deck.js';
import { UnoGame } from './game-engine.js';
import type { Card } from './types.js';

const card = (id: string, color: Card['color'], value: Card['value']): Card => ({ id, color, value });

function twoPlayerGame() {
  const game = new UnoGame('ROOM');
  game.addPlayer({ id: 'a', username: 'A', isGuest: true });
  game.addPlayer({ id: 'b', username: 'B', isGuest: true });
  game.setReady('a', true); game.setReady('b', true); game.startMatch();
  game.state.drawPile = Array.from({ length: 20 }, (_, index) => card(`draw-${index}`, 'blue', '1'));
  game.state.discardPile = [card('top', 'red', '5')];
  game.state.currentColor = 'red'; game.state.currentPlayerIndex = 0;
  return game;
}

test('creates the standard 108-card deck', () => {
  const deck = createDeck();
  assert.equal(deck.length, 108);
  assert.equal(deck.filter((card) => card.value === 'wild4').length, 4);
});

test('deals seven cards and keeps hands private in snapshots', () => {
  const game = new UnoGame('ROOM');
  game.addPlayer({ id: 'a', username: 'A', isGuest: true });
  game.addPlayer({ id: 'b', username: 'B', isGuest: true });
  game.setReady('a', true); game.setReady('b', true); game.startMatch();
  assert.equal(game.state.players[0].hand.length, 7);
  const snapshot = game.snapshotFor('a');
  assert.equal(snapshot.hand.length, 7);
  assert.equal(snapshot.players.find((player) => player.id === 'b')?.handCount, 7);
  assert.equal('hand' in (snapshot.players.find((player) => player.id === 'b') ?? {}), false);
});

test('rejects an opponent trying to play out of turn', () => {
  const game = new UnoGame('ROOM');
  game.addPlayer({ id: 'a', username: 'A', isGuest: true });
  game.addPlayer({ id: 'b', username: 'B', isGuest: true });
  game.setReady('a', true); game.setReady('b', true); game.startMatch();
  assert.throws(() => game.play({ playerId: 'b', cardId: game.state.players[1].hand[0].id }), /not your turn|cannot be played/);
});

test('a successful Wild Draw Four challenge penalizes the offender and preserves challenger turn', () => {
  const game = twoPlayerGame();
  game.state.players[0].hand = [card('wild4', null, 'wild4'), card('held-red', 'red', '9')];
  game.state.players[1].hand = [card('other', 'green', '3')];
  game.play({ playerId: 'a', cardId: 'wild4', chosenColor: 'blue' });
  assert.equal(game.state.pendingDraw?.amount, 4);
  const result = game.challengeWildDrawFour('b');
  assert.equal(result.success, true);
  assert.equal(game.state.players[0].hand.length, 5);
  assert.equal(game.state.players[1].hand.length, 1);
  assert.equal(game.state.players[game.state.currentPlayerIndex].id, 'b');
});

test('catching an uncalled UNO draws two cards for that player', () => {
  const game = twoPlayerGame();
  game.state.players[0].hand = [card('red-five', 'red', '5'), card('blue-nine', 'blue', '9')];
  game.state.players[1].hand = [card('other', 'green', '3')];
  game.play({ playerId: 'a', cardId: 'red-five' });
  assert.equal(game.state.players[0].hand.length, 1);
  assert.equal(game.state.players[0].unoCalled, false);
  const penalty = game.catchUno('b', 'a');
  assert.equal(penalty.length, 2);
  assert.equal(game.state.players[0].hand.length, 3);
});

test('turn timer fallback forces card draw and yields to next player upon timeout', () => {
  const game = twoPlayerGame();
  game.state.players[0].hand = [card('red-five', 'red', '5'), card('blue-nine', 'blue', '9')];
  game.state.players[1].hand = [card('other', 'green', '3')];
  game.state.currentPlayerIndex = 0;

  // Turn timer hits zero (forced timeout fallback)
  game.autoPlayTurn(true);

  // Forced draw added 1 card to player a's hand
  assert.equal(game.state.players[0].hand.length, 3);
  // Turn successfully yielded to player b
  assert.equal(game.state.players[game.state.currentPlayerIndex].id, 'b');
});

test('tracks joinedAt and sets isHost=true for first player and includes in snapshots', () => {
  const game = new UnoGame('TEST');
  const t1 = Date.now();
  game.addPlayer({ id: 'p1', username: 'HostUser', isGuest: false });
  const t2 = Date.now() + 10;
  game.addPlayer({ id: 'p2', username: 'GuestUser', isGuest: true, joinedAt: t2 });

  assert.equal(game.state.players[0].isHost, true);
  assert.equal(game.state.players[1].isHost, false);
  assert.ok(game.state.players[0].joinedAt && game.state.players[0].joinedAt >= t1);
  assert.equal(game.state.players[1].joinedAt, t2);

  const snapshot = game.snapshotFor('p2');
  const snapP1 = snapshot.players.find((p) => p.id === 'p1');
  const snapP2 = snapshot.players.find((p) => p.id === 'p2');

  assert.equal(snapP1?.isHost, true);
  assert.equal(snapP2?.isHost, false);
  assert.equal(snapP2?.joinedAt, t2);
});

test('snapshotFor correctly identifies spectators and active players', () => {
  const game = new UnoGame('LUDO_ROOM');
  game.state.gameType = 'ludo';
  game.addPlayer({ id: 'p1', username: 'P1', isGuest: false });
  game.addPlayer({ id: 'p2', username: 'P2', isGuest: true });
  game.addPlayer({ id: 'p3', username: 'P3', isGuest: true });
  game.addPlayer({ id: 'p4', username: 'P4', isGuest: true });
  
  // Add 5th user as spectator
  game.state.spectators.set('p5', { id: 'p5', username: 'P5', connected: true });

  const p1Snap = game.snapshotFor('p1');
  const p5Snap = game.snapshotFor('p5');

  assert.equal(p1Snap.isSpectator, false);
  assert.equal(p5Snap.isSpectator, true);
  assert.equal(p5Snap.spectatorCount, 1);
  assert.equal(p5Snap.players.length, 4);
});

test('late joiner spectator channel preserves spectator state and hand is empty', () => {
  const game = twoPlayerGame(); // game is 'playing'
  game.state.spectators.set('spec1', { id: 'spec1', username: 'Watcher', connected: true });

  const snap = game.snapshotFor('spec1');
  assert.equal(snap.isSpectator, true);
  assert.equal(snap.hand.length, 0); // Read-only: spectator has no playable hand
  assert.equal(snap.status, 'playing');
  assert.ok(snap.topCard); // Live canvas data is delivered
});

test('validates emote and webrtc signal schemas properly', async () => {
  const { socketSchemas } = await import('./validation.js');
  
  // Valid emote
  const validEmote = socketSchemas.emote.parse({ emote: '🔥', phrase: 'Good game!', sfx: 'buzzer' });
  assert.equal(validEmote.emote, '🔥');
  assert.equal(validEmote.sfx, 'buzzer');

  // Valid WebRTC signal
  const validSignal = socketSchemas.webrtcSignal.parse({
    toUserId: 'user-123',
    signal: { type: 'offer', sdp: 'dummy-sdp' },
    type: 'offer'
  });
  assert.equal(validSignal.toUserId, 'user-123');
  assert.equal(validSignal.type, 'offer');
});

test('anti-cheat: masked state broadcasting prevents network tab/DOM card inspection', () => {
  const game = twoPlayerGame();
  
  // Player A gets snapshot
  const snapA = game.snapshotFor('a');
  const serializedA = JSON.stringify(snapA);
  const parsedA = JSON.parse(serializedA);

  // Player A sees their own 7 cards
  assert.equal(parsedA.hand.length, 7);

  // Opponent B in players array has NO hand property
  const playerB = parsedA.players.find((p: any) => p.id === 'b');
  assert.equal(playerB.handCount, 7);
  assert.equal('hand' in playerB, false);

  // Draw pile is NOT exposed as an array (only drawCount is exposed)
  assert.equal('drawPile' in parsedA, false);
  assert.equal(typeof parsedA.drawCount, 'number');

  // Spectator sees NO hands
  const snapSpec = game.snapshotFor('spec-user');
  const parsedSpec = JSON.parse(JSON.stringify(snapSpec));
  assert.equal(parsedSpec.hand.length, 0);
  assert.equal(parsedSpec.isSpectator, true);
  for (const p of parsedSpec.players) {
    assert.equal('hand' in p, false);
    assert.equal(typeof p.handCount, 'number');
  }
});

test('ludo official rules: clockwise turn order, safe spot protection, and bonus turns', async () => {
  const { RoomManager, initLudoState } = await import('./room-manager.js');
  const ioMock: any = {
    to: () => ({ emit: () => {} }),
    emit: () => {},
    sockets: { adapter: { rooms: new Map() } }
  };
  const rm = new RoomManager(ioMock);
  rm['armTimer'] = () => {};
  rm['armBotTurn'] = () => {};

  const hostUser = { id: 'u1', username: 'Host', isGuest: false };
  const roomInfo = rm.createRoom(hostUser, {
    gameType: 'ludo',
    isPrivate: false,
    maxPlayers: 4,
    botCount: 3,
    autoStart: false,
    targetScore: 500,
    maxRounds: 1,
    rules: {}
  });

  const room = rm['rooms'].get(roomInfo.code)!;
  assert.ok(room);
  assert.equal(room.gameType, 'ludo');
  
  room.users.set(hostUser.id, { id: 's1' } as any);
  room.game.state.players[0].ready = true;
  room.game.startMatch();
  room.game.state.ludoState = initLudoState(room.game.state.players);

  const ls = room.game.state.ludoState!;
  assert.ok(ls);

  // 1. Initial State
  assert.equal(ls.turnColor, 'red');
  assert.equal(ls.tokens.red[0].pos, -1);

  // 2. Rolling a 6 allows bringing out a token to start pos 0
  ls.dice = 6;
  ls.phase = 'awaiting-choice';
  rm.ludoMove(hostUser, room.code, 'red-0');
  assert.equal(ls.tokens.red[0].pos, 0);

  // 3. Move token onto safe star tile index 8 (pos = 8)
  ls.turnColor = 'red';
  ls.dice = 8;
  ls.phase = 'awaiting-choice';
  rm.ludoMove(hostUser, room.code, 'red-0');
  assert.equal(ls.tokens.red[0].pos, 8);

  // 4. Safe spot protection: Green token on track cannot capture Red on safe spot 8
  // Green starts at 13. To reach index 8, Green moves (13 + 47) % 52 = 8 -> Green relative pos 47
  ls.tokens.green[0].pos = 41; // Green moves 6 to reach 47
  ls.turnColor = 'green';
  ls.dice = 6;
  ls.phase = 'awaiting-choice';
  rm['executeLudoMove'](room, 'green', 'green-0');
  assert.equal(ls.tokens.green[0].pos, 47);
  // Red on index 8 is safe and was NOT sent to yard
  assert.equal(ls.tokens.red[0].pos, 8);

  // 5. Capturing opponent on normal tile sends opponent to yard and awards bonus turn
  // Red moves 4 steps to track 10.
  ls.tokens.green[1].pos = 49; // Green at track 10 ((13 + 49) % 52 = 10)
  ls.tokens.red[1].pos = 6; // Red at track 6 moves 4 to track 10
  ls.turnColor = 'red';
  ls.dice = 4;
  ls.phase = 'awaiting-choice';
  rm['executeLudoMove'](room, 'red', 'red-1');

  assert.equal(ls.tokens.red[1].pos, 10);
  assert.equal(ls.tokens.green[1].pos, -1); // Green token was captured and sent to yard!
  assert.equal(ls.turnColor, 'red'); // Red earned a bonus roll for capturing!

  // 6. Home finish exact roll
  ls.tokens.red[2].pos = 54;
  ls.turnColor = 'red';
  ls.dice = 2; // Exact 2 to reach 56
  ls.phase = 'awaiting-choice';
  rm['executeLudoMove'](room, 'red', 'red-2');
  assert.equal(ls.tokens.red[2].pos, 56);
  assert.equal(ls.turnColor, 'red'); // Earned bonus turn for reaching home!

  // Cleanup room timers so test exits cleanly
  if (room.timer) clearTimeout(room.timer);
  if (room.botTimer) clearTimeout(room.botTimer);
});







