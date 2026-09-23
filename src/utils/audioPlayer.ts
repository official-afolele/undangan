// Audio manager with dynamic source update and fallback synth
class WeddingAudioController {
  private audio: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private isPlayingSynth = false;
  private synthInterval: number | null = null;
  public isPlaying = false;
  public isMuted = false;
  public progress = 0;
  public currentUrl: string = '';
  public duration = 0;
  public currentTime = 0;
  private listeners: (() => void)[] = [];

  constructor(url?: string) {
    if (typeof window !== 'undefined' && url) {
      this.initAudio(url);
    }
  }

  private initAudio(url: string) {
    if (typeof window === 'undefined') return;
    this.currentUrl = url;

    // Clean up previous audio instance if exists
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio.load();
      this.audio = null;
    }

    try {
      this.audio = new Audio();
      this.audio.crossOrigin = 'anonymous';
      this.audio.loop = true;
      this.audio.preload = 'auto';
      this.audio.src = url;

      this.audio.addEventListener('timeupdate', () => {
        if (this.audio && this.audio.duration) {
          this.currentTime = this.audio.currentTime;
          this.duration = this.audio.duration;
          this.progress = (this.audio.currentTime / this.audio.duration) * 100;
          this.notify();
        }
      });

      this.audio.addEventListener('loadedmetadata', () => {
        if (this.audio) {
          this.duration = this.audio.duration || 0;
          this.notify();
        }
      });

      this.audio.addEventListener('ended', () => {
        this.isPlaying = false;
        this.notify();
      });

      this.audio.addEventListener('error', (e) => {
        console.warn('Audio link failed to play, attempting gentle synth fallback:', url, e);
        if (this.isPlaying) {
          this.startGentleSynth();
        }
      });
    } catch (err) {
      console.error('Error creating Audio element', err);
    }
  }

  public setAudioUrl(url: string) {
    if (!url || typeof window === 'undefined') return;
    const cleanUrl = url.trim();
    if (this.currentUrl === cleanUrl && this.audio) return;

    const wasPlaying = this.isPlaying;
    this.initAudio(cleanUrl);
    this.progress = 0;

    if (wasPlaying) {
      this.play();
    } else {
      this.notify();
    }
  }

  public subscribe(cb: () => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public async play(): Promise<boolean> {
    this.isPlaying = true;
    this.notify();

    if (this.audio && this.currentUrl) {
      try {
        await this.audio.play();
        this.stopGentleSynth();
        return true;
      } catch (err) {
        console.warn('HTML5 Audio play rejected, starting ambient synth fallback', err);
        this.startGentleSynth();
        return true;
      }
    } else {
      this.startGentleSynth();
      return true;
    }
  }

  public pause() {
    this.isPlaying = false;
    if (this.audio) {
      this.audio.pause();
    }
    this.stopGentleSynth();
    this.notify();
  }

  public toggle() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public seek(percent: number) {
    if (this.audio && this.audio.duration) {
      this.audio.currentTime = (percent / 100) * this.audio.duration;
      this.progress = percent;
      this.notify();
    }
  }

  private startGentleSynth() {
    if (this.isPlayingSynth || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      this.isPlayingSynth = true;

      // Soft romantic acoustic chime chord progression (C - G/B - Am - F)
      const notes = [
        [261.63, 329.63, 392.0], // C major
        [246.94, 293.66, 392.0], // G
        [220.0, 261.63, 329.63], // Am
        [174.61, 220.0, 261.63]  // F
      ];
      let step = 0;

      const playChord = () => {
        if (!this.isPlayingSynth || !this.audioCtx) return;
        const currentNotes = notes[step % notes.length];
        step++;

        currentNotes.forEach((freq, idx) => {
          if (!this.audioCtx) return;
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime + idx * 0.15);

          gain.gain.setValueAtTime(0.001, this.audioCtx.currentTime + idx * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.04, this.audioCtx.currentTime + idx * 0.15 + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + idx * 0.15 + 2.2);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start(this.audioCtx.currentTime + idx * 0.15);
          osc.stop(this.audioCtx.currentTime + idx * 0.15 + 2.3);
        });
      };

      playChord();
      this.synthInterval = window.setInterval(playChord, 3200);
    } catch (e) {
      console.error('Web audio synth init failed', e);
    }
  }

  private stopGentleSynth() {
    this.isPlayingSynth = false;
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
  }
}

// Initial audio instance with user's requested song
export const audioController = new WeddingAudioController(
  'https://wedding-invitations-chi.vercel.app/audio/cinta_terakhir_cover1.mp3'
);
