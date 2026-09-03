'use client';

import { Play, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { LibraryTrack } from '@trackzone/types';
import { usePlayerStore } from '@/stores/player-store';
import { formatContainer, formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ProcessingBadge } from '@/components/library/status-badge';

export function CollectionTrackList({
  collectionId,
  tracks,
}: {
  collectionId: string;
  tracks: LibraryTrack[];
}) {
  const router = useRouter();
  const currentTrackId = usePlayerStore((s) => s.currentTrack()?.id ?? null);
  const playing = usePlayerStore((s) => s.playing);
  const playQueue = usePlayerStore((s) => s.playQueue);
  const togglePlay = usePlayerStore((s) => s.togglePlay);

  const queueTracks = tracks.map((t) => ({
    id: t.id,
    title: t.title,
    artistName: t.artist_name,
    durationMs: t.duration_ms,
  }));

  function handlePlay(trackId: string) {
    if (trackId === currentTrackId) {
      togglePlay();
      return;
    }
    playQueue(
      queueTracks,
      queueTracks.findIndex((t) => t.id === trackId),
    );
  }

  async function removeFromCollection(trackId: string) {
    await fetch(`/api/collections/${collectionId}/tracks`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ trackId }),
    });
    router.refresh();
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
          <th className="w-9 py-2 pr-3 font-normal" />
        </tr>
      </thead>
      <tbody>
        {tracks.map((track) => {
          const isCurrent = track.id === currentTrackId;
          const isPlayable = track.processing_status !== 'failed';

          return (
            <tr
              key={track.id}
              className={cn('rule h-row hover:bg-surface-2 group', isCurrent && 'bg-surface-2')}
            >
              <td className="pl-3">
                <button
                  type="button"
                  onClick={() => handlePlay(track.id)}
                  disabled={!isPlayable}
                  aria-label={isCurrent && playing ? `Pause ${track.title}` : `Play ${track.title}`}
                  className={cn(
                    'text-fg-muted hover:bg-surface-4 hover:text-fg flex h-6 w-6 items-center justify-center rounded-full disabled:opacity-30',
                    isCurrent && 'text-signal',
                  )}
                >
                  <Play className="h-3 w-3 translate-x-px" aria-hidden />
                </button>
              </td>
              <td className="max-w-64 truncate py-2 pr-3">
                <span className={cn('truncate font-medium', isCurrent ? 'text-signal' : 'text-fg')}>
                  {track.title}
                </span>
                <ProcessingBadge status={track.processing_status ?? 'ready'} />
              </td>
              <td className="text-fg-muted max-w-40 truncate py-2 pr-3">
                {track.artist_name ?? '—'}
              </td>
              <td className="text-fg-muted tabular py-2 pr-3 text-right">
                {formatDuration(track.duration_ms)}
              </td>
              <td className="text-fg-muted tabular py-2 pr-3">
                {formatContainer(track.original_filename, track.codec)}
              </td>
              <td className="py-2 pr-3">
                <button
                  type="button"
                  onClick={() => void removeFromCollection(track.id)}
                  className="text-fg-subtle hover:bg-surface-4 hover:text-fg flex h-6 w-6 items-center justify-center rounded-full"
                  aria-label={`Remove ${track.title} from this collection`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
