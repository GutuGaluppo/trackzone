import { describe, expect, it } from 'vitest';
import { authErrorMessage } from './error-message';

describe('authentication error messages', () => {
  it.each([
    new TypeError('Failed to fetch'),
    { name: 'AuthRetryableFetchError', status: 0, message: 'Network unavailable' },
    new TypeError('Load failed'),
  ])('identifies connection failures in both forms', (error) => {
    for (const action of ['sign-in', 'sign-up'] as const) {
      expect(authErrorMessage(error, action)).toContain('Cannot connect');
    }
  });

  it('only reports incorrect credentials when the service identifies them', () => {
    expect(authErrorMessage({ code: 'invalid_credentials', status: 400 }, 'sign-in')).toBe(
      'Incorrect email or password.',
    );
    expect(authErrorMessage({ status: 503 }, 'sign-in')).toContain('temporarily unavailable');
  });

  it('explains email confirmation instead of blaming the password', () => {
    expect(authErrorMessage({ code: 'email_not_confirmed' }, 'sign-in')).toContain(
      'Confirm your email',
    );
  });

  it.each([{ status: 429 }, { code: 'over_email_send_rate_limit' }])(
    'explains rate limits',
    (error) => {
      expect(authErrorMessage(error, 'sign-up')).toContain('wait a few minutes');
    },
  );

  it('directs an existing user to sign in', () => {
    expect(authErrorMessage({ code: 'user_already_exists' }, 'sign-up')).toContain(
      'Sign in instead',
    );
  });

  it('does not expose raw database failures', () => {
    const error = { status: 500, code: 'unexpected_failure', message: 'private database details' };
    expect(authErrorMessage(error, 'sign-up')).toBe(
      'Account creation is temporarily unavailable. Please try again later.',
    );
    expect(authErrorMessage(null, 'sign-in')).toContain('temporarily unavailable');
  });
});
