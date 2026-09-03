import Link from 'next/link';
import type { Metadata } from 'next';
import { SignInForm } from '@/components/auth/sign-in-form';

export const metadata: Metadata = { title: 'Sign in' };

interface SignInPageProps {
  searchParams: Promise<{ confirmEmail?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { confirmEmail } = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-fg text-lg font-medium">Sign in</h1>
        <p className="text-fg-subtle mt-1 text-sm">Your audio, wherever it lives.</p>
      </div>

      {confirmEmail ? (
        <p className="border-olive/30 bg-olive/10 text-fg rounded-sm border px-3 py-2 text-xs">
          Check your inbox to confirm your email before signing in.
        </p>
      ) : null}

      <SignInForm />

      <p className="text-fg-subtle text-center text-xs">
        New to TrackZone?{' '}
        <Link href="/sign-up" className="text-fg font-medium underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </div>
  );
}
