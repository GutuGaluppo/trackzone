'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema, type SignUpInput } from '@trackzone/validation';
import { createClient } from '@/lib/supabase/client';
import { authErrorMessage } from '@/lib/auth/error-message';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';

export function SignUpForm() {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const supabase = createClient();

      const { error, data } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: values.displayName ? { data: { display_name: values.displayName } } : undefined,
      });

      if (error) {
        setFormError(authErrorMessage(error, 'sign-up'));
        return;
      }

      // Email confirmation is on by default in Supabase; a session may not exist yet.
      if (data.session) {
        router.replace('/library');
        router.refresh();
      } else {
        router.replace('/sign-in?confirmEmail=1');
      }
    } catch (error) {
      setFormError(authErrorMessage(error, 'sign-up'));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field
        label="Display name"
        htmlFor="displayName"
        hint="Optional — you can change this later."
        error={errors.displayName?.message}
      >
        <Input id="displayName" autoComplete="name" {...register('displayName')} />
      </Field>

      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
      </Field>

      <Field
        label="Password"
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
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
