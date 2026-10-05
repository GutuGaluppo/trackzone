'use client';

import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { LibraryTrack } from '@trackzone/types';

/** Refresh only while background work is outstanding; the global player stays mounted. */
export function useProcessingRefresh(tracks: LibraryTrack[]) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const processing = tracks.some(
    (track) => track.processing_status === 'pending' || track.processing_status === 'processing',
  );

  useEffect(() => {
    if (!processing) return;
    const interval = setInterval(() => {
      if (!refreshing && document.visibilityState === 'visible') {
        startTransition(() => router.refresh());
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [processing, refreshing, router]);
}
