import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlayerStore } from '@/stores/player-store';
import { AudioPlayback } from './audio-playback';

// Model the native src reset and media events, including the temporary zero
// position. Tests drive the same controller and Zustand store as PlayerBar.
class TestAudio extends EventTarget {
  private source = '';
  sourceChanges = 0;
  currentTime = 0;
  duration = Number.NaN;
  readyState = 0;
  paused = true;
  ended = false;

  get src() {
    return this.source;
  }

  set src(value: string) {
    this.source = value;
    this.sourceChanges++;
    this.currentTime = 0;
    this.duration = Number.NaN;
    this.readyState = 0;
    this.paused = true;
    this.ended = false;
    this.dispatchEvent(new Event('pause'));
    this.dispatchEvent(new Event('timeupdate'));
  }

  play = vi.fn(() => {
    this.paused = false;
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  });

  pause() {
    this.paused = true;
    this.dispatchEvent(new Event('pause'));
  }

  removeAttribute() {
    this.source = '';
  }

  load() {
    this.currentTime = 0;
    this.readyState = 0;
  }

  metadata(duration = 600) {
    this.duration = duration;
    this.readyState = 1;
    this.dispatchEvent(new Event('loadedmetadata'));
  }

  advance(time: number) {
    this.currentTime = time;
    this.dispatchEvent(new Event('timeupdate'));
  }
}

const tracks = ['first', 'second'].map((id) => ({
  id,
  title: id,
  artistName: null,
  durationMs: 600_000,
}));

beforeEach(() => {
  usePlayerStore.setState({
    queue: [],
    currentIndex: -1,
    requestId: 0,
    currentTime: 0,
    duration: 0,
    playing: false,
  });
});

function setup() {
  usePlayerStore.getState().playQueue(tracks);
  const audio = new TestAudio();
  const onPlayingChange = vi.fn((playing: boolean) =>
    usePlayerStore.getState().setPlaying(playing),
  );
  const onEnded = vi.fn(() => usePlayerStore.getState().next());
  const controller = new AudioPlayback(audio as unknown as HTMLAudioElement, {
    getState: () => {
      const state = usePlayerStore.getState();
      return {
        trackId: state.currentTrack()?.id ?? null,
        requestId: state.requestId,
        playing: state.playing,
      };
    },
    onProgress: (time, duration) => usePlayerStore.getState().setProgress(time, duration),
    onPlayingChange,
    onEnded,
  });
  const load = (url: string) => {
    const state = usePlayerStore.getState();
    controller.load({ trackId: state.currentTrack()!.id, requestId: state.requestId, url });
  };
  return { audio, controller, load, onPlayingChange, onEnded };
}

