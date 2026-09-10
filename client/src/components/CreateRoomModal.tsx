import React, { useState } from 'react';
import { api } from '../api';
import type { RoomMeta } from '../types';

interface CreateRoomModalProps {
  onClose: () => void;
  onRoomCreated: (room: RoomMeta, inviteUrl: string) => void;
  initialGameType?: 'uno' | 'ludo' | 'snake';
}

export function CreateRoomModal({ onClose, onRoomCreated, initialGameType = 'uno' }: CreateRoomModalProps) {
  const [gameType, setGameType] = useState<'uno' | 'ludo' | 'snake'>(initialGameType);
  const [isPrivate, setIsPrivate] = useState(true);
  const [maxPlayers, setMaxPlayers] = useState(gameType === 'ludo' ? 4 : 4);
  const [botCount, setBotCount] = useState(0);
  const [rules, setRules] = useState({ stacking: true, sevenZero: false, jumpIn: false });
  const [targetScore, setTargetScore] = useState(500);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGameTypeChange = (type: 'uno' | 'ludo' | 'snake') => {
    setGameType(type);
    if (type === 'ludo') {
      setMaxPlayers(4);
      if (botCount > 3) setBotCount(3);
    } else if (type === 'snake') {
      setMaxPlayers(1);
      setBotCount(0);
    } else {
      setMaxPlayers(4);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setErrorMsg('');

    try {
      const res = await api.createRoom({
        gameType,
        isPrivate,
        maxPlayers,
        botCount,
        targetScore,
        maxRounds: 5,
        rules
      });
      onRoomCreated(res.room, res.inviteUrl);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create room.');
      setIsCreating(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
          padding: '2rem',
          borderRadius: '1.5rem',
          border: '2px solid rgba(45,212,191,0.3)',
          maxWidth: '520px',
          width: '100%',
          boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
          color: '#fff'
        }}
      >
        <button className="close" onClick={onClose}>×</button>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'Fredoka, sans-serif', color: '#2dd4bf', margin: 0, fontSize: '1.8rem' }}>
            ➕ Create Game Hub Room
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '0.4rem 0 0 0' }}>
            Choose your game mode & configure pre-match room rules.
          </p>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* STEP 1: GAME SELECTOR TABS */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 'bold', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              1. Select Game Engine:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
              <button
                type="button"
                className={`btn ${gameType === 'uno' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleGameTypeChange('uno')}
                style={{ padding: '0.65rem 0.5rem', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 'bold' }}
              >
                🃏 UNO
              </button>
              <button
                type="button"
                className={`btn ${gameType === 'ludo' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleGameTypeChange('ludo')}
                style={{ padding: '0.65rem 0.5rem', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 'bold' }}
              >
                🎲 LUDO
              </button>
              <button
                type="button"
                className={`btn ${gameType === 'snake' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleGameTypeChange('snake')}
                style={{ padding: '0.65rem 0.5rem', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 'bold' }}
              >
                🐍 SNAKE
              </button>
            </div>
          </div>

          {/* STEP 2: PLAYER LIMITS & PRIVACY */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 'bold', marginBottom: '0.4rem' }}>
                Max Players:
              </label>
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                style={{ width: '100%', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '0.6rem', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
              >
                {gameType === 'uno' && [2, 3, 4, 6, 8, 10].map((n) => <option key={n} value={n}>{n} Players</option>)}
                {gameType === 'ludo' && [2, 3, 4].map((n) => <option key={n} value={n}>{n} Players</option>)}
                {gameType === 'snake' && [1, 2].map((n) => <option key={n} value={n}>{n} Player{n > 1 ? 's' : ''}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 'bold', marginBottom: '0.4rem' }}>
                Bot Fill Count:
              </label>
              <select
                value={botCount}
                onChange={(e) => setBotCount(Number(e.target.value))}
                style={{ width: '100%', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '0.6rem', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
              >
                {[0, 1, 2, 3].filter((b) => b < maxPlayers).map((b) => <option key={b} value={b}>{b} AI Bot{b !== 1 ? 's' : ''}</option>)}
              </select>
            </div>
          </div>

          {/* STEP 3: GAME SPECIFIC RULE CONFIG */}
          {gameType === 'uno' && (
            <div style={{ background: 'rgba(15,23,42,0.6)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '0.82rem', color: '#2dd4bf', fontWeight: 'bold', display: 'block', marginBottom: '0.6rem' }}>
                🃏 UNO House Rules:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rules.stacking}
                    onChange={(e) => setRules({ ...rules, stacking: e.target.checked })}
                  />
                  <span>⚡ Stacking (+2 and +4 cards stack penalty)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rules.sevenZero}
                    onChange={(e) => setRules({ ...rules, sevenZero: e.target.checked })}
                  />
                  <span>🔄 7-0 Swap & Pass (Swap hands on 7 / rotate on 0)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rules.jumpIn}
                    onChange={(e) => setRules({ ...rules, jumpIn: e.target.checked })}
                  />
                  <span>⚡ Jump-in Rule (Play identical card out of turn)</span>
                </label>
              </div>
            </div>
          )}

          {gameType === 'ludo' && (
            <div style={{ background: 'rgba(15,23,42,0.6)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '0.82rem', color: '#3b82f6', fontWeight: 'bold', display: 'block', marginBottom: '0.4rem' }}>
                🎲 Ludo Kingdom Settings:
              </span>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                Includes 4-digit room code, 52-tile track with safe star spots, 4 tokens per player, and 3D rolling dice.
              </p>
            </div>
          )}

          {gameType === 'snake' && (
            <div style={{ background: 'rgba(15,23,42,0.6)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 'bold', display: 'block', marginBottom: '0.4rem' }}>
                🐍 Snake Classic Settings:
              </span>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                Endless arcade mode with 20x20 grid, wall collisions, special food items, and high score tracking.
              </p>
            </div>
          )}

          {/* ROOM PRIVACY */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15,23,42,0.4)', padding: '0.65rem 0.8rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Room Visibility:</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className={`btn ${isPrivate ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setIsPrivate(true)}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
              >
                🔒 Private
              </button>
              <button
                type="button"
                className={`btn ${!isPrivate ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setIsPrivate(false)}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
              >
                🌐 Public
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreating}
            style={{
              background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
              border: 'none',
              borderRadius: '10px',
              padding: '0.85rem',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(13,148,136,0.35)',
              marginTop: '0.4rem'
            }}
          >
            {isCreating ? 'Creating Room...' : `Create & Launch ${gameType.toUpperCase()} Lobby →`}
          </button>
        </form>
      </div>
    </div>
  );
}
