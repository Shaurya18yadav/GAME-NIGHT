import React, { useState } from 'react';

interface RulebookModalProps {
  onClose: () => void;
  initialTab?: 'uno' | 'ludo' | 'snake';
}

export function RulebookModal({ onClose, initialTab = 'uno' }: RulebookModalProps) {
  const [activeTab, setActiveTab] = useState<'uno' | 'ludo' | 'snake'>(initialTab);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
          padding: '2rem',
          borderRadius: '1.5rem',
          border: '1px solid rgba(45,212,191,0.3)',
          maxWidth: '650px',
          width: '100%',
          boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
          color: '#fff'
        }}
      >
        <button className="close" onClick={onClose}>×</button>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'Fredoka, sans-serif', color: '#2dd4bf', margin: 0, fontSize: '1.8rem' }}>
            📖 Official Rulebook & How to Play
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '0.4rem 0 0 0' }}>
            Master the rules, scoring, and house variants across all GameNight Arena titles.
          </p>
        </div>

        {/* TABS HEADER */}
        <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.8rem' }}>
          <button
            type="button"
            className={`btn ${activeTab === 'uno' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('uno')}
            style={{ flex: 1, padding: '0.6rem', fontSize: '0.88rem', fontWeight: 'bold' }}
          >
            🃏 UNO Night
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'ludo' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('ludo')}
            style={{ flex: 1, padding: '0.6rem', fontSize: '0.88rem', fontWeight: 'bold' }}
          >
            🎲 Ludo Kingdom
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'snake' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('snake')}
            style={{ flex: 1, padding: '0.6rem', fontSize: '0.88rem', fontWeight: 'bold' }}
          >
            🐍 Snake Classic
          </button>
        </div>

        {/* RULES CONTENT */}
        <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
          {activeTab === 'uno' && (
            <div>
              <h3 style={{ color: '#ef4444', marginTop: 0 }}>🃏 UNO Night Rules:</h3>
              <ol style={{ lineHeight: 1.8, color: '#cbd5e1', fontSize: '0.9rem' }}>
                <li>Match the top card of the discard pile by matching color, number, or action symbol.</li>
                <li><strong>Skip (🚫)</strong>: Next player loses their turn.</li>
                <li><strong>Reverse (🔄)</strong>: Reverses the direction of play.</li>
                <li><strong>Draw Two (+2)</strong>: Next player draws 2 cards and skips turn unless Stacking is ON.</li>
                <li><strong>Wild Card (🎨)</strong>: Choose the active color for the table.</li>
                <li><strong>Wild Draw Four (+4)</strong>: Choose active color and force next player to draw 4 cards.</li>
                <li>Press <strong>UNO!</strong> button when holding exactly 1 card left to avoid penalty!</li>
                <li><strong>House Variants</strong>: Stacking (+2/+4 stack), 7-0 Swap & Pass, Jump-in.</li>
              </ol>
            </div>
          )}

          {activeTab === 'ludo' && (
            <div>
              <h3 style={{ color: '#3b82f6', marginTop: 0 }}>🎲 Ludo Kingdom Rules:</h3>
              <ol style={{ lineHeight: 1.8, color: '#cbd5e1', fontSize: '0.9rem' }}>
                <li>Roll a <strong>6</strong> on the 3D die to move a token out of your Home Yard onto the track.</li>
                <li>Advance your tokens clockwise along the 52-tile track according to your die roll.</li>
                <li>Landing on an opponent's token captures it and sends it back to their yard (except on safe star spots ⭐️).</li>
                <li>Rolling a 6 or capturing an opponent token grants an extra die roll turn.</li>
                <li>Bring all 4 tokens into the central Home Triangle to win!</li>
              </ol>
            </div>
          )}

          {activeTab === 'snake' && (
            <div>
              <h3 style={{ color: '#10b981', marginTop: 0 }}>🐍 Snake Classic Rules:</h3>
              <ol style={{ lineHeight: 1.8, color: '#cbd5e1', fontSize: '0.9rem' }}>
                <li>Use Arrow Keys or W/A/S/D to steer your snake around the grid.</li>
                <li>Chomp Red Apples (+50 pts) and Golden Apples (+150 pts) to grow length.</li>
                <li>Avoid running into outer boundary walls or biting your own tail.</li>
                <li>Climb the global arcade high-score leaderboard!</li>
              </ol>
            </div>
          )}
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ padding: '0.65rem 2rem' }}>
            Got It! Close Rulebook
          </button>
        </div>
      </div>
    </div>
  );
}
