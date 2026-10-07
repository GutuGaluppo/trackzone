import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata: Metadata = { title: 'Choose a new password' };

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-fg text-lg font-medium">Choose a new password</h1>
        <p className="text-fg-subtle mt-1 text-sm">Use at least 10 characters.</p>
      </div>

      <ResetPasswordForm />
    </div>
  );
}
