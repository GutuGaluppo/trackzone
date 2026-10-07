import Link from 'next/link';
import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata: Metadata = { title: 'Reset password' };

interface ForgotPasswordPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const { error } = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-fg text-lg font-medium">Reset your password</h1>
        <p className="text-fg-subtle mt-1 text-sm">We&apos;ll send you a secure reset link.</p>
      </div>

      {error === 'invalid-link' ? (
        <p role="alert" className="text-danger text-xs">
          This reset link is invalid or has expired. Request a new one below.
        </p>
      ) : null}

      <ForgotPasswordForm />

      <p className="text-fg-subtle text-center text-xs">
        Remembered it?{' '}
        <Link href="/sign-in" className="text-fg font-medium underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </div>
  );
}
