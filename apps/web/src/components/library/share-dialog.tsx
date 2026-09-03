'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { UserPlus, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Grant {
  user_id: string;
  role: string;
  profiles: { username: string; display_name: string | null } | null;
}

async function fetchGrants(trackId: string): Promise<Grant[]> {
  const response = await fetch(`/api/tracks/${trackId}/access`);
  if (!response.ok) throw new Error('Could not load who this is shared with.');
  const body = (await response.json()) as { grants: Grant[] };
  return body.grants;
}

export function ShareDialog({
  trackId,
  trackTitle,
  open,
  onOpenChange,
}: {
  trackId: string;
  trackTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [username, setUsername] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const queryKey = ['track-access', trackId];
  const { data: grants, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchGrants(trackId),
    enabled: open,
  });

  async function addGrant(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setError(null);
    setPending(true);

    const response = await fetch(`/api/tracks/${trackId}/access`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: username.trim() }),
    });

    setPending(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(body?.error?.message ?? 'Could not share with that person.');
      return;
    }

    setUsername('');
    await queryClient.invalidateQueries({ queryKey });
    router.refresh();
  }

  async function revoke(userId: string) {
    setPending(true);
    await fetch(`/api/tracks/${trackId}/access`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    setPending(false);
    await queryClient.invalidateQueries({ queryKey });
    router.refresh();
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content
          data-environment="workspace"
          className="border-line-strong bg-surface-1 fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-md border p-5 shadow-xl"
        >
          <div className="mb-1 flex items-center justify-between">
            <Dialog.Title className="text-fg text-sm font-medium">Share</Dialog.Title>
            <Dialog.Close className="text-fg-subtle hover:text-fg" aria-label="Close">
              <X className="h-4 w-4" aria-hidden />
            </Dialog.Close>
          </div>
          <Dialog.Description className="text-fg-subtle mb-4 truncate text-xs">
            {trackTitle}
          </Dialog.Description>

          <form onSubmit={addGrant} className="flex gap-2">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              aria-label="Username to share with"
            />
            <Button type="submit" variant="signal" disabled={pending || !username.trim()}>
              <UserPlus className="h-3.5 w-3.5" aria-hidden />
              Add
            </Button>
          </form>
          {error ? (
            <p role="alert" className="text-danger mt-2 text-xs">
              {error}
            </p>
          ) : null}

          <ul className="mt-4 space-y-1">
            {isLoading ? <li className="text-fg-subtle text-xs">Loading…</li> : null}
            {!isLoading && grants?.length === 0 ? (
              <li className="text-fg-subtle text-xs">Not shared with anyone yet.</li>
            ) : null}
            {grants?.map((grant) => (
              <li
                key={grant.user_id}
                className="bg-surface-2 flex items-center justify-between rounded-sm px-2.5 py-1.5 text-xs"
              >
                <span className="text-fg truncate">
                  {grant.profiles?.display_name || grant.profiles?.username || 'Unknown user'}
                </span>
                <button
                  type="button"
                  onClick={() => void revoke(grant.user_id)}
                  disabled={pending}
                  className="text-fg-subtle hover:text-danger"
                  aria-label={`Remove ${grant.profiles?.username ?? 'this person'}`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
