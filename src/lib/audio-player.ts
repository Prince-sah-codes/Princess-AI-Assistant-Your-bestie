export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private isPlaying: boolean = false;

  constructor() {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
  }

  async playChunk(base64Data: string) {
    if (!this.audioContext) return;

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const pcm16Data = new Int16Array(bytes.buffer);
    const float32Data = new Float32Array(pcm16Data.length);
    for (let i = 0; i < pcm16Data.length; i++) {
      float32Data[i] = pcm16Data[i] / 32768.0;
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32Data.length, 24000);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    const currentTime = this.audioContext.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
    this.isPlaying = true;
  }

  stop() {
    this.nextStartTime = 0;
    this.isPlaying = false;
    // We can't easily stop already scheduled sources without keeping track of them,
    // but we can close and recreate the context for a hard stop.
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = new AudioContext({ sampleRate: 24000 });
    }
  }

  getIsPlaying() {
    return this.isPlaying && this.audioContext && this.nextStartTime > this.audioContext.currentTime;
  }
}
