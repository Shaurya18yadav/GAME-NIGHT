// Web Audio API Sound Effects Synthesizer for in-lobby and in-game SFX

class SoundEffectsEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  playSFX(type: 'buzzer' | 'laugh' | 'fanfare' | 'drumroll' | 'alert' | 'uno' | string): void {
    const ctx = this.getContext();
    if (!ctx) return;

    switch (type) {
      case 'buzzer':
        this.playBuzzer(ctx);
        break;
      case 'laugh':
        this.playLaughTrack(ctx);
        break;
      case 'fanfare':
        this.playFanfare(ctx);
        break;
      case 'drumroll':
        this.playDrumroll(ctx);
        break;
      case 'alert':
        this.playAirhorn(ctx);
        break;
      case 'uno':
        this.playUnoCall(ctx);
        break;
      default:
        this.playPop(ctx);
        break;
    }
  }

  private playBuzzer(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(140, now);
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(147, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  }

  private playLaughTrack(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const notes = [320, 390, 340, 410, 360, 440, 390, 480];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq - 30, t + 0.07);

      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.07);
    });
  }

  private playFanfare(ctx: AudioContext): void {
    const now = ctx.currentTime;
    // C major triumphant arpeggio: C4, E4, G4, C5
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.1;
      const dur = idx === notes.length - 1 ? 0.5 : 0.12;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + dur);
    });
  }

  private playDrumroll(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const count = 12;
    for (let i = 0; i < count; i++) {
      const t = now + i * 0.035;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(100 + i * 5, t);

      gain.gain.setValueAtTime(0.05 + (i / count) * 0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.03);
    }
    // Final crash
    const crashTime = now + count * 0.035;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, crashTime);
    gain.gain.setValueAtTime(0.12, crashTime);
    gain.gain.exponentialRampToValueAtTime(0.001, crashTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(crashTime);
    osc.stop(crashTime + 0.35);
  }

  private playAirhorn(ctx: AudioContext): void {
    const now = ctx.currentTime;
    [0, 0.14, 0.28].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + offset;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(466.16, t); // Bb4
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.1);
    });
  }

  private playUnoCall(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.25);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  private playPop(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }
}

export const soundEffects = new SoundEffectsEngine();
