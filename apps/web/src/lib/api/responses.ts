import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AuthorizationError, type DenyReason } from '@trackzone/database';

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, {
    ...init,
    headers: {
      // Signed URLs and library data are per-user and time-bound.
      'Cache-Control': 'private, no-store',
      ...init?.headers,
    },
  });
}

export function fail(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): NextResponse<ApiError> {
  return NextResponse.json(
    { error: { code, message, ...(details === undefined ? {} : { details }) } },
    { status, headers: { 'Cache-Control': 'private, no-store' } },
  );
}

/**
 * Maps a denial to a status code.
 *
 * `private_track`, `no_grant` and `not_owner` deliberately answer 404: telling
 * an unauthorized caller that a track exists is itself a small leak.
 */
const DENY_STATUS: Record<DenyReason, number> = {
  not_authenticated: 401,
  not_owner: 404,
  no_grant: 404,
  private_track: 404,
  download_not_allowed: 403,
};

const DENY_MESSAGE: Record<DenyReason, string> = {
  not_authenticated: 'Sign in to continue.',
  not_owner: 'Track not found.',
  no_grant: 'Track not found.',
  private_track: 'Track not found.',
  download_not_allowed: 'This track is not available for download.',
};

/**
 * Wraps a route handler with uniform error translation.
 *
 * Authorization failures are logged with their reason (never with secrets or
 * the caller's tokens) so denials remain auditable.
 */
export function route<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        console.warn('[authz] denied', { reason: error.reason });
        return fail(
          DENY_STATUS[error.reason],
          `authz_${error.reason}`,
          DENY_MESSAGE[error.reason],
        );
      }

      if (error instanceof ZodError) {
        return fail(400, 'invalid_request', 'The request was not valid.', error.flatten());
      }

      console.error('[api] unhandled error', error);
      return fail(500, 'internal_error', 'Something went wrong on our side.');
    }
  };
}
