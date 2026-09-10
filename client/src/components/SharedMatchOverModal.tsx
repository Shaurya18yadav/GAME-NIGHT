import React from 'react';
import type { GameSnapshot, User } from '../types';

interface SharedMatchOverModalProps {
  user?: User;
  snapshot?: GameSnapshot;
  winnerName?: string;
  gameType?: 'uno' | 'ludo' | 'snake';
  onPlayAgain: () => void;
  onSwitchGame?: (game: 'uno' | 'ludo' | 'snake') => void;
  onExit: () => void;
}

export function SharedMatchOverModal({
  user,
  snapshot,
  winnerName = 'Player 1',
  gameType = 'uno',
  onPlayAgain,
  onSwitchGame,
  onExit
}: SharedMatchOverModalProps) {
  const isHost = user && snapshot?.players[0]?.id === user.id;
  const players = snapshot?.players || [];

  return (
    <div className="modal-backdrop">
      <div
        className="modal panel"
        style={{
          background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
          padding: '2.2rem',
          borderRadius: '1.5rem',
          border: '2px solid #fbbf24',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
          color: '#fff'
        }}
      >
        <span style={{ fontSize: '4rem', display: 'block', marginBottom: '0.4rem' }}>🏆</span>

        <h2 style={{ fontFamily: 'Fredoka, sans-serif', color: '#fbbf24', margin: '0 0 0.4rem 0', fontSize: '2rem' }}>
          MATCH COMPLETED!
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.92rem', margin: '0 0 1.2rem 0' }}>
          {gameType.toUpperCase()} Final Match Standings
        </p>

        {/* WINNER ANNOUNCEMENT */}
        <div style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid #fbbf24', borderRadius: '12px', padding: '0.85rem', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 'bold', textTransform: 'uppercase', display: 'block' }}>
            👑 Champion
          </span>
          <strong style={{ fontSize: '1.4rem', color: '#fff' }}>{winnerName}</strong>
        </div>

        {/* RANKINGS LIST */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {players.map((p, idx) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: idx === 0 ? 'rgba(251,191,36,0.12)' : 'rgba(15,23,42,0.6)',
                border: idx === 0 ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.06)',
                padding: '0.6rem 0.9rem',
                borderRadius: '10px',
                fontSize: '0.88rem'
              }}
            >
              <span style={{ fontWeight: 'bold', color: idx === 0 ? '#fbbf24' : '#cbd5e1' }}>
                {idx === 0 ? '🥇 1st Place' : idx === 1 ? '🥈 2nd Place' : idx === 2 ? '🥉 3rd Place' : `#${idx + 1}`}
              </span>
              <span style={{ fontWeight: 'bold', color: '#fff' }}>{p.username}</span>
            </div>
          ))}
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onPlayAgain}
              style={{ flex: 1, padding: '0.8rem', fontWeight: 'bold', fontSize: '0.92rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            >
              🔄 Play Again (Same Lobby)
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onExit}
              style={{ flex: 1, padding: '0.8rem', fontWeight: 'bold', fontSize: '0.92rem' }}
            >
              🚪 Exit to Hub
            </button>
          </div>

          {isHost && onSwitchGame && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '0.4rem' }}>
                Host Option: Switch Game for Next Match:
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => onSwitchGame('uno')}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '0.45rem', fontSize: '0.78rem' }}
                >
                  🃏 Switch to UNO
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchGame('ludo')}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '0.45rem', fontSize: '0.78rem' }}
                >
                  🎲 Switch to Ludo
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchGame('snake')}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '0.45rem', fontSize: '0.78rem' }}
                >
                  🐍 Switch to Snake
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
