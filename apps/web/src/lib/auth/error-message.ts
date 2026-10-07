type AuthAction = 'sign-in' | 'sign-up' | 'password-reset';

/** Translate service failures without exposing database details or credentials. */
export function authErrorMessage(error: unknown, action: AuthAction): string {
  const details = typeof error === 'object' && error !== null ? error : {};
  const code = 'code' in details && typeof details.code === 'string' ? details.code : '';
  const name = 'name' in details && typeof details.name === 'string' ? details.name : '';
  const status = 'status' in details && typeof details.status === 'number' ? details.status : null;
  const message =
    'message' in details && typeof details.message === 'string' ? details.message : '';

  if (
    name === 'AuthRetryableFetchError' ||
    status === 0 ||
    /failed to fetch|fetch failed|networkerror|network request failed|load failed/i.test(message)
  ) {
    return 'Cannot connect to the sign-in service. Check your connection and try again.';
  }

  if (code === 'email_not_confirmed') {
    return 'Confirm your email using the link we sent before signing in.';
  }
  if (
    status === 429 ||
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit'
  ) {
    return 'Too many attempts. Please wait a few minutes before trying again.';
  }
  if (code === 'invalid_credentials') {
    return 'Incorrect email or password.';
  }
  if (
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    /already registered/i.test(message)
  ) {
    return 'An account with that email already exists. Sign in instead.';
  }
  if (code === 'weak_password') {
    return 'This password does not meet the security requirements. Choose a stronger password.';
  }
  if (code === 'email_address_invalid') {
    return 'This email address is not supported. Please use a different address.';
  }
  if (code === 'signup_disabled' || code === 'email_provider_disabled') {
    return 'Email account registration is currently unavailable. Please try again later.';
  }

  if (action === 'sign-up') {
    return 'Account creation is temporarily unavailable. Please try again later.';
  }
  if (action === 'password-reset') {
    return 'Password reset is temporarily unavailable. Please try again later.';
  }
  return 'Sign-in is temporarily unavailable. Please try again later.';
}
