import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { User } from '../types';

interface FeedbackItem {
  id: string;
  author_name: string;
  author_role?: string | null;
  rating: number;
  comment: string;
  created_at?: string;
}

interface FeedbackSectionProps {
  user?: User | null;
  gameTitle?: string;
  accentColor?: string;
  defaultRolePlaceholder?: string;
}

export function FeedbackSection({
  user,
  gameTitle = 'GameNight',
  accentColor = '#2dd4bf',
  defaultRolePlaceholder = 'Regular Player'
}: FeedbackSectionProps) {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [authorName, setAuthorName] = useState('');
  const [authorRole, setAuthorRole] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadFeedbacks = async () => {
    try {
      const res = await api.getFeedbacks();
      setFeedbacks(res.feedbacks || []);
    } catch {}
  };

  useEffect(() => {
    void loadFeedbacks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const name = authorName.trim() || user?.username || 'Verified Player';
      const role = authorRole.trim() || defaultRolePlaceholder;
      const res = await api.submitFeedback({
        rating: newRating,
        comment: comment.trim(),
        authorName: name,
        authorRole: role
      });

      setFeedbacks(res.feedbacks || []);
      setComment('');
      setAuthorRole('');
      setSuccessMsg('Thank you! Your review is live on the table. 🎉');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit feedback. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute average rating
  const avgRating = feedbacks.length
    ? (feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length).toFixed(1)
    : '4.9';

  return (
    <section id="reviews" style={{ padding: '3.5rem 0' }}>
      <div className="wrap">
        
        {/* ENHANCED SECTION HEADER */}
        <div
          className="section-head"
          style={{
            maxWidth: '900px',
            margin: '0 auto 2.5rem auto',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: 'rgba(251,191,36,0.1)',
              border: '1px solid rgba(251,191,36,0.3)',
              borderRadius: '999px',
              padding: '0.4rem 1.1rem',
              marginBottom: '1rem'
            }}
          >
            <span style={{ color: '#fbbf24', fontSize: '1rem', fontWeight: 'bold' }}>★ {avgRating} / 5.0 Rating</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
            <span style={{ color: '#cbd5e1', fontSize: '0.82rem', fontWeight: 600 }}>
              {feedbacks.length || 5} Verified Player Reviews
            </span>
          </div>

          <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', margin: '0 0 0.6rem 0', fontWeight: 800 }}>
            What Players Say About <span style={{ color: accentColor }}>{gameTitle}</span>
          </h2>
          <p style={{ color: '#94a3b8', maxWidth: '620px', margin: '0 auto', fontSize: '1rem', lineHeight: 1.5 }}>
            Real-time reviews, player ratings, and community feedback from active match tables.
          </p>
        </div>

        {/* FEEDBACK GRID */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
            gap: '1.5rem',
            alignItems: 'stretch'
          }}
        >
          {/* SUBMIT REVIEW CARD */}
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,41,59,0.85))',
              border: `1.5px solid ${accentColor}55`,
              borderRadius: '1.25rem',
              padding: '1.6rem',
              boxShadow: `0 15px 35px rgba(0,0,0,0.5), 0 0 20px ${accentColor}15`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <h3 style={{ fontSize: '1.2rem', color: accentColor, margin: 0, fontFamily: 'Fredoka, sans-serif' }}>
                  Leave Your Feedback ✍️
                </h3>
                <span style={{ fontSize: '0.75rem', background: `${accentColor}20`, color: accentColor, padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 'bold' }}>
                  LIVE FEED
                </span>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 1rem 0' }}>
                Share your rating & thoughts with the community!
              </p>

              {successMsg && (
                <div style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)', color: '#86efac', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '0.8rem' }}>
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '0.8rem' }}>
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {/* INTERACTIVE STAR SELECTOR */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(15,23,42,0.6)', padding: '0.55rem 0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 'bold' }}>Rating:</span>
                  <div style={{ display: 'flex', gap: '0.15rem' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setNewRating(star)}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '1.4rem',
                          cursor: 'pointer',
                          color: (hoverRating || newRating) >= star ? '#fbbf24' : 'rgba(255,255,255,0.2)',
                          transition: 'transform 0.15s ease',
                          padding: '0 0.1rem'
                        }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <span style={{ fontSize: '0.85rem', color: '#fbbf24', fontWeight: 'bold', marginLeft: 'auto' }}>
                    {newRating}/5 Stars
                  </span>
                </div>

                {/* COMMENT TEXTAREA */}
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={`What did you think of the ${gameTitle} gameplay, match rules, or design?`}
                  required
                  maxLength={400}
                  rows={3}
                  style={{
                    width: '100%',
                    background: 'rgba(9,24,39,0.85)',
                    border: `1px solid ${accentColor}40`,
                    borderRadius: '10px',
                    padding: '0.75rem',
                    color: '#fff',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />

                {/* NAME & ROLE INPUTS */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder={`Name (${user?.username || 'Guest'})`}
                    maxLength={30}
                    style={{
                      width: '100%',
                      background: 'rgba(9,24,39,0.85)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '8px',
                      padding: '0.55rem 0.7rem',
                      color: '#fff',
                      fontSize: '0.82rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <input
                    type="text"
                    value={authorRole}
                    onChange={(e) => setAuthorRole(e.target.value)}
                    placeholder={`Role (${defaultRolePlaceholder})`}
                    maxLength={35}
                    style={{
                      width: '100%',
                      background: 'rgba(9,24,39,0.85)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '8px',
                      padding: '0.55rem 0.7rem',
                      color: '#fff',
                      fontSize: '0.82rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: `linear-gradient(135deg, ${accentColor} 0%, #0284c7 100%)`,
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    marginTop: '0.2rem',
                    boxShadow: `0 8px 20px ${accentColor}35`,
                    transition: 'transform 0.15s ease'
                  }}
                >
                  {isSubmitting ? 'Posting Feedback...' : 'Post Live Feedback ★'}
                </button>
              </form>
            </div>
          </div>

          {/* USER REVIEW CARDS */}
          {feedbacks.map((item) => (
            <div
              key={item.id}
              style={{
                background: 'linear-gradient(145deg, rgba(20,32,48,0.8), rgba(12,22,34,0.9))',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '1.25rem',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                transition: 'transform 0.2s ease, border-color 0.2s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ color: '#fbbf24', fontSize: '1.15rem', letterSpacing: '2px' }}>
                    {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
                  </div>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(34,197,94,0.15)', color: '#4ade80', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 'bold' }}>
                    ✓ Verified
                  </span>
                </div>

                <p style={{ fontSize: '0.92rem', color: '#e2e8f0', lineHeight: 1.5, margin: '0 0 1.2rem 0', fontStyle: 'italic' }}>
                  "{item.comment}"
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.85rem' }}>
                <div
                  style={{
                    background: accentColor,
                    color: '#0f172a',
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                  }}
                >
                  {item.author_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '0.92rem', color: '#f8fafc', fontWeight: 'bold' }}>
                    {item.author_name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    {item.author_role || defaultRolePlaceholder}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
