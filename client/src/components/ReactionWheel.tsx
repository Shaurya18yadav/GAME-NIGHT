import React, { useState, useEffect, useRef } from 'react';

export type ReactionWheelProps = {
  onSendEmote: (data: { emote?: string; phrase?: string; sfx?: string }) => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center-modal';
  size?: 'sm' | 'md';
  customLabel?: string;
  showQuickBar?: boolean;
};

const EMOTES = ['🔥', '😂', '😱', '🎉', '👑', '💀', '💥', '🛡️', '🃏', '🎯', '❤️', '👏'];

const PHRASES = [
  'Good game! 🤝',
  'Hurry up! ⏰',
  'Nice move! 👏',
  'Watch this! 🎯',
  'Oops! 🙈',
  'No way! 😱',
  'GG! 🏆',
  'Roll a 6! 🎲'
];

const SOUND_EFFECTS = [
  { id: 'buzzer', label: '🔔 Buzzer', desc: 'Dramatic buzzer chord' },
  { id: 'laugh', label: '😂 Laugh Track', desc: 'Chuckle melody' },
  { id: 'fanfare', label: '🎺 Fanfare', desc: 'Victory arpeggio' },
  { id: 'drumroll', label: '🥁 Drumroll', desc: 'Anticipation roll' },
  { id: 'alert', label: '🚨 Airhorn', desc: 'Staccato alert' },
  { id: 'uno', label: '🃏 Victory Chime', desc: 'Rising victory chime' }
];

export function ReactionWheel({
  onSendEmote,
  position = 'bottom-right',
  size = 'sm',
  customLabel
}: ReactionWheelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'emotes' | 'phrases' | 'sfx'>('emotes');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectEmote = (emote: string) => {
    onSendEmote({ emote });
    setIsOpen(false);
  };

  const handleSelectPhrase = (phrase: string) => {
    onSendEmote({ phrase });
    setIsOpen(false);
  };

  const handleSelectSFX = (sfxId: string) => {
    onSendEmote({ sfx: sfxId });
    setIsOpen(false);
  };

  // Determine popup placement styles
  const getModalPositionStyle = (): React.CSSProperties => {
    if (position === 'center-modal') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 99999
      };
    }
    if (position === 'top-right') {
      return {
        position: 'fixed',
        top: '64px',
        right: '16px',
        zIndex: 99999
      };
    }
    if (position === 'top-left') {
      return {
        position: 'fixed',
        top: '64px',
        left: '16px',
        zIndex: 99999
      };
    }
    if (position === 'bottom-left') {
      return {
        position: 'absolute',
        bottom: 'calc(100% + 10px)',
        left: 0,
        zIndex: 99999
      };
    }
    // Default: bottom-right
    return {
      position: 'absolute',
      bottom: 'calc(100% + 10px)',
      right: 0,
      zIndex: 99999
    };
  };

  return (
    <div
      ref={containerRef}
      className={`reaction-wheel-container ${position}`}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', zIndex: isOpen ? 99999 : 10 }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="icon-btn-pill reaction-trigger-btn"
        title="Quick Reactions & Emotes"
        style={{
          background: isOpen ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(37, 50, 70, 0.85)',
          color: '#ffffff',
          border: isOpen ? '1.5px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '0.5rem',
          padding: size === 'sm' ? '0.28rem 0.65rem' : '0.45rem 0.9rem',
          fontSize: size === 'sm' ? '0.8rem' : '0.88rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          boxShadow: isOpen ? '0 0 14px rgba(245,158,11,0.6)' : '0 2px 8px rgba(0,0,0,0.3)',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap'
        }}
      >
        <span>🎯</span>
        <span>{customLabel || 'Reactions'}</span>
      </button>

      {/* Universal Dismissal Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="reaction-wheel-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(3px)',
            zIndex: 99990
          }}
        />
      )}

      {/* Popup Wheel Modal */}
      {isOpen && (
        <div
          className="reaction-wheel-modal"
          style={{
            ...getModalPositionStyle(),
            width: '300px',
            maxWidth: 'calc(100vw - 32px)',
            background: 'rgba(15, 23, 42, 0.98)',
            backdropFilter: 'blur(24px)',
            border: '2px solid rgba(251, 191, 36, 0.6)',
            borderRadius: '16px',
            padding: '0.9rem',
            boxShadow: '0 25px 60px rgba(0,0,0,0.9), 0 0 35px rgba(245,158,11,0.3)',
            animation: 'reactionPopIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Header with Title and Close Button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid rgba(255,255,255,0.12)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontSize: '1.1rem' }}>🎯</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.02em' }}>
                Quick Reactions
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#94a3b8',
                fontSize: '0.9rem',
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.4)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.color = '#94a3b8';
              }}
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>

          {/* Category Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '0.3rem',
              marginBottom: '0.85rem',
              background: 'rgba(30,41,59,0.95)',
              padding: '0.3rem',
              borderRadius: '10px'
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('emotes')}
              style={{
                flex: 1,
                border: 'none',
                background: activeTab === 'emotes' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
                color: activeTab === 'emotes' ? '#ffffff' : '#94a3b8',
                fontSize: '0.78rem',
                fontWeight: 800,
                padding: '0.4rem 0.3rem',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              🎭 Emotes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('phrases')}
              style={{
                flex: 1,
                border: 'none',
                background: activeTab === 'phrases' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
                color: activeTab === 'phrases' ? '#ffffff' : '#94a3b8',
                fontSize: '0.78rem',
                fontWeight: 800,
                padding: '0.4rem 0.3rem',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              💬 Phrases
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sfx')}
              style={{
                flex: 1,
                border: 'none',
                background: activeTab === 'sfx' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
                color: activeTab === 'sfx' ? '#ffffff' : '#94a3b8',
                fontSize: '0.78rem',
                fontWeight: 800,
                padding: '0.4rem 0.3rem',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              🔊 SFX
            </button>
          </div>

          {/* Emotes Grid */}
          {activeTab === 'emotes' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {EMOTES.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSelectEmote(emoji)}
                  style={{
                    fontSize: '1.5rem',
                    background: 'rgba(30,41,59,0.85)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    padding: '0.5rem 0.2rem',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, background 0.15s ease, border-color 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.25)';
                    e.currentTarget.style.background = 'rgba(245,158,11,0.3)';
                    e.currentTarget.style.borderColor = '#fbbf24';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.background = 'rgba(30,41,59,0.85)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Quick Phrases List */}
          {activeTab === 'phrases' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
              {PHRASES.map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => handleSelectPhrase(phrase)}
                  style={{
                    textAlign: 'left',
                    background: 'rgba(30,41,59,0.85)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '0.5rem 0.75rem',
                    color: '#f1f5f9',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(245,158,11,0.3)';
                    e.currentTarget.style.color = '#fbbf24';
                    e.currentTarget.style.borderColor = '#fbbf24';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(30,41,59,0.85)';
                    e.currentTarget.style.color = '#f1f5f9';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  }}
                >
                  {phrase}
                </button>
              ))}
            </div>
          )}

          {/* Sound Effects List */}
          {activeTab === 'sfx' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {SOUND_EFFECTS.map((sfx) => (
                <button
                  key={sfx.id}
                  type="button"
                  onClick={() => handleSelectSFX(sfx.id)}
                  style={{
                    textAlign: 'left',
                    background: 'rgba(30,41,59,0.85)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '0.5rem 0.75rem',
                    color: '#f1f5f9',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(245,158,11,0.3)';
                    e.currentTarget.style.borderColor = '#fbbf24';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(30,41,59,0.85)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fbbf24' }}>{sfx.label}</span>
                  <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>{sfx.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
