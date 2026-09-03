'use client';

import { useQuery } from '@tanstack/react-query';

interface PlaybackResponse {
  url: string;
  expiresAt: string;
  allowDownload: boolean;
}

async function fetchPlaybackUrl(trackId: string): Promise<PlaybackResponse> {
  const response = await fetch(`/api/tracks/${trackId}/playback`, { cache: 'no-store' });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(body?.error?.message ?? 'This track could not be played.');
  }

  return response.json() as Promise<PlaybackResponse>;
}

/**
 * Signed playback URLs expire in minutes (docs §6.2), so this refetches well
 * before that: a track paused for a while must not hand the <audio> element a
 * link that has gone stale.
 */
export function usePlaybackUrl(trackId: string | null) {
  return useQuery({
    queryKey: ['playback-url', trackId],
    queryFn: () => fetchPlaybackUrl(trackId!),
    enabled: trackId !== null,
    staleTime: 3 * 60 * 1000,
    refetchInterval: 3 * 60 * 1000,
  });
}
