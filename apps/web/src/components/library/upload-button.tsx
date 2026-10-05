'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2, Upload, X } from 'lucide-react';
import {
  ALLOWED_AUDIO_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  resolveAudioMimeType,
} from '@trackzone/validation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type FileState = {
  id: string;
  name: string;
  status: 'uploading' | 'processing' | 'done' | 'error';
  message?: string;
};

const ACCEPT = ALLOWED_AUDIO_EXTENSIONS.map((ext) => `.${ext}`).join(',');

/**
 * Local upload flow (docs §6.6): the file goes browser → R2 directly with a
 * signed URL this server issued. Nothing audio-sized ever passes through the
 * Next.js server.
 */
export function UploadButton() {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [items, setItems] = React.useState<FileState[]>([]);

  async function uploadOne(file: File) {
    const id = crypto.randomUUID();
    setItems((prev) => [...prev, { id, name: file.name, status: 'uploading' }]);

    const update = (patch: Partial<FileState>) =>
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));

    try {
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error('File exceeds the 2 GB upload limit.');
      }
      if (file.size === 0) throw new Error('This file is empty. Choose a different audio file.');
      const mimeType = resolveAudioMimeType(file.name, file.type);
      if (!mimeType)
        throw new Error(
          'Unsupported audio format. Choose a WAV, AIFF, FLAC, MP3, M4A, AAC, OGG or OPUS file.',
        );

      const createResponse = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filename: file.name, mimeType, fileSize: file.size }),
      });

      if (!createResponse.ok) {
        const body = (await createResponse.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(body?.error?.message ?? 'Could not start the upload.');
      }

      const { storageKey, filename, upload } = (await createResponse.json()) as {
        storageKey: string;
        filename: string;
        upload: { url: string; headers: Record<string, string> };
      };

      let putResponse: Response;
      try {
        putResponse = await fetch(upload.url, {
          method: 'PUT',
          headers: upload.headers,
          body: file,
        });
      } catch {
        throw new Error(
          'Could not connect to audio storage. Your file was not imported. Please try again.',
        );
      }

      if (!putResponse.ok)
        throw new Error(
          putResponse.status === 413
            ? 'This file exceeds the storage upload limit.'
            : 'Audio storage rejected the upload. Your file was not imported. Please try again.',
        );

      update({ status: 'processing' });

      const completeResponse = await fetch('/api/uploads/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ storageKey, filename, mimeType }),
      });

      if (!completeResponse.ok) {
        const body = (await completeResponse.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(body?.error?.message ?? 'Could not finish processing the upload.');
      }

      update({ status: 'done' });
      router.refresh();
    } catch (error) {
      update({
        status: 'error',
        message: error instanceof Error ? error.message : 'Upload failed.',
      });
    }
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    for (const file of Array.from(fileList)) void uploadOne(file);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <Button variant="signal" size="md" onClick={() => inputRef.current?.click()}>
        <Upload className="h-3.5 w-3.5" aria-hidden />
        Import audio
      </Button>

      {items.length > 0 ? (
        <ul
          aria-live="polite"
          className="border-line bg-surface-1 w-80 space-y-2 rounded-sm border p-2"
        >
          {items.map((item) => (
            <li key={item.id} className="text-2xs flex flex-wrap items-center gap-2">
              {item.status === 'uploading' || item.status === 'processing' ? (
                <Loader2 className="text-fg-subtle h-3 w-3 shrink-0 animate-spin" aria-hidden />
              ) : item.status === 'done' ? (
                <CheckCircle2 className="text-olive h-3 w-3 shrink-0" aria-hidden />
              ) : (
                <AlertCircle className="text-danger h-3 w-3 shrink-0" aria-hidden />
              )}
              <span className="text-fg-muted flex-1 truncate">{item.name}</span>
              <span
                className={cn(
                  'shrink-0',
                  item.status === 'error' ? 'text-danger' : 'text-fg-subtle',
                )}
              >
                {item.status === 'uploading' && 'Uploading…'}
                {item.status === 'processing' && 'Finishing…'}
                {item.status === 'done' && 'Uploaded'}
                {item.status === 'error' && 'Failed'}
              </span>
              {item.status === 'done' || item.status === 'error' ? (
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                  className="text-fg-subtle hover:text-fg"
                  aria-label={`Dismiss ${item.name}`}
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              ) : null}
              {item.status === 'error' ? (
                <p role="alert" className="text-danger w-full break-words pl-5">
                  {item.message ?? 'Upload failed.'}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
