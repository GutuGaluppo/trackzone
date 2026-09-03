import type { Provider } from '@trackzone/types';
import { PROVIDER_CODES } from '@trackzone/types';
import { cn } from '@/lib/utils';

const ALL_PROVIDERS: Provider[] = ['local', 'trackzone', 'google_drive', 'soundcloud', 'dropbox'];

/**
 * Compact source availability rail (docs §13): `LOC TZ GD SC DB` with a lit
 * dot for every provider the track is actually available from.
 */
export function SourceRail({ sources }: { sources: Provider[] }) {
  const available = new Set(sources);

  return (
    <div className="tabular flex items-center gap-1.5" aria-label="Available sources">
      {ALL_PROVIDERS.map((provider) => (
        <span
          key={provider}
          className={cn('text-2xs', available.has(provider) ? 'text-olive' : 'text-fg-subtle/40')}
          title={`${PROVIDER_CODES[provider]}${available.has(provider) ? ' — available' : ' — not available'}`}
        >
          {PROVIDER_CODES[provider]}
        </span>
      ))}
    </div>
  );
}
