'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FolderPlus, Play } from 'lucide-react';
import type { LibraryTrack } from '@trackzone/types';
import { usePlayerStore } from '@/stores/player-store';
import { formatContainer, formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ProcessingBadge } from '@/components/library/status-badge';
import { useProcessingRefresh } from '@/hooks/use-processing-refresh';
import { SourceRail } from '@/components/library/source-rail';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { CollectionOption } from '@/components/library/track-actions-menu';

/**
 * A grantee's view of tracks shared with them. Deliberately narrower than
 * LibraryTable: visibility/favorite/delete are owner-only (RLS would just
 * silently reject them), so the only actions offered here are ones a
 * grantee actually has — play, and adding to one of *their own* collections
 * (allowed per the collection_tracks RLS policy: owning the collection plus
 * being able to read the track is enough, no ownership of the track itself).
 */
export function SharedTrackList({
  tracks,
  collections = [],
}: {
  tracks: LibraryTrack[];
  collections?: CollectionOption[];
}) {
  useProcessingRefresh(tracks);
  const router = useRouter();
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

  async function addToCollection(trackId: string, collectionId: string) {
    await fetch(`/api/collections/${collectionId}/tracks`, {
      method: 'POST',
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
          <th className="py-2 pr-3 font-normal">Shared by</th>
          <th className="tabular py-2 pr-3 text-right font-normal">Duration</th>
          <th className="py-2 pr-3 font-normal">Format</th>
          <th className="py-2 pr-3 font-normal">Sources</th>
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
                  onClick={() => handlePlay(track)}
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
                {track.owner_display_name || track.owner_username}
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
                {collections.length > 0 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Add to collection">
                        <FolderPlus className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {collections.map((collection) => (
                        <DropdownMenuItem
                          key={collection.id}
                          onSelect={() => void addToCollection(track.id, collection.id)}
                        >
                          <span className="truncate">{collection.name}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
