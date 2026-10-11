// سیستم صدای مبتنی بر Web Audio API (بدون فایل خارجی)
class SoundManager {
  private ctx: AudioContext | null = null;
  private masterVolume = 0.35;
  private enabled = true;
  private lastPlayTime: { [key: string]: number } = {};

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setEnabled(v: boolean) { this.enabled = v; }
  isEnabled() { return this.enabled; }

  // ===== جلوگیری از پخش صداهای همزمان زیاد =====
  private canPlay(key: string, minInterval: number): boolean {
    const now = performance.now();
    if (this.lastPlayTime[key] && now - this.lastPlayTime[key] < minInterval) {
      return false;
    }
    this.lastPlayTime[key] = now;
    return true;
  }

  // ===== شلیک بازیکن (لیزر آبی) =====
  playShoot() {
    if (!this.enabled) return;
    if (!this.canPlay('shoot', 45)) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.06);
    
    gain.gain.setValueAtTime(this.masterVolume * 0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  // ===== شلیک دشمن (لیزر قرمز) =====
  playEnemyShoot() {
    if (!this.enabled) return;
    if (!this.canPlay('enemyShoot', 70)) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(130, now + 0.1);
    
    gain.gain.setValueAtTime(this.masterVolume * 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  // ===== برخورد گلوله به دشمن =====
  playHit() {
    if (!this.enabled) return;
    if (!this.canPlay('hit', 40)) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.05);
    
    gain.gain.setValueAtTime(this.masterVolume * 0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  // ===== مرگ دشمن (انفجار) =====
  playEnemyDeath() {
    if (!this.enabled) return;
    if (!this.canPlay('death', 60)) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    
    const bufferSize = ctx.sampleRate * 0.25;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.25);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.masterVolume * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  // ===== آسیب به بازیکن =====
  playPlayerHit() {
    if (!this.enabled) return;
    if (!this.canPlay('playerHit', 200)) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.18);
    
    gain.gain.setValueAtTime(this.masterVolume * 0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // ===== شروع موج =====
  playWaveStart() {
    if (!this.enabled) return;
    if (!this.canPlay('wave', 500)) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    
    [523.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(this.masterVolume * 0.13, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.25);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.25);
    });
  }

  // ===== خشاب خالی =====
  playEmptyClick() {
    if (!this.enabled) return;
    if (!this.canPlay('empty', 150)) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, now);
    
    gain.gain.setValueAtTime(this.masterVolume * 0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  // ===== ریلود =====
  playReload() {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    
    [0, 0.15, 0.4, 0.55].forEach((t, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(200 + i * 100, now + t);
      
      gain.gain.setValueAtTime(this.masterVolume * 0.08, now + t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.05);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.05);
    });
  }

  // ===== Game Over =====
  playGameOver() {
    if (!this.enabled) return;
    if (!this.canPlay('gameover', 1000)) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    
    [392, 329.63, 261.63, 196].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.2);
      
      gain.gain.setValueAtTime(0, now + i * 0.2);
      gain.gain.linearRampToValueAtTime(this.masterVolume * 0.18, now + i * 0.2 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.2);
      osc.stop(now + i * 0.2 + 0.4);
    });
  }
}

export const soundManager = new SoundManager();