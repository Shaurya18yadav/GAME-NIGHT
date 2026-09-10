import React, { useEffect, useRef, useState } from 'react';
import type { GameSnapshot } from '../types';

export type ChatMessageItem = NonNullable<GameSnapshot['chat']>[number];

interface GameChatPanelProps {
  chat?: ChatMessageItem[];
  onSend: (text: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onClose?: () => void;
  title?: string;
  className?: string;
  isCollapsible?: boolean;
}

const QUICK_PRESETS = [
  'Good luck! 🍀',
  'Nice move! 🔥',
  'UNO! 🃏',
  'Roll a 6! 🎲',
  'GG! 🏆',
  'Oops! 😅',
  'Hurry up! ⏳',
  'Well played! 👏'
];

const REACTION_EMOJIS = ['👍', '😂', '🔥', '❤️', '🎉', '💀'];

export function GameChatPanel({
  chat = [],
  onSend,
  onReact,
  onClose,
  title = 'GAME CHAT',
  className = '',
  isCollapsible = false
}: GameChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    onSend(text);
    setInputText('');
  };

  const handleSendPreset = (preset: string) => {
    onSend(preset);
    setShowPresets(false);
  };

  return (
    <aside className={`game-chat-sidebar ${className}`}>
      {/* CHAT HEADER */}
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.1rem' }}>💬</span>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, letterSpacing: '0.05em' }}>{title}</h3>
          <span className="chat-badge-pill">{chat.length}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            type="button"
            className={`icon-btn-small ${showPresets ? 'active' : ''}`}
            onClick={() => setShowPresets(!showPresets)}
            title="Quick Chat Presets"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
          >
            ⚡ Presets
          </button>

          {isCollapsible && onClose && (
            <button
              type="button"
              className="close-chat-btn"
              onClick={onClose}
              title="Close Chat"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* QUICK PRESETS DRAWER */}
      {showPresets && (
        <div className="chat-presets-drawer">
          <div className="presets-grid">
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className="preset-pill-btn"
                onClick={() => handleSendPreset(preset)}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MESSAGES BOX */}
      <div className="chat-messages-box">
        {chat.length === 0 ? (
          <div className="empty-chat-copy">
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.4rem' }}>👋</span>
            <p style={{ margin: 0, fontWeight: 600 }}>No messages yet.</p>
            <small style={{ opacity: 0.7 }}>Say hello or tap a preset to chat!</small>
          </div>
        ) : (
          chat.map((msg) => {
            const timeStr = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            return (
              <div key={msg.id} className="chat-item">
                <div className="chat-meta-row">
                  <span className="chat-author">{msg.username}</span>
                  {timeStr && <span className="chat-timestamp">{timeStr}</span>}
                </div>
                <p className="chat-body">{msg.text}</p>

                {/* REACTIONS BAR */}
                {onReact && (
                  <div className="chat-reactions">
                    {REACTION_EMOJIS.map((emoji) => {
                      const count = msg.reactions?.[emoji]?.length || 0;
                      return (
                        <button
                          key={emoji}
                          type="button"
                          className={`reaction-btn ${count > 0 ? 'has-reaction' : ''}`}
                          onClick={() => onReact(msg.id, emoji)}
                          title={`React with ${emoji}`}
                        >
                          <span>{emoji}</span>
                          {count > 0 && <span className="reaction-count">{count}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* CHAT INPUT FORM */}
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type message & hit Enter…"
          maxLength={280}
        />
        <button
          type="submit"
          className="send-msg-btn"
          disabled={!inputText.trim()}
          title="Send Message"
        >
          ➤
        </button>
      </form>
    </aside>
  );
}
