'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateProfileSchema, type UpdateProfileInput } from '@trackzone/validation';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';

export function ProfileForm({
  username,
  displayName,
}: {
  username: string;
  displayName: string | null;
}) {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { username, displayName: displayName ?? '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSaved(false);

    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setFormError(body?.error?.message ?? 'Could not save your profile.');
      return;
    }

    setSaved(true);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-sm space-y-4">
      <Field label="Username" htmlFor="username" error={errors.username?.message}>
        <Input id="username" {...register('username')} />
      </Field>

      <Field label="Display name" htmlFor="displayName" error={errors.displayName?.message}>
        <Input id="displayName" {...register('displayName')} />
      </Field>

      {formError ? (
        <p role="alert" className="text-danger text-xs">
          {formError}
        </p>
      ) : null}
      {saved ? <p className="text-olive text-xs">Saved.</p> : null}

      <Button type="submit" variant="signal" disabled={isSubmitting || !isDirty}>
        {isSubmitting ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}
