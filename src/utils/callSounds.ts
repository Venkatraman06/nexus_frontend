class CallSoundManager {
  private audioCtx: AudioContext | null = null;
  private ringInterval: any = null;

  private initCtx() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
  }

  playRingback() {
    this.stopRingtone();
    this.initCtx();
    if (!this.audioCtx) return;

    const playBurst = () => {
      if (!this.audioCtx) return;
      try {
        const now = this.audioCtx.currentTime;
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc1.type = "sine";
        osc2.type = "sine";
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.8);
        osc2.stop(now + 1.8);
      } catch (e) {}
    };

    playBurst();
    this.ringInterval = setInterval(playBurst, 3000);
  }

  playIncomingRingtone() {
    this.stopRingtone();
    this.initCtx();
    if (!this.audioCtx) return;

    const playRiff = () => {
      if (!this.audioCtx) return;
      try {
        const now = this.audioCtx.currentTime;
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc1.type = "sine";
        osc2.type = "sine";
        osc1.frequency.setValueAtTime(850, now);
        osc2.frequency.setValueAtTime(950, now);

        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.2);
        osc2.stop(now + 1.2);
      } catch (e) {}
    };

    playRiff();
    this.ringInterval = setInterval(playRiff, 2000);
  }

  stopRingtone() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }

  playCutSound() {
    this.stopRingtone();
    this.initCtx();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(425, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.setValueAtTime(0.0, now + 0.18);
      gain.gain.setValueAtTime(0.18, now + 0.3);
      gain.gain.setValueAtTime(0.0, now + 0.48);
      gain.gain.setValueAtTime(0.18, now + 0.6);
      gain.gain.setValueAtTime(0.0, now + 0.78);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.8);
    } catch (e) {}
  }
}

export const callSounds = new CallSoundManager();
