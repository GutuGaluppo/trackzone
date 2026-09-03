'use client';

import { Button } from '@/components/ui/button';

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      data-environment="workspace"
      className="bg-surface-0 text-fg flex h-full flex-col items-center justify-center gap-3 px-4 text-center"
    >
      <p className="text-fg text-sm">Something went wrong.</p>
      <p className="text-fg-subtle max-w-sm text-xs">
        {error.digest ? `Reference: ${error.digest}` : 'Try again, or refresh the page.'}
      </p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
