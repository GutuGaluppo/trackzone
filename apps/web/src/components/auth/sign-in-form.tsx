'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema, type SignInInput } from '@trackzone/validation';
import { createClient } from '@/lib/supabase/client';
import { authErrorMessage } from '@/lib/auth/error-message';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword(values);

      if (error) {
        setFormError(authErrorMessage(error, 'sign-in'));
        return;
      }

      router.replace(searchParams.get('next') || '/library');
      router.refresh();
    } catch (error) {
      setFormError(authErrorMessage(error, 'sign-in'));
    }
  });

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

      <Field label="Password" htmlFor="password" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
      </Field>

      <div className="-mt-2 text-right">
        <Link
          href="/forgot-password"
          className="text-fg-subtle hover:text-fg text-xs underline underline-offset-2"
        >
          Forgot your password?
        </Link>
      </div>

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
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
