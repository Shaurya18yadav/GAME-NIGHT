import React, { useState } from 'react';
import type { RoomMeta, GameSnapshot } from '../types';

type ShareInviteModalProps = {
  roomCode: string;
  gameType?: 'uno' | 'ludo' | 'snake';
  roomMeta?: RoomMeta;
  snapshot?: GameSnapshot;
  onClose: () => void;
};

export function ShareInviteModal({ roomCode, gameType = 'uno', roomMeta, snapshot, onClose }: ShareInviteModalProps) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = `${window.location.origin}/join/${roomCode.trim().toUpperCase()}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => undefined);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join my ${gameType.toUpperCase()} match on GameHub!`,
          text: `Enter Room #${roomCode} to play ${gameType.toUpperCase()} with me!`,
          url: inviteUrl
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const status = snapshot?.status || roomMeta?.status || 'waiting';
  const playerCount = snapshot?.players?.length ?? roomMeta?.players ?? 1;
  const maxPlayers = snapshot?.gameType === 'ludo' ? 4 : (roomMeta?.maxPlayers || 10);

  return (
    <div className="modal-backdrop" style={{ zIndex: 9999 }}>
      <div
        className="modal panel"
        style={{
          background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
          border: '2px solid #fbbf24',
          borderRadius: '24px',
          padding: '2rem',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
          textAlign: 'center',
          animation: 'fadeIn 0.2s ease'
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '0.4rem' }}>
          {gameType === 'ludo' ? '🎲' : gameType === 'snake' ? '🐍' : '🃏'}
        </div>

        <h2 style={{ fontFamily: 'Fredoka, sans-serif', color: '#fbbf24', margin: '0.2rem 0' }}>
          INVITE PLAYERS
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '0.2rem 0 1.2rem 0' }}>
          Share this direct link with friends to jump straight into the room!
        </p>

        {/* Room Info Tag */}
        <div
          style={{
            background: 'rgba(30,41,59,0.8)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '14px',
            padding: '0.8rem 1rem',
            marginBottom: '1.2rem',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center'
          }}
        >
          <div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>Room Code</span>
            <strong style={{ color: '#fff', fontSize: '1.1rem', fontFamily: 'Space Mono, monospace', letterSpacing: '1px' }}>
              {roomCode}
            </strong>
          </div>
          <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.1)' }} />
          <div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>Capacity</span>
            <strong style={{ color: '#38bdf8', fontSize: '1rem' }}>
              {playerCount}/{maxPlayers} Players
            </strong>
          </div>
          <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.1)' }} />
          <div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>Status</span>
            <strong style={{ color: status === 'playing' ? '#fbbf24' : '#4ade80', fontSize: '0.85rem' }}>
              {status === 'playing' ? '⚡ Live Match' : '🟢 In Lobby'}
            </strong>
          </div>
        </div>

        {/* Shareable Link Box */}
        <div
          style={{
            background: '#020617',
            border: '1.5px solid rgba(251,191,36,0.3)',
            borderRadius: '12px',
            padding: '0.7rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            marginBottom: '1.2rem'
          }}
        >
          <span
            style={{
              color: '#38bdf8',
              fontFamily: 'Space Mono, monospace',
              fontSize: '0.82rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'left'
            }}
          >
            {inviteUrl}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="btn btn-primary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="btn btn-primary"
              style={{ flex: 1, padding: '0.75rem', fontSize: '0.92rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
            >
              📤 Share Invite
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ flex: 1, padding: '0.75rem', fontSize: '0.92rem' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
