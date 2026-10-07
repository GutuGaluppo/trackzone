'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordInput } from '@trackzone/validation';
import { createClient } from '@/lib/supabase/client';
import { authErrorMessage } from '@/lib/auth/error-message';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';

export function ResetPasswordForm() {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null);
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) {
        setFormError(authErrorMessage(error, 'password-reset'));
        return;
      }
      router.replace('/library');
      router.refresh();
    } catch (error) {
      setFormError(authErrorMessage(error, 'password-reset'));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field
        label="New password"
        htmlFor="password"
        hint="At least 10 characters."
        error={errors.password?.message}
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
      </Field>
      <Field
        label="Confirm new password"
        htmlFor="confirmPassword"
        error={errors.confirmPassword?.message}
      >
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          {...register('confirmPassword')}
        />
      </Field>

      {formError ? (
        <p role="alert" className="text-danger text-xs">
          {formError}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="signal"
        size="lg"
        className="w-full justify-center"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Updating password…' : 'Update password'}
      </Button>
    </form>
  );
}
