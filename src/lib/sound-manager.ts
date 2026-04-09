export class SoundManager {
  private audioContext: AudioContext | null = null;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  private async playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1) {
    if (!this.audioContext) return;
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
    
    gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
  }

  playActivation() {
    // Soft futuristic double tone
    this.playTone(880, 'sine', 0.1, 0.05);
    setTimeout(() => this.playTone(1320, 'sine', 0.2, 0.05), 50);
  }

  playListening() {
    // Low hum/pulse
    this.playTone(220, 'sine', 0.1, 0.03);
  }

  playSpeaking() {
    // Subtle waveform feedback (short blip)
    this.playTone(440, 'sine', 0.05, 0.02);
  }

  playError() {
    // Soft glitch tone
    this.playTone(150, 'sawtooth', 0.1, 0.05);
    setTimeout(() => this.playTone(100, 'sawtooth', 0.2, 0.05), 50);
  }

  playDeactivation() {
    // Reverse activation
    this.playTone(1320, 'sine', 0.1, 0.05);
    setTimeout(() => this.playTone(880, 'sine', 0.2, 0.05), 50);
  }
}