describe('signed audio URL renewal', () => {
  it('resumes a playing track at its native position after the three-minute renewal', () => {
    const { audio, load } = setup();
    load('signed-url-1');
    audio.metadata();
    audio.advance(181.25);
    // The last mirrored time can lag slightly behind the native element.
    audio.currentTime = 181.5;

    load('signed-url-2');
    expect(audio.currentTime).toBe(0);
    expect(usePlayerStore.getState().currentTime).toBe(181.25);
    expect(usePlayerStore.getState().playing).toBe(true);
    audio.metadata();

    expect(audio.currentTime).toBe(181.5);
    expect(audio.paused).toBe(false);
    expect(usePlayerStore.getState().currentTime).toBe(181.5);
    expect(usePlayerStore.getState().duration).toBe(600);
  });

  it('preserves both position and pause state when renewing a paused track', () => {
    const { audio, controller, load } = setup();
    load('signed-url-1');
    audio.metadata();
    audio.advance(220);
    usePlayerStore.getState().pause();
    controller.syncPlaying();
    const playCount = audio.play.mock.calls.length;

    load('signed-url-2');
    audio.metadata();

    expect(audio.currentTime).toBe(220);
    expect(audio.paused).toBe(true);
    expect(usePlayerStore.getState().playing).toBe(false);
    expect(audio.play).toHaveBeenCalledTimes(playCount);
  });

  it('honors a pause and seek while the renewed source is loading', () => {
    const { audio, controller, load } = setup();
    load('signed-url-1');
    audio.metadata();
    audio.advance(181);
    load('signed-url-2');

    usePlayerStore.getState().pause();
    controller.syncPlaying();
    usePlayerStore.getState().seek(250);
    controller.seek(250);
    audio.metadata();

    expect(audio.currentTime).toBe(250);
    expect(audio.paused).toBe(true);
    expect(usePlayerStore.getState().currentTime).toBe(250);
  });

  it('keeps the saved position if another URL arrives before metadata loads', () => {
    const { audio, load } = setup();
    load('signed-url-1');
    audio.metadata();
    audio.advance(183);
    load('signed-url-2');
    load('signed-url-3');
    audio.metadata();
    expect(audio.src).toBe('signed-url-3');
    expect(audio.currentTime).toBe(183);
    expect(audio.paused).toBe(false);
  });

  it('starts a different track at zero even if the previous URL was renewing', () => {
    const { audio, controller, load } = setup();
    load('signed-url-1');
    audio.metadata();
    audio.advance(181);
    load('signed-url-2');
    usePlayerStore.getState().next();
    // Old source events arriving before the new URL must not change the store.
    audio.metadata();
    audio.advance(182);
    expect(usePlayerStore.getState().currentTime).toBe(0);
    controller.clear();
    expect(usePlayerStore.getState().playing).toBe(true);
    load('second-track-url');
    audio.metadata();
    expect(audio.currentTime).toBe(0);
    expect(audio.paused).toBe(false);
  });

  it('restarts at zero only when the user explicitly starts the same queue again', () => {
    const { audio, load } = setup();
    load('signed-url-1');
    audio.metadata();
    audio.advance(181);
    usePlayerStore.getState().playQueue(tracks);
    load('signed-url-1');
    audio.metadata();
    expect(audio.currentTime).toBe(0);
    expect(audio.sourceChanges).toBe(2);
  });

  it('does not reload an unchanged URL or restart for a delayed pause event', () => {
    const { audio, load } = setup();
    load('signed-url-1');
    audio.metadata();
    audio.advance(181);
    load('signed-url-1');
    expect(audio.sourceChanges).toBe(1);
    load('signed-url-2');
    audio.metadata();
    audio.dispatchEvent(new Event('pause'));
    expect(usePlayerStore.getState().playing).toBe(true);
    expect(audio.currentTime).toBe(181);
  });

  it('ignores a rejected play promise belonging to the replaced source', async () => {
    const { audio, load, onPlayingChange } = setup();
    let rejectOldPlay!: (error: Error) => void;
    audio.play.mockImplementationOnce(() => {
      audio.paused = false;
      return new Promise<void>((_, reject) => {
        rejectOldPlay = reject;
      });
    });
    load('signed-url-1');
    audio.metadata();
    audio.advance(181);
    load('signed-url-2');
    audio.metadata();
    rejectOldPlay(new Error('Old source interrupted'));
    await Promise.resolve();
    expect(usePlayerStore.getState().playing).toBe(true);
    expect(onPlayingChange).not.toHaveBeenCalledWith(false);
  });

  it('reflects an actual play failure for the current source', async () => {
    const { audio, load } = setup();
    audio.play.mockRejectedValueOnce(new Error('Playback unavailable'));
    load('signed-url-1');
    audio.metadata();
    await Promise.resolve();
    expect(usePlayerStore.getState().playing).toBe(false);
  });

  it('advances the queue only when the current track actually ends', () => {
    const { audio, load, onEnded } = setup();
    load('signed-url-1');
    audio.metadata();
    audio.advance(181);
    load('signed-url-2');
    audio.dispatchEvent(new Event('ended'));
    expect(onEnded).not.toHaveBeenCalled();
    audio.metadata();
    audio.ended = true;
    audio.dispatchEvent(new Event('ended'));
    expect(onEnded).toHaveBeenCalledOnce();
    expect(usePlayerStore.getState().currentIndex).toBe(1);
  });
});
