import { useEffect, useState } from 'react';
import { soundEffects } from '../utils/soundEffects';

export type EmoteBroadcastEvent = {
  senderId: string;
  senderUsername: string;
  emote?: string;
  phrase?: string;
  sfx?: string;
  timestamp: number;
};

type FloatingItem = EmoteBroadcastEvent & {
  id: string;
  xOffset: number;
};

type FloatingReactionOverlayProps = {
  activeEmotes: EmoteBroadcastEvent[];
};

export function FloatingReactionOverlay({ activeEmotes }: FloatingReactionOverlayProps) {
  const [items, setItems] = useState<FloatingItem[]>([]);

  useEffect(() => {
    if (!activeEmotes.length) return;
    const latest = activeEmotes[activeEmotes.length - 1];
    if (!latest) return;

    // Play SFX if present
    try {
      if (latest.sfx) {
        soundEffects.playSFX(latest.sfx);
      } else if (latest.emote) {
        soundEffects.playSFX('pop');
      } else {
        soundEffects.playSFX('pop');
      }
    } catch {}

    const newItem: FloatingItem = {
      ...latest,
      id: `${latest.senderId}-${latest.timestamp}-${Math.random()}`,
      xOffset: (Math.random() - 0.5) * 140 // wider dynamic spread
    };

    setItems((prev) => [...prev.slice(-8), newItem]);

    const timer = setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== newItem.id));
    }, 2800);

    return () => clearTimeout(timer);
  }, [activeEmotes]);

  if (!items.length) return null;

  return (
    <div
      className="floating-reaction-container"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 99998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            position: 'absolute',
            bottom: '28%',
            left: `calc(50% + ${item.xOffset}px)`,
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.96))',
            border: '2px solid #fbbf24',
            borderRadius: '24px',
            padding: '0.65rem 1.4rem',
            boxShadow: '0 15px 45px rgba(0,0,0,0.8), 0 0 30px rgba(251,191,36,0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.7rem',
            animation: 'floatUpAndFade 2.8s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        >
          {item.emote && (
            <span style={{ fontSize: '2.4rem', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))', transform: 'scale(1.1)' }}>
              {item.emote}
            </span>
          )}
          {item.phrase && (
            <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '0.3px', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
              "{item.phrase}"
            </span>
          )}
          {item.sfx && (
            <span style={{ color: '#38bdf8', fontWeight: 800, fontSize: '1.05rem', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
              🔊 {item.sfx.toUpperCase()}!
            </span>
          )}
          <span style={{ color: '#94a3b8', fontSize: '0.8rem', marginLeft: '0.3rem', fontWeight: 700, background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '6px' }}>
            {item.senderUsername}
          </span>
        </div>
      ))}

      <style>{`
        @keyframes floatUpAndFade {
          0% {
            opacity: 0;
            transform: translate(-50%, 30px) scale(0.6);
          }
          15% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1.15);
          }
          25% {
            transform: translate(-50%, -10px) scale(1);
          }
          65% {
            opacity: 1;
            transform: translate(-50%, -70px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -150px) scale(0.85);
          }
        }
      `}</style>
    </div>
  );
}
