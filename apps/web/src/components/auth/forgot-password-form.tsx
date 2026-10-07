'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { passwordResetRequestSchema, type PasswordResetRequestInput } from '@trackzone/validation';
import { createClient } from '@/lib/supabase/client';
import { authErrorMessage } from '@/lib/auth/error-message';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';

export function ForgotPasswordForm() {
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetRequestInput>({ resolver: zodResolver(passwordResetRequestSchema) });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) {
        setFormError(authErrorMessage(error, 'password-reset'));
        return;
      }
      // Keep the response identical whether an address has an account or not.
      setSubmitted(true);
    } catch (error) {
      setFormError(authErrorMessage(error, 'password-reset'));
    }
  });

  if (submitted) {
    return (
      <p className="border-olive/30 bg-olive/10 text-fg rounded-sm border px-3 py-2 text-xs">
        If an account exists for this address, we sent a password-reset link. Check your inbox.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register('email')}
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
        {isSubmitting ? 'Sending link…' : 'Send reset link'}
      </Button>
    </form>
  );
}
