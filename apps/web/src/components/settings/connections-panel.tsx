'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PROVIDER_LABELS } from '@trackzone/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface ProviderConnectionSummary {
  id: string;
  provider_account_id: string | null;
  display_name: string | null;
  status: string;
  created_at: string;
  last_synced_at: string | null;
}

export type ConnectionNotice =
  { kind: 'success'; provider: string } | { kind: 'error'; code: string } | null;

const ERROR_MESSAGES: Record<string, string> = {
  soundcloud_unconfigured: 'SoundCloud isn’t configured on this deployment.',
  soundcloud_state: 'That connection attempt could not be verified. Please try again.',
  soundcloud_failed: 'Connecting to SoundCloud failed. Please try again.',
  access_denied: 'SoundCloud access was declined.',
};

const STATUS_DOT: Record<string, string> = {
  active: 'bg-olive',
  expired: 'bg-signal',
  revoked: 'bg-fg-subtle',
  error: 'bg-danger',
};

export function ConnectionsPanel({
  soundcloudConfigured,
  connection,
  notice,
}: {
  soundcloudConfigured: boolean;
  connection: ProviderConnectionSummary | null;
  notice: ConnectionNotice;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function disconnect() {
    setBusy(true);
    setError(null);
    const response = await fetch('/api/providers/soundcloud/disconnect', { method: 'POST' });
    setBusy(false);

    if (!response.ok) {
      setError('Could not disconnect. Try again.');
      return;
    }
    router.refresh();
  }

  return (
    <section className="mt-10 max-w-sm">
      <p className="label-plate">Connections</p>
      <h2 className="text-fg mt-0.5 text-sm font-medium">Sources</h2>
      <p className="text-fg-subtle mt-1 text-xs">
        Connect an external account to bring its audio into your library.
      </p>

      {notice?.kind === 'success' ? (
        <p className="border-olive/30 bg-olive/10 text-fg mt-4 rounded-sm border px-3 py-2 text-xs">
          {PROVIDER_LABELS.soundcloud} connected.
        </p>
      ) : null}
      {notice?.kind === 'error' ? (
        <p role="alert" className="text-danger mt-4 text-xs">
          {ERROR_MESSAGES[notice.code] ?? 'Something went wrong. Please try again.'}
        </p>
      ) : null}

      <div className="border-line mt-4 rounded-sm border p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-fg text-sm font-medium">{PROVIDER_LABELS.soundcloud}</p>

            {connection ? (
              <p className="text-fg-subtle mt-1 inline-flex items-center gap-1.5 text-xs">
                <span
                  className={cn(
                    'h-1.5 w-1.5 shrink-0 rounded-full',
                    STATUS_DOT[connection.status] ?? 'bg-fg-subtle',
                  )}
                  aria-hidden
                />
                <span className="truncate">
                  {connection.status === 'active' ? 'Connected' : `Connection ${connection.status}`}
                  {connection.display_name ? ` as ${connection.display_name}` : ''}
                </span>
              </p>
            ) : (
              <p className="text-fg-subtle mt-1 text-xs">
                {soundcloudConfigured ? 'Not connected.' : 'Not configured on this deployment.'}
              </p>
            )}
          </div>

          {connection ? (
            <Button variant="danger" size="sm" onClick={disconnect} disabled={busy}>
              {busy ? 'Disconnecting…' : 'Disconnect'}
            </Button>
          ) : soundcloudConfigured ? (
            <Button asChild variant="signal" size="sm">
              {/* Full navigation: this endpoint 302s to SoundCloud. */}
              <a href="/api/providers/soundcloud/connect">Connect</a>
            </Button>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="text-danger mt-2 text-xs">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
