class SoundManager {
  private ctx: AudioContext | null = null;
  private masterVolume = 0.25;
  private enabled = true;
  private lastPlayTime: { [key: string]: number } = {};
  private musicOscillators: OscillatorNode[] = [];
  private musicGain: GainNode | null = null;
  private musicPlaying = false;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setEnabled(v: boolean) {
    this.enabled = v;
    if (!v) this.stopMusic();
  }

  private canPlay(key: string, minInterval: number): boolean {
    const now = performance.now();
    if (this.lastPlayTime[key] && now - this.lastPlayTime[key] < minInterval) {
      return false;
    }
    this.lastPlayTime[key] = now;
    return true;
  }

  // ⭐ Lane change - swish
  playLaneChange() {
    if (!this.enabled) return;
    if (!this.canPlay('lane', 80)) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
    gain.gain.setValueAtTime(this.masterVolume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  // ⭐ Crash - noise burst + low boom
  playCrash() {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    // Noise
    const bufferSize = ctx.sampleRate * 0.6;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.exponentialRampToValueAtTime(150, now + 0.5);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(this.masterVolume * 0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);

    // Boom
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
    oscGain.gain.setValueAtTime(this.masterVolume * 0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  // ⭐ Pass obstacle - subtle ding
  playPass() {
    if (!this.enabled) return;
    if (!this.canPlay('pass', 60)) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.05);
    gain.gain.setValueAtTime(this.masterVolume * 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  // ⭐ Start button
  playStart() {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(this.masterVolume * 0.15, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.2);
    });
  }

  // ⭐ Background Music - Simple cyberpunk arpeggio
  startMusic() {
    if (!this.enabled || this.musicPlaying) return;
    const ctx = this.getCtx();
    this.musicPlaying = true;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.06;
    masterGain.connect(ctx.destination);
    this.musicGain = masterGain;

    // Arpeggio pattern: Am - F - C - G
    const notes = [
      220, 261.63, 329.63, // Am
      174.61, 220, 261.63, // F
      261.63, 329.63, 392,  // C
      196, 246.94, 293.66, // G
    ];

    const playNote = (freq: number, time: number, duration: number) => {
      if (!this.musicPlaying) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, time);

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.4, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      osc.start(time);
      osc.stop(time + duration);
    };

    const loopMusic = () => {
      if (!this.musicPlaying) return;
      const startTime = ctx.currentTime + 0.1;
      notes.forEach((freq, i) => {
        playNote(freq, startTime + i * 0.15, 0.2);
      });
      // Bass drum
      [0, 4, 8].forEach((i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, startTime + i * 0.15);
        gain.gain.setValueAtTime(0.5, startTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + i * 0.15 + 0.1);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(startTime + i * 0.15);
        osc.stop(startTime + i * 0.15 + 0.1);
      });

      setTimeout(loopMusic, notes.length * 150);
    };
    loopMusic();
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicGain) {
      try {
        this.musicGain.disconnect();
      } catch {}
      this.musicGain = null;
    }
  }
}

export const soundManager = new SoundManager();