import React, { useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { GameSnapshot, RoomMeta, User } from '../types';
import { GameChatPanel } from './GameChatPanel';
import { ReactionWheel } from './ReactionWheel';
import { VoiceChatBar } from './VoiceChatBar';
import { ShareInviteModal } from './ShareInviteModal';

interface CommonPreMatchLobbyProps {
  user?: User;
  roomMeta?: RoomMeta;
  snapshot?: GameSnapshot;
  socket?: Socket | null;
  onToggleReady: () => void;
  onStartMatch: () => void;
  onLeaveRoom: () => void;
  onSwitchGame?: (gameType: 'uno' | 'ludo' | 'snake') => void;
  onClaimSeat?: () => void;
  onSelectLudoColor?: (color: 'red' | 'green' | 'yellow' | 'blue') => void;
  onAddBot?: () => void;
  onRemoveBot?: (botId: string) => void;
  onSendChat?: (text: string) => void;
  onReactChat?: (messageId: string, emoji: string) => void;
  onSendEmote?: (data: { emote?: string; phrase?: string; sfx?: string }) => void;
}

export function CommonPreMatchLobby({
  user,
  roomMeta,
  snapshot,
  socket,
  onToggleReady,
  onStartMatch,
  onLeaveRoom,
  onSwitchGame,
  onClaimSeat,
  onSelectLudoColor,
  onAddBot,
  onRemoveBot,
  onSendChat,
  onReactChat,
  onSendEmote
}: CommonPreMatchLobbyProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const roomCode = snapshot?.roomId || roomMeta?.code || '------';
  const gameType = snapshot?.gameType || roomMeta?.gameType || 'uno';
  const players = snapshot?.players || [];
  const me = players.find((p) => p.isYou || p.id === user?.id);
  const isHost = Boolean(
    (roomMeta?.hostId && (user?.id === roomMeta.hostId || me?.id === roomMeta.hostId)) ||
    me?.isHost
  );
  const minPlayers = gameType === 'snake' ? 1 : 2;
  const allReady = players.length >= minPlayers && players.every((p) => p.ready);

  const inviteUrl = `${window.location.origin}/join/${roomCode.trim().toUpperCase()}`;

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }).catch(() => undefined);
  };

  return (
    <div className="landing-v2-container" style={{ minHeight: '85vh', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        style={{
          maxWidth: '850px',
          width: '100%',
          background: 'linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,41,59,0.9))',
          border: `1.5px solid ${gameType === 'ludo' ? '#3b82f6' : gameType === 'snake' ? '#10b981' : '#2dd4bf'}66`,
          borderRadius: '1.5rem',
          padding: '2rem',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
        }}
      >
        {/* SPECTATOR ALERT BANNER */}
        {snapshot?.isSpectator && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.1))',
              border: '1.5px solid #f59e0b',
              borderRadius: '12px',
              padding: '0.9rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.8rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.4rem' }}>👀</span>
              <div>
                <strong style={{ color: '#fbbf24', fontSize: '0.92rem', display: 'block' }}>
                  You are in Spectator Mode
                </strong>
                <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                  {gameType === 'ludo'
                    ? 'Ludo Kingdom has a strict 4-player capacity.'
                    : 'You are currently observing the pre-match lobby.'}
                </span>
              </div>
            </div>

            {onClaimSeat && players.length < (roomMeta?.maxPlayers || (gameType === 'ludo' ? 4 : 10)) && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onClaimSeat}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.82rem',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#fff',
                  boxShadow: '0 4px 15px rgba(245,158,11,0.3)'
                }}
              >
                🙋 Claim Open Player Seat
              </button>
            )}
          </div>
        )}
        {/* ROOM HEADER & INVITE BAR */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <span
                style={{
                  background: gameType === 'ludo' ? '#3b82f622' : gameType === 'snake' ? '#10b98122' : '#2dd4bf22',
                  border: `1px solid ${gameType === 'ludo' ? '#3b82f6' : gameType === 'snake' ? '#10b981' : '#2dd4bf'}55`,
                  color: gameType === 'ludo' ? '#60a5fa' : gameType === 'snake' ? '#4ade80' : '#2dd4bf',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '0.25rem 0.65rem',
                  borderRadius: '999px',
                  textTransform: 'uppercase'
                }}
              >
                {gameType === 'ludo' ? '🎲 Ludo Kingdom Lobby' : gameType === 'snake' ? '🐍 Snake Classic Lobby' : '🃏 UNO Night Lobby'}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                • {roomMeta?.isPrivate ? '🔒 Private Room' : '🌐 Public Table'}
              </span>
            </div>

            <h1 style={{ fontSize: '1.8rem', margin: 0, fontFamily: 'Fredoka, sans-serif', color: '#fff' }}>
              Room Code: <strong style={{ color: '#fbbf24', letterSpacing: '2px', fontFamily: 'Space Mono, monospace' }}>{roomCode}</strong>
            </h1>

            {isHost && onSwitchGame && (
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginRight: '0.2rem', fontWeight: 600 }}>👑 Host Switch Game:</span>
                <button
                  type="button"
                  className={`btn ${gameType === 'uno' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => onSwitchGame('uno')}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '8px' }}
                >
                  🃏 UNO
                </button>
                <button
                  type="button"
                  className={`btn ${gameType === 'ludo' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => onSwitchGame('ludo')}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '8px' }}
                >
                  🎲 LUDO
                </button>
                <button
                  type="button"
                  className={`btn ${gameType === 'snake' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => onSwitchGame('snake')}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '8px' }}
                >
                  🐍 SNAKE
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <VoiceChatBar
              socket={socket || null}
              currentUserId={user?.id || ''}
              roomCode={roomCode}
              players={players}
            />
            {onSendEmote && (
              <ReactionWheel onSendEmote={onSendEmote} position="bottom-right" />
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowInviteModal(true)}
              style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}
            >
              🔗 Invite Friends
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={copyInviteLink}
              style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}
            >
              {copiedLink ? '✓ Link Copied!' : '📋 Copy Link'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onLeaveRoom}
              style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', borderColor: 'rgba(239,68,68,0.4)', color: '#fca5a5' }}
            >
              🚪 Exit
            </button>
          </div>
        </div>

        {/* LOBBY PLAYER GRID & PRE-MATCH CONFIG */}
        {gameType === 'ludo' ? (
          /* ============================================================ */
          /* [ GAME = LUDO PRE-MATCH LOBBY ]                             */
          /* ============================================================ */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#60a5fa', margin: 0 }}>
                🎨 Color Selection & Token Slots ({players.length}/4 Players)
              </h3>
              {isHost && players.length < 4 && onAddBot && (
                <button
                  type="button"
                  onClick={onAddBot}
                  style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid #3b82f6', color: '#60a5fa', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  + Add AI Bot 🤖
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {(['red', 'green', 'yellow', 'blue'] as const).map((color, idx) => {
                const colorConfig = {
                  red: { name: 'Red Pawn', color: '#ef4444', emoji: '🔴' },
                  green: { name: 'Green Pawn', color: '#10b981', emoji: '🟩' },
                  yellow: { name: 'Yellow Pawn', color: '#f59e0b', emoji: '🟡' },
                  blue: { name: 'Blue Pawn', color: '#3b82f6', emoji: '🔵' }
                }[color];

                const assignedPlayer = players.find((p) => p.ludoColor === color);
                const isMyColor = me?.ludoColor === color || (!me?.ludoColor && me?.id === players[0]?.id && color === 'red');
                const canPickColor = !assignedPlayer || assignedPlayer.id === me?.id;

                return (
                  <div
                    key={color}
                    onClick={() => canPickColor && onSelectLudoColor?.(color)}
                    style={{
                      background: isMyColor ? 'rgba(30,41,59,0.95)' : 'rgba(15,23,42,0.8)',
                      border: isMyColor ? `2px solid ${colorConfig.color}` : canPickColor ? '1px dashed rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'center',
                      cursor: canPickColor ? 'pointer' : 'not-allowed',
                      boxShadow: isMyColor ? `0 0 15px ${colorConfig.color}66` : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>{colorConfig.emoji}</div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: colorConfig.color, textTransform: 'uppercase' }}>
                      {colorConfig.name}
                    </div>

                    <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
                      {assignedPlayer ? (
                        <div>
                          <strong>{assignedPlayer.username} {assignedPlayer.id === me?.id ? '(You)' : ''}</strong>
                          {assignedPlayer.isBot && <span style={{ fontSize: '0.7rem', background: '#3b82f622', color: '#60a5fa', padding: '0.1rem 0.4rem', borderRadius: '4px', marginLeft: '0.3rem' }}>BOT</span>}
                          {assignedPlayer.ready && <div style={{ color: '#4ade80', fontSize: '0.75rem', fontWeight: 'bold', marginTop: '0.2rem' }}>✓ Ready</div>}
                        </div>
                      ) : (
                        <span style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '0.8rem', background: 'rgba(59,130,246,0.15)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                          👉 Click to Pick
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* LUDO ACTIVE RULES PREVIEW */}
            <div style={{ background: 'rgba(15,23,42,0.5)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.25)', marginBottom: '1.5rem' }}>
              <strong style={{ fontSize: '0.85rem', color: '#60a5fa', display: 'block', marginBottom: '0.4rem' }}>
                ⚙️ Active Ludo Kingdom Rules:
              </strong>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.82rem', color: '#cbd5e1' }}>
                <span>🎨 Pawn Colors: <strong>Red 🔴 Green 🟩 Yellow 🟡 Blue 🔵</strong></span>
                <span>⭐️ Safe Zones: <strong>Star Spots & Home Track</strong></span>
                <span>🎲 Dice Roll: <strong>Bonus Turn on 6 or Capture</strong></span>
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* [ GAME = UNO PRE-MATCH LOBBY ]                              */
          /* ============================================================ */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#2dd4bf', margin: 0 }}>
                👥 Player Seats & Ready Status ({players.length}/{roomMeta?.maxPlayers || 10} Players)
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {players.map((p, idx) => (
                <div
                  key={p.id}
                  style={{
                    background: p.isYou ? 'rgba(45,212,191,0.1)' : 'rgba(15,23,42,0.8)',
                    border: p.isYou ? '1.5px solid #2dd4bf' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ background: p.isBot ? '#38bdf8' : '#2dd4bf', color: '#0f172a', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                      {p.isBot ? '🤖' : (p.username.slice(0, 2).toUpperCase())}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#fff' }}>
                        {p.username} {p.isYou && '(You)'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {p.isHost || p.id === roomMeta?.hostId ? '👑 Room Host' : p.isBot ? 'AI Bot' : 'Player'}
                      </div>
                    </div>
                  </div>

                  <div>
                    {p.ready ? (
                      <span style={{ fontSize: '0.78rem', background: 'rgba(34,197,94,0.2)', color: '#4ade80', padding: '0.25rem 0.6rem', borderRadius: '6px', fontWeight: 'bold' }}>
                        ✓ READY
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.78rem', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>
                        NOT READY
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* HOST HOUSE RULES PREVIEW */}
            {gameType === 'snake' ? (
              <div style={{ background: 'rgba(15,23,42,0.5)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.25)', marginBottom: '1.5rem' }}>
                <strong style={{ fontSize: '0.85rem', color: '#4ade80', display: 'block', marginBottom: '0.4rem' }}>
                  ⚙️ Active Snake Classic Settings:
                </strong>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.82rem', color: '#cbd5e1' }}>
                  <span>🟩 Grid Arena: <strong>20x20 Grid</strong></span>
                  <span>🍎 Special Food: <strong>Red (+50pts) & Golden (+150pts) Apples</strong></span>
                  <span>🏆 Scoreboard: <strong>Arcade Rating Tracking</strong></span>
                </div>
              </div>
            ) : (
              <div style={{ background: 'rgba(15,23,42,0.5)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.5rem' }}>
                <strong style={{ fontSize: '0.85rem', color: '#2dd4bf', display: 'block', marginBottom: '0.4rem' }}>
                  ⚙️ Active House Rules:
                </strong>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.82rem', color: '#cbd5e1' }}>
                  <span>⚡ Stacking: <strong>{roomMeta?.rules?.stacking ? 'ON' : 'OFF'}</strong></span>
                  <span>🔄 7-0 Swap: <strong>{roomMeta?.rules?.sevenZero ? 'ON' : 'OFF'}</strong></span>
                  <span>⚡ Jump-in: <strong>{roomMeta?.rules?.jumpIn ? 'ON' : 'OFF'}</strong></span>
                </div>
              </div>
            )}

            {/* PRE-MATCH LOBBY LIVE CHAT */}
            {onSendChat && (
              <div className="lobby-chat-container">
                <GameChatPanel
                  chat={snapshot?.chat || []}
                  onSend={onSendChat}
                  onReact={onReactChat}
                  title="PRE-MATCH LOBBY CHAT"
                />
              </div>
            )}
          </div>
        )}

        {/* BOTTOM ACTION BAR */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {snapshot?.isSpectator ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.88rem', background: 'rgba(255,255,255,0.05)', padding: '0.6rem 1.2rem', borderRadius: '8px' }}>
              <span>👀 Spectating Lobby</span>
            </div>
          ) : (
            <button
              type="button"
              className={`btn ${me?.ready ? 'btn-secondary' : 'btn-primary'}`}
              onClick={onToggleReady}
              style={{ padding: '0.8rem 1.6rem', fontSize: '1rem', fontWeight: 'bold' }}
            >
              {me?.ready ? '✓ You Are Ready (Click to Unready)' : '👍 Mark I\'m Ready'}
            </button>
          )}

          {isHost ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!allReady}
              onClick={onStartMatch}
              style={{
                background: allReady ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(255,255,255,0.1)',
                color: allReady ? '#fff' : '#94a3b8',
                cursor: allReady ? 'pointer' : 'not-allowed',
                padding: '0.8rem 2rem',
                fontSize: '1rem',
                fontWeight: 'bold',
                boxShadow: allReady ? '0 10px 25px rgba(16,185,129,0.35)' : 'none'
              }}
            >
              {allReady ? '🚀 Start Match Now!' : 'Waiting for Players to Ready up...'}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              disabled
              style={{ padding: '0.8rem 1.6rem', fontSize: '0.9rem', opacity: 0.8, cursor: 'default' }}
            >
              ⏳ Waiting for Host ({players.find((p) => p.isHost || p.id === roomMeta?.hostId)?.username || roomMeta?.host || 'Host'}) to start match...
            </button>
          )}
        </div>
      </div>

      {showInviteModal && (
        <ShareInviteModal
          roomCode={roomCode}
          gameType={gameType}
          roomMeta={roomMeta}
          snapshot={snapshot}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}
