import Link from 'next/link';
import type { Metadata } from 'next';
import { SignUpForm } from '@/components/auth/sign-up-form';

export const metadata: Metadata = { title: 'Create account' };

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-fg text-lg font-medium">Create your account</h1>
        <p className="text-fg-subtle mt-1 text-sm">All your audio. Finally yours.</p>
      </div>

      <SignUpForm />

      <p className="text-fg-subtle text-center text-xs">
        Already have an account?{' '}
        <Link href="/sign-in" className="text-fg font-medium underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </div>
  );
}
