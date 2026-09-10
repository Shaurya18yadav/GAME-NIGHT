import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

type VoiceChatBarProps = {
  socket: Socket | null;
  currentUserId: string;
  roomCode: string;
  players?: { id: string; username?: string; name?: string }[];
};

type WebRTCSignalPayload = {
  fromUserId: string;
  fromUsername: string;
  signal: RTCSessionDescriptionInit | RTCIceCandidateInit;
  type: 'offer' | 'answer' | 'candidate';
};

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export function VoiceChatBar({ socket, currentUserId, roomCode, players = [] }: VoiceChatBarProps) {
  const [inVoice, setInVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeVoiceUsers, setActiveVoiceUsers] = useState<string[]>([]);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Listen to voice roster events
  useEffect(() => {
    if (!socket) return;

    const handleVoiceRoster = ({ activeVoiceUsers }: { activeVoiceUsers: string[] }) => {
      setActiveVoiceUsers(activeVoiceUsers || []);
    };

    socket.on('webrtc:voice-roster', handleVoiceRoster);

    return () => {
      socket.off('webrtc:voice-roster', handleVoiceRoster);
    };
  }, [socket]);

  // Handle incoming WebRTC signals
  useEffect(() => {
    if (!socket || !inVoice) return;

    const handleSignal = async ({ fromUserId, signal, type }: WebRTCSignalPayload) => {
      if (fromUserId === currentUserId) return;

      let pc = peerConnections.current.get(fromUserId);

      if (!pc && localStreamRef.current) {
        pc = createPeerConnection(fromUserId);
        peerConnections.current.set(fromUserId, pc);
      }

      if (!pc) return;

      try {
        if (type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal as RTCSessionDescriptionInit));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc:signal', {
            toUserId: fromUserId,
            signal: answer,
            type: 'answer'
          });
        } else if (type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal as RTCSessionDescriptionInit));
        } else if (type === 'candidate' && signal) {
          await pc.addIceCandidate(new RTCIceCandidate(signal as RTCIceCandidateInit));
        }
      } catch (err) {
        console.warn('WebRTC signal error:', err);
      }
    };

    socket.on('webrtc:signal', handleSignal);

    return () => {
      socket.off('webrtc:signal', handleSignal);
    };
  }, [socket, inVoice, currentUserId]);

  const createPeerConnection = (targetUserId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc:signal', {
          toUserId: targetUserId,
          signal: event.candidate,
          type: 'candidate'
        });
      }
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        let audio = remoteAudiosRef.current.get(targetUserId);
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          remoteAudiosRef.current.set(targetUserId, audio);
        }
        audio.srcObject = remoteStream;
        void audio.play().catch(() => {});
      }
    };

    return pc;
  };

  const startVoice = async () => {
    setMicPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setInVoice(true);
      setIsMuted(false);

      if (socket) {
        socket.emit('webrtc:join-voice');
      }

      // Initiate connection to all other users already in voice
      activeVoiceUsers.forEach(async (userId) => {
        if (userId === currentUserId) return;
        const pc = createPeerConnection(userId);
        peerConnections.current.set(userId, pc);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        if (socket) {
          socket.emit('webrtc:signal', {
            toUserId: userId,
            signal: offer,
            type: 'offer'
          });
        }
      });
    } catch (err) {
      console.warn('Microphone access denied:', err);
      setMicPermissionError('Mic permission required for Voice Chat.');
    }
  };

  const leaveVoice = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();

    remoteAudiosRef.current.forEach((audio) => {
      audio.srcObject = null;
    });
    remoteAudiosRef.current.clear();

    setInVoice(false);
    if (socket) {
      socket.emit('webrtc:leave-voice');
    }
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
      remoteAudiosRef.current.clear();
    };
  }, []);

  return (
    <div
      className="voice-chat-bar"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        height: '32px',
        boxSizing: 'border-box',
        background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.9))',
        border: inVoice ? '1.5px solid var(--text-success, #22c55e)' : '1px solid var(--ludo-line, rgba(255,255,255,0.12))',
        borderRadius: 'var(--radius-md, 10px)',
        padding: '0 10px',
        boxShadow: inVoice ? '0 0 12px rgba(34,197,94,0.3)' : '0 2px 8px rgba(0,0,0,0.25)',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'all 0.2s ease'
      }}
    >
      {!inVoice ? (
        <button
          type="button"
          onClick={startVoice}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary, #f8fafc)',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: 0,
            height: '100%',
            whiteSpace: 'nowrap'
          }}
          title="Join in-lobby WebRTC Voice Call"
          aria-label="Join in-lobby WebRTC Voice Call"
        >
          <span style={{ fontSize: '0.88rem' }}>🎙️</span>
          <span>Voice Call{activeVoiceUsers.length > 0 ? ` (${activeVoiceUsers.length})` : ''}</span>
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
          <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--text-success, #22c55e)', animation: 'pulse 1.5s infinite' }} />
          <span style={{ color: 'var(--text-success, #86efac)', fontWeight: 700, fontSize: '0.78rem' }}>
            Voice ({activeVoiceUsers.length})
          </span>

          {/* Mute / Unmute Button */}
          <button
            type="button"
            onClick={toggleMute}
            style={{
              background: isMuted ? 'var(--text-danger, #ef4444)' : 'var(--ludo-blue, #3b82f6)',
              border: 'none',
              borderRadius: 'var(--radius-full, 9999px)',
              color: '#fff',
              padding: '0.2rem 0.55rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            {isMuted ? '🔇 Muted' : '🎤 Live'}
          </button>

          {/* Leave Voice Button */}
          <button
            type="button"
            onClick={leaveVoice}
            style={{
              background: 'rgba(239,68,68,0.2)',
              border: '1px solid var(--text-danger, #ef4444)',
              borderRadius: 'var(--radius-full, 9999px)',
              color: 'var(--text-danger, #f87171)',
              padding: '0.2rem 0.5rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Leave Voice Call"
          >
            Disconnect
          </button>
        </div>
      )}

      {micPermissionError && (
        <span style={{ color: 'var(--text-danger, #f87171)', fontSize: '0.75rem', fontWeight: 600 }}>
          {micPermissionError}
        </span>
      )}
    </div>
  );
}
