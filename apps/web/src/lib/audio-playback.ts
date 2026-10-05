interface PlaybackIdentity {
  trackId: string;
  requestId: number;
}

interface PlaybackSource extends PlaybackIdentity {
  url: string;
}

interface PlaybackState {
  trackId: string | null;
  requestId: number;
  playing: boolean;
}

interface PlaybackCallbacks {
  getState: () => PlaybackState;
  onProgress: (time: number, duration: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onEnded: () => void;
}

/** Keeps URL renewal separate from the user's request to start a track. */
export class AudioPlayback {
  private source: PlaybackSource | null = null;
  private loading = false;
  private resumeTime = 0;
  private playAttempt = 0;
  private disposed = false;

  constructor(
    private readonly audio: HTMLAudioElement,
    private readonly callbacks: PlaybackCallbacks,
  ) {
    audio.addEventListener('loadedmetadata', this.onLoadedMetadata);
    audio.addEventListener('timeupdate', this.onTimeUpdate);
    audio.addEventListener('play', this.onPlay);
    audio.addEventListener('pause', this.onPause);
    audio.addEventListener('ended', this.onEnded);
  }

  load(source: PlaybackSource) {
    if (
      this.source?.trackId === source.trackId &&
      this.source.requestId === source.requestId &&
      this.source.url === source.url
    ) {
      return;
    }

    const renewing =
      this.source?.trackId === source.trackId && this.source.requestId === source.requestId;
    this.resumeTime = renewing ? (this.loading ? this.resumeTime : this.audio.currentTime) : 0;
    this.source = source;
    this.loading = true;
    this.playAttempt++;
    // Assigning src resets the native time and can emit pause/timeupdate.
    // Ignore those events until metadata lets us restore the saved position.
    this.audio.src = source.url;
  }

  clear() {
    this.source = null;
    this.loading = false;
    this.playAttempt++;
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
  }

  syncPlaying() {
    const attempt = ++this.playAttempt;
    if (!this.isCurrent()) return;
    if (!this.callbacks.getState().playing) {
      this.audio.pause();
      return;
    }
    if (this.loading || !this.audio.paused) return;

    void this.audio.play().catch((error: unknown) => {
      // Source changes and user pauses abort earlier play() promises normally.
      if (error instanceof Error && error.name === 'AbortError') return;
      if (attempt !== this.playAttempt || !this.isCurrent()) return;
      if (this.callbacks.getState().playing) this.callbacks.onPlayingChange(false);
    });
  }

  seek(time: number) {
    if (!this.isCurrent() || !Number.isFinite(time)) return;
    if (this.loading) {
      this.resumeTime = Math.max(0, time);
    } else if (Math.abs(this.audio.currentTime - time) > 0.75) {
      this.audio.currentTime = Math.max(0, time);
    }
  }

  dispose() {
    this.disposed = true;
    this.playAttempt++;
    this.audio.removeEventListener('loadedmetadata', this.onLoadedMetadata);
    this.audio.removeEventListener('timeupdate', this.onTimeUpdate);
    this.audio.removeEventListener('play', this.onPlay);
    this.audio.removeEventListener('pause', this.onPause);
    this.audio.removeEventListener('ended', this.onEnded);
    this.audio.pause();
  }

  private isCurrent() {
    const state = this.callbacks.getState();
    return (
      !this.disposed &&
      this.source !== null &&
      this.source.trackId === state.trackId &&
      this.source.requestId === state.requestId
    );
  }

  private publishProgress() {
    this.callbacks.onProgress(
      this.audio.currentTime,
      Number.isFinite(this.audio.duration) ? this.audio.duration : 0,
    );
  }

  private onLoadedMetadata = () => {
    if (!this.isCurrent() || !this.loading || this.audio.readyState < 1) return;
    const duration = this.audio.duration;
    this.audio.currentTime = Number.isFinite(duration)
      ? Math.min(this.resumeTime, duration)
      : this.resumeTime;
    this.loading = false;
    this.publishProgress();
    this.syncPlaying();
  };

  private onTimeUpdate = () => {
    if (this.isCurrent() && !this.loading) this.publishProgress();
  };

  private onPlay = () => {
    if (!this.isCurrent() || this.loading || this.audio.paused) return;
    // A play event queued before a user pause must not undo that pause.
    if (!this.callbacks.getState().playing) this.audio.pause();
    else this.callbacks.onPlayingChange(true);
  };

  private onPause = () => {
    if (this.isCurrent() && !this.loading && this.audio.paused) {
      this.callbacks.onPlayingChange(false);
    }
  };

  private onEnded = () => {
    if (this.isCurrent() && !this.loading && this.audio.ended) this.callbacks.onEnded();
  };
}
