'use client';

import { Heart, Play } from 'lucide-react';
import type { LibraryTrack } from '@trackzone/types';
import { usePlayerStore } from '@/stores/player-store';
import { formatContainer, formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ProcessingBadge } from '@/components/library/status-badge';
import { SourceRail } from '@/components/library/source-rail';
import { TrackActionsMenu, type CollectionOption } from '@/components/library/track-actions-menu';
import { useProcessingRefresh } from '@/hooks/use-processing-refresh';

export function LibraryTable({
  tracks,
  collections = [],
}: {
  tracks: LibraryTrack[];
  collections?: CollectionOption[];
}) {
  useProcessingRefresh(tracks);
  const currentTrackId = usePlayerStore((s) => s.currentTrack()?.id ?? null);
  const playing = usePlayerStore((s) => s.playing);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const togglePlay = usePlayerStore((s) => s.togglePlay);

  function handlePlay(track: LibraryTrack) {
    if (track.id === currentTrackId) {
      togglePlay();
      return;
    }
    playTrack({
      id: track.id,
      title: track.title,
      artistName: track.artist_name,
      durationMs: track.duration_ms,
    });
  }

  return (
    <table className="w-full border-collapse text-left text-xs">
      <thead>
        <tr className="rule text-fg-subtle">
          <th className="w-9 py-2 pl-3 font-normal" />
          <th className="py-2 pr-3 font-normal">Track</th>
          <th className="py-2 pr-3 font-normal">Artist</th>
          <th className="tabular py-2 pr-3 text-right font-normal">Duration</th>
          <th className="py-2 pr-3 font-normal">Format</th>
          <th className="py-2 pr-3 font-normal">Sources</th>
          <th className="w-9 py-2 pr-3 font-normal" />
        </tr>
      </thead>
      <tbody>
        {tracks.map((track) => {
          const isCurrent = track.id === currentTrackId;
          // Mirrors the server: the file is playable the moment it's uploaded.
          // Processing only enriches metadata — it never gates playback,
          // except when it has definitively failed.
          const isPlayable = track.processing_status !== 'failed';

          return (
            <tr
              key={track.id}
              className={cn(
                'rule h-row hover:bg-surface-2 group transition-colors',
                isCurrent && 'bg-surface-2',
              )}
            >
              <td className="pl-3">
                <button
                  type="button"
                  onClick={() => handlePlay(track)}
                  disabled={!isPlayable}
                  aria-label={isCurrent && playing ? `Pause ${track.title}` : `Play ${track.title}`}
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full',
                    'text-fg-muted hover:bg-surface-4 hover:text-fg disabled:opacity-30',
                    isCurrent && 'text-signal',
                  )}
                >
                  <Play className="h-3 w-3 translate-x-px" aria-hidden />
                </button>
              </td>
              <td className="max-w-64 truncate py-2 pr-3">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn('truncate font-medium', isCurrent ? 'text-signal' : 'text-fg')}
                  >
                    {track.title}
                  </span>
                  {track.favorite ? (
                    <Heart
                      className="fill-signal text-signal h-3 w-3 shrink-0"
                      aria-label="Favorite"
                    />
                  ) : null}
                </div>
                <ProcessingBadge status={track.processing_status ?? 'ready'} />
              </td>
              <td className="text-fg-muted max-w-40 truncate py-2 pr-3">
                {track.artist_name ??
                  (track.processing_status === 'ready' ? 'Unknown artist' : '—')}
              </td>
              <td className="text-fg-muted tabular py-2 pr-3 text-right">
                {formatDuration(track.duration_ms)}
              </td>
              <td className="text-fg-muted tabular py-2 pr-3">
                {formatContainer(track.original_filename, track.codec)}
              </td>
              <td className="py-2 pr-3">
                <SourceRail sources={track.source_providers} />
              </td>
              <td className="py-2 pr-3">
                <TrackActionsMenu
                  trackId={track.id}
                  trackTitle={track.title}
                  artistName={track.artist_name}
                  albumName={track.album_name}
                  visibility={track.visibility}
                  favorite={track.favorite}
                  collections={collections}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
