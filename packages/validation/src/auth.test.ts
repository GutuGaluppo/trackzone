import { describe, expect, it } from 'vitest';
import {
  passwordResetRequestSchema,
  resetPasswordSchema,
  signUpSchema,
  updateProfileSchema,
} from './auth.ts';

describe('signUpSchema', () => {
  const base = { email: 'user@example.com', password: 'correct horse battery staple' };

  it('accepts an empty display name', () => {
    // Regression: an unfilled <input> submits '' via react-hook-form, never
    // undefined. A .min(1) here silently blocked every sign-up that left the
    // optional Display Name field blank — the common case — with no visible
    // error, because the field never had an error prop wired to show one.
    const result = signUpSchema.safeParse({ ...base, displayName: '' });
    expect(result.success).toBe(true);
  });

  it('accepts a missing display name', () => {
    expect(signUpSchema.safeParse(base).success).toBe(true);
  });

  it('accepts a real display name', () => {
    const result = signUpSchema.safeParse({ ...base, displayName: 'Gutu' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.displayName).toBe('Gutu');
  });

  it('still rejects a display name over the length limit', () => {
    const result = signUpSchema.safeParse({ ...base, displayName: 'x'.repeat(81) });
    expect(result.success).toBe(false);
  });
});

describe('updateProfileSchema', () => {
  it('accepts clearing the display name to an empty string', () => {
    expect(updateProfileSchema.safeParse({ displayName: '' }).success).toBe(true);
  });
});

describe('password reset schemas', () => {
  it('validates the email used to request a reset', () => {
    expect(passwordResetRequestSchema.safeParse({ email: 'user@example.com' }).success).toBe(true);
    expect(passwordResetRequestSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });

  it('requires a strong matching replacement password', () => {
    expect(
      resetPasswordSchema.safeParse({
        password: 'correct horse battery staple',
        confirmPassword: 'correct horse battery staple',
      }).success,
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({ password: 'correct horse', confirmPassword: 'different' })
        .success,
    ).toBe(false);
  });
});
