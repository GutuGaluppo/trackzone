'use client';

import * as React from 'react';
import { CloudDownload } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function GoogleDriveImportButton({ connected }: { connected: boolean }) {
  const [state, setState] = React.useState<'idle' | 'starting' | 'started' | 'error'>('idle');
  async function start() {
    setState('starting');
    const response = await fetch('/api/providers/google-drive/import', { method: 'POST' });
    setState(response.ok ? 'started' : 'error');
  }
  if (!connected) return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="ghost"
        size="md"
        disabled={state === 'starting'}
        onClick={() => void start()}
      >
        <CloudDownload className="h-3.5 w-3.5" aria-hidden />
        {state === 'starting'
          ? 'Starting…'
          : state === 'started'
            ? 'Import started'
            : 'Import Drive'}
      </Button>
      {state === 'error' ? (
        <p role="alert" className="text-danger text-2xs">
          Could not start the Drive import.
        </p>
      ) : null}
    </div>
  );
}
