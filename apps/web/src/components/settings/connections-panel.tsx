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
  google_drive_unconfigured: 'Google Drive isn’t configured on this deployment.',
  google_drive_state:
    'That Google Drive connection attempt could not be verified. Please try again.',
  google_drive_failed: 'Connecting to Google Drive failed. Please try again.',
};

const STATUS_DOT: Record<string, string> = {
  active: 'bg-olive',
  expired: 'bg-signal',
  revoked: 'bg-fg-subtle',
  error: 'bg-danger',
};

export function ConnectionsPanel({
  soundcloudConfigured,
  soundcloudConnection,
  googleDriveConfigured,
  googleDriveConnection,
  notice,
}: {
  soundcloudConfigured: boolean;
  soundcloudConnection: ProviderConnectionSummary | null;
  googleDriveConfigured: boolean;
  googleDriveConnection: ProviderConnectionSummary | null;
  notice: ConnectionNotice;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function disconnect(provider: 'soundcloud' | 'google-drive') {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/providers/${provider}/disconnect`, { method: 'POST' });
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
          {PROVIDER_LABELS[notice.provider as keyof typeof PROVIDER_LABELS] ?? notice.provider}{' '}
          connected.
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

            {soundcloudConnection ? (
              <p className="text-fg-subtle mt-1 inline-flex items-center gap-1.5 text-xs">
                <span
                  className={cn(
                    'h-1.5 w-1.5 shrink-0 rounded-full',
                    STATUS_DOT[soundcloudConnection.status] ?? 'bg-fg-subtle',
                  )}
                  aria-hidden
                />
                <span className="truncate">
                  {soundcloudConnection.status === 'active'
                    ? 'Connected'
                    : `Connection ${soundcloudConnection.status}`}
                  {soundcloudConnection.display_name
                    ? ` as ${soundcloudConnection.display_name}`
                    : ''}
                </span>
              </p>
            ) : (
              <p className="text-fg-subtle mt-1 text-xs">
                {soundcloudConfigured ? 'Not connected.' : 'Not configured on this deployment.'}
              </p>
            )}
          </div>

          {soundcloudConnection ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => void disconnect('soundcloud')}
              disabled={busy}
            >
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

      <div className="border-line mt-3 rounded-sm border p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-fg text-sm font-medium">{PROVIDER_LABELS.google_drive}</p>
            {googleDriveConnection ? (
              <p className="text-fg-subtle mt-1 inline-flex items-center gap-1.5 text-xs">
                <span
                  className={cn(
                    'h-1.5 w-1.5 shrink-0 rounded-full',
                    STATUS_DOT[googleDriveConnection.status] ?? 'bg-fg-subtle',
                  )}
                  aria-hidden
                />
                <span className="truncate">
                  {googleDriveConnection.status === 'active'
                    ? 'Connected'
                    : `Connection ${googleDriveConnection.status}`}
                  {googleDriveConnection.display_name
                    ? ` as ${googleDriveConnection.display_name}`
                    : ''}
                </span>
              </p>
            ) : (
              <p className="text-fg-subtle mt-1 text-xs">
                {googleDriveConfigured ? 'Not connected.' : 'Not configured on this deployment.'}
              </p>
            )}
          </div>
          {googleDriveConnection ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => void disconnect('google-drive')}
              disabled={busy}
            >
              {busy ? 'Disconnecting…' : 'Disconnect'}
            </Button>
          ) : googleDriveConfigured ? (
            <Button asChild variant="signal" size="sm">
              <a href="/api/providers/google-drive/connect">Connect</a>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
