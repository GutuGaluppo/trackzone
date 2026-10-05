'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { updateTrackSchema, type UpdateTrackInput } from '@trackzone/validation';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { usePlayerStore } from '@/stores/player-store';

export function EditTrackDialog({
  trackId,
  trackTitle,
  artistName,
  albumName,
  onOpenChange,
}: {
  trackId: string;
  trackTitle: string;
  artistName: string | null;
  albumName: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateTrackInput>({
    resolver: zodResolver(updateTrackSchema),
    defaultValues: { title: trackTitle, artistName: artistName ?? '', albumName: albumName ?? '' },
  });

  const save = handleSubmit(async (values) => {
    setError(null);
    const metadata = {
      title: values.title?.trim(),
      artistName: values.artistName?.trim() || null,
      albumName: values.albumName?.trim() || null,
    };
    try {
      const response = await fetch(`/api/tracks/${trackId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(metadata),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message ?? 'Could not save track details. Please try again.');
        return;
      }
      usePlayerStore.setState((state) => ({
        queue: state.queue.map((track) =>
          track.id === trackId
            ? {
                ...track,
                title: metadata.title ?? track.title,
                artistName: metadata.artistName,
              }
            : track,
        ),
      }));
      onOpenChange(false);
      router.refresh();
    } catch {
      setError('Could not connect. Your changes have not been saved. Please try again.');
    }
  });

  return (
    <Dialog.Root open onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content
          data-environment="workspace"
          className="border-line-strong bg-surface-1 fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-md border p-5 shadow-xl"
        >
          <div className="mb-1 flex items-center justify-between">
            <Dialog.Title className="text-fg text-sm font-medium">Edit track details</Dialog.Title>
            <Dialog.Close className="text-fg-subtle hover:text-fg" aria-label="Close">
              <X className="h-4 w-4" aria-hidden />
            </Dialog.Close>
          </div>
          <Dialog.Description className="text-fg-subtle mb-4 text-xs">
            Add or correct information that is missing from the audio file.
          </Dialog.Description>
          <form onSubmit={save} noValidate className="space-y-4">
            <Field label="Title" htmlFor={`track-title-${trackId}`} error={errors.title?.message}>
              <Input
                id={`track-title-${trackId}`}
                maxLength={300}
                aria-invalid={!!errors.title}
                {...register('title')}
              />
            </Field>
            <Field
              label="Artist"
              htmlFor={`track-artist-${trackId}`}
              hint="Optional"
              error={errors.artistName?.message}
            >
              <Input
                id={`track-artist-${trackId}`}
                maxLength={200}
                aria-invalid={!!errors.artistName}
                {...register('artistName')}
              />
            </Field>
            <Field
              label="Album"
              htmlFor={`track-album-${trackId}`}
              hint="Optional"
              error={errors.albumName?.message}
            >
              <Input
                id={`track-album-${trackId}`}
                maxLength={200}
                aria-invalid={!!errors.albumName}
                {...register('albumName')}
              />
            </Field>
            {error ? (
              <p role="alert" className="text-danger text-xs">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              variant="signal"
              className="w-full justify-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving…' : 'Save details'}
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
