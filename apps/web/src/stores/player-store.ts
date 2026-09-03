'use client';

import { create } from 'zustand';

/**
 * Player state (docs §10). Deliberately thin: the store holds what the UI
 * needs to render controls, not audio-engine internals — the actual
 * `<audio>` element lives in PlayerProvider and drives `currentTime`/`duration`
 * back into this store via its native events.
 */

export interface QueueTrack {
  id: string;
  title: string;
  artistName: string | null;
  durationMs: number | null;
}

interface PlayerState {
  queue: QueueTrack[];
  currentIndex: number;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  /** Bumped whenever playback should (re)start for the current track. */
  requestId: number;

  currentTrack: () => QueueTrack | null;
  playQueue: (tracks: QueueTrack[], startIndex?: number) => void;
  playTrack: (track: QueueTrack) => void;
  togglePlay: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setProgress: (currentTime: number, duration: number) => void;
  setPlaying: (playing: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: -1,
  playing: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  requestId: 0,

  currentTrack: () => {
    const { queue, currentIndex } = get();
    return queue[currentIndex] ?? null;
  },

  playQueue: (tracks, startIndex = 0) => {
    if (tracks.length === 0) return;
    set((state) => ({
      queue: tracks,
      currentIndex: startIndex,
      playing: true,
      currentTime: 0,
      duration: 0,
      requestId: state.requestId + 1,
    }));
  },

  playTrack: (track) => {
    const { queue, currentIndex } = get();
    const existingIndex = queue.findIndex((t) => t.id === track.id);

    if (existingIndex === currentIndex && existingIndex !== -1) {
      set({ playing: true });
      return;
    }

    if (existingIndex !== -1) {
      set((state) => ({
        currentIndex: existingIndex,
        playing: true,
        currentTime: 0,
        duration: 0,
        requestId: state.requestId + 1,
      }));
      return;
    }

    get().playQueue([track], 0);
  },

  togglePlay: () => {
    if (get().currentIndex === -1) return;
    set((state) => ({ playing: !state.playing }));
  },

  pause: () => set({ playing: false }),

  next: () => {
    const { queue, currentIndex } = get();
    if (currentIndex < queue.length - 1) {
      set((state) => ({
        currentIndex: currentIndex + 1,
        currentTime: 0,
        duration: 0,
        playing: true,
        requestId: state.requestId + 1,
      }));
    }
  },

  previous: () => {
    const { currentIndex, currentTime } = get();
    // Scrub-to-start convention: skip back only near the beginning of a track.
    if (currentTime > 3 || currentIndex <= 0) {
      set({ currentTime: 0 });
      return;
    }
    set((state) => ({
      currentIndex: currentIndex - 1,
      currentTime: 0,
      duration: 0,
      playing: true,
      requestId: state.requestId + 1,
    }));
  },

  seek: (time) => set({ currentTime: time }),
  setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
  setProgress: (currentTime, duration) => set({ currentTime, duration }),
  setPlaying: (playing) => set({ playing }),
}));
