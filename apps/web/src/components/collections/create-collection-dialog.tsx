'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { Plus, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCollectionSchema, type CreateCollectionFormInput } from '@trackzone/validation';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';

export function CreateCollectionDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCollectionFormInput>({
    resolver: zodResolver(createCollectionSchema),
    defaultValues: { visibility: 'private' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const response = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setFormError(body?.error?.message ?? 'Could not create the collection.');
      return;
    }

    reset();
    setOpen(false);
    router.refresh();
  });

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setFormError(null);
      }}
    >
      <Dialog.Trigger asChild>
        <Button variant="signal">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          New Collection
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content
          data-environment="workspace"
          className="border-line-strong bg-surface-1 fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-md border p-5 shadow-xl"
        >
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-fg text-sm font-medium">New collection</Dialog.Title>
            <Dialog.Close className="text-fg-subtle hover:text-fg" aria-label="Close">
              <X className="h-4 w-4" aria-hidden />
            </Dialog.Close>
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <Field label="Name" htmlFor="collection-name" error={errors.name?.message}>
              <Input id="collection-name" autoFocus {...register('name')} />
            </Field>

            <Field
              label="Description"
              htmlFor="collection-description"
              hint="Optional"
              error={errors.description?.message}
            >
              <Input id="collection-description" {...register('description')} />
            </Field>

            {formError ? (
              <p role="alert" className="text-danger text-xs">
                {formError}
              </p>
            ) : null}

            <Button
              type="submit"
              variant="signal"
              className="w-full justify-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating…' : 'Create collection'}
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
