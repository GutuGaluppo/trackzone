'use client';

import * as React from 'react';
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { usePlayerStore } from '@/stores/player-store';
import { usePlaybackUrl } from '@/hooks/use-playback-url';
import { formatSeconds } from '@/lib/format';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * The persistent player (docs §10, §16): always mounted in the workspace
 * layout so playback survives navigation. The <audio> element is the single
 * source of truth for time/duration; the store just mirrors it for the UI.
 */
export function PlayerBar() {
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const playing = usePlayerStore((s) => s.playing);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const requestId = usePlayerStore((s) => s.requestId);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const seek = usePlayerStore((s) => s.seek);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const setProgress = usePlayerStore((s) => s.setProgress);
  const setPlaying = usePlayerStore((s) => s.setPlaying);

  const track = queue[currentIndex] ?? null;
  const hasNext = currentIndex > -1 && currentIndex < queue.length - 1;
  const hasPrevious = currentIndex > 0;

  const { data: playback, isError, error } = usePlaybackUrl(track?.id ?? null);

  // New track (or a re-request for the same one): load the signed URL and
  // start playback from zero rather than resuming mid-buffer of the old file.
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !playback) return;
    audio.src = playback.url;
    audio.currentTime = 0;
    if (playing) void audio.play().catch(() => setPlaying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the track/URL changes
  }, [playback?.url, requestId]);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !playback) return;
    if (playing) void audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }, [playing, playback, setPlaying]);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  // The store is the source of truth for a user-initiated seek.
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio || Number.isNaN(audio.duration)) return;
    if (Math.abs(audio.currentTime - currentTime) > 0.75) {
      audio.currentTime = currentTime;
    }
  }, [currentTime]);

  if (!track) return null;

  return (
    <div
      data-environment="workspace"
      className="border-line bg-surface-1 flex h-16 items-center gap-4 border-t px-4"
    >
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={(e) =>
          setProgress(e.currentTarget.currentTime, e.currentTarget.duration || 0)
        }
        onLoadedMetadata={(e) =>
          setProgress(e.currentTarget.currentTime, e.currentTarget.duration || 0)
        }
        onEnded={() => (hasNext ? next() : setPlaying(false))}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      <div className="flex min-w-40 flex-col overflow-hidden">
        <span className="text-fg truncate text-xs font-medium">{track.title}</span>
        <span className="text-2xs text-fg-subtle truncate">
          {track.artistName ?? 'Unknown artist'}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center gap-1">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={previous}
            disabled={!hasPrevious && currentTime <= 3}
            aria-label="Previous track"
          >
            <SkipBack className="h-3.5 w-3.5" aria-hidden />
          </Button>
          <Button
            variant="signal"
            size="icon"
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
            className="h-8 w-8 rounded-full"
          >
            {playing ? (
              <Pause className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Play className="h-3.5 w-3.5 translate-x-px" aria-hidden />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={next}
            disabled={!hasNext}
            aria-label="Next track"
          >
            <SkipForward className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>

        <div className="tabular flex w-full max-w-xl items-center gap-2">
          <span className="text-2xs text-fg-subtle w-9 text-right">
            {formatSeconds(currentTime)}
          </span>
          <Slider
            label="Seek"
            value={currentTime}
            max={duration || 0}
            step={0.1}
            onValueChange={seek}
            className="w-full"
          />
          <span className="text-2xs text-fg-subtle w-9">{formatSeconds(duration)}</span>
        </div>

        {isError ? (
          <p className="text-2xs text-danger">
            {error instanceof Error ? error.message : 'Playback error'}
          </p>
        ) : null}
      </div>

      <div className="flex w-28 items-center gap-1.5">
        <button
          type="button"
          onClick={() => setVolume(volume > 0 ? 0 : 1)}
          className="text-fg-subtle hover:text-fg"
          aria-label={volume > 0 ? 'Mute' : 'Unmute'}
        >
          {volume > 0 ? (
            <Volume2 className={cn('h-3.5 w-3.5')} aria-hidden />
          ) : (
            <VolumeX className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>
        <Slider label="Volume" value={volume} max={1} step={0.01} onValueChange={setVolume} />
      </div>
    </div>
  );
}
