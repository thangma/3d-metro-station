export type AudioZone = 'street' | 'concourse' | 'platform' | 'train';

export class AudioSystem {
  ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private hvacGain: GainNode | null = null;
  private streetGain: GainNode | null = null;
  private crowdGain: GainNode | null = null;
  private currentZone: AudioZone = 'street';
  private masterVolume = 1.0;
  private muted = false;

  async unlock(): Promise<void> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.setupNodes();
  }

  setZone(zone: AudioZone): void {
    if (this.currentZone === zone) return;
    this.currentZone = zone;
    if (!this.ctx || !this.hvacGain || !this.streetGain || !this.crowdGain) return;

    const t = this.ctx.currentTime;
    const ramp = 0.8;

    if (zone === 'street') {
      this.streetGain.gain.linearRampToValueAtTime(0.35, t + ramp);
      this.hvacGain.gain.linearRampToValueAtTime(0.02, t + ramp);
      this.crowdGain.gain.linearRampToValueAtTime(0.05, t + ramp);
    } else if (zone === 'concourse') {
      this.streetGain.gain.linearRampToValueAtTime(0.05, t + ramp);
      this.hvacGain.gain.linearRampToValueAtTime(0.25, t + ramp);
      this.crowdGain.gain.linearRampToValueAtTime(0.2, t + ramp);
    } else if (zone === 'platform') {
      this.streetGain.gain.linearRampToValueAtTime(0.0, t + ramp);
      this.hvacGain.gain.linearRampToValueAtTime(0.35, t + ramp);
      this.crowdGain.gain.linearRampToValueAtTime(0.25, t + ramp);
    } else if (zone === 'train') {
      this.streetGain.gain.linearRampToValueAtTime(0.0, t + ramp);
      this.hvacGain.gain.linearRampToValueAtTime(0.15, t + ramp);
      this.crowdGain.gain.linearRampToValueAtTime(0.1, t + ramp);
    }
  }

  footstep(surface: 'stone' | 'concrete' | 'metal'): void {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const freq = surface === 'metal' ? 320 : surface === 'concrete' ? 180 : 120;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain ?? this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  oneShot(name: 'gate' | 'chime' | 'brake' | 'announce'): void {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;

    if (name === 'gate') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(1800, t);
      osc.frequency.setValueAtTime(2400, t + 0.06);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain);
      gain.connect(this.masterGain ?? this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    } else if (name === 'chime') {
      [880, 1320].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const start = t + idx * 0.2;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
        osc.connect(gain);
        gain.connect(this.masterGain ?? this.ctx!.destination);
        osc.start(start);
        osc.stop(start + 0.36);
      });
    } else if (name === 'brake') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(3200, t);
      osc.frequency.linearRampToValueAtTime(1400, t + 1.2);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.linearRampToValueAtTime(0.001, t + 1.2);
      osc.connect(gain);
      gain.connect(this.masterGain ?? this.ctx.destination);
      osc.start(t);
      osc.stop(t + 1.25);
    } else if (name === 'announce') {
      if ('speechSynthesis' in window) {
        try {
          const utter = new SpeechSynthesisUtterance('Tàu sắp khởi hành. Train departing.');
          utter.lang = 'vi-VN';
          utter.volume = this.muted ? 0 : this.masterVolume;
          window.speechSynthesis.speak(utter);
        } catch {
        }
      }
    }
  }

  setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(m ? 0 : this.masterVolume, this.ctx.currentTime);
    }
  }

  dispose(): void {
    if (this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close();
    }
    this.ctx = null;
  }

  private setupNodes(): void {
    if (!this.ctx || this.masterGain) return;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.masterVolume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    const hvacOsc = this.ctx.createOscillator();
    hvacOsc.type = 'triangle';
    hvacOsc.frequency.setValueAtTime(75, this.ctx.currentTime);
    this.hvacGain = this.ctx.createGain();
    this.hvacGain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    hvacOsc.connect(this.hvacGain);
    this.hvacGain.connect(this.masterGain);
    hvacOsc.start();

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const streetNoise = this.ctx.createBufferSource();
    streetNoise.buffer = noiseBuffer;
    streetNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);

    this.streetGain = this.ctx.createGain();
    this.streetGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    streetNoise.connect(filter);
    filter.connect(this.streetGain);
    this.streetGain.connect(this.masterGain);
    streetNoise.start();

    this.crowdGain = this.ctx.createGain();
    this.crowdGain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    filter.connect(this.crowdGain);
    this.crowdGain.connect(this.masterGain);
  }
}
