import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { createUploadSchema, extensionOf, sanitizeFilename } from '@trackzone/validation';
import { buildOriginalKey, DEFAULT_UPLOAD_URL_TTL_SECONDS } from '@trackzone/storage';
import { getOptionalUser } from '@/lib/auth/require-user';
import { fail, ok, route } from '@/lib/api/responses';
import { LIMITS, rateLimit } from '@/lib/api/rate-limit';
import { storage } from '@/lib/storage';

export const runtime = 'nodejs';

/**
 * POST /api/uploads
 *
 * Issues a short-lived signed URL so the browser can PUT straight to R2.
 * The file never touches this server (docs §6.6) — what this route does is
 * decide whether that upload is allowed to exist at all.
 *
 * No database row is created here: an abandoned upload should leave no trace.
 * Records are created by /api/uploads/complete, after the object is verified.
 */
export const POST = route(async (request: NextRequest) => {
  const { user } = await getOptionalUser();
  if (!user) return fail(401, 'not_authenticated', 'Sign in to upload audio.');

  const limit = rateLimit(
    `upload:${user.id}`,
    LIMITS.createUpload.limit,
    LIMITS.createUpload.windowMs,
  );
  if (!limit.allowed) {
    return fail(429, 'rate_limited', 'Too many uploads started. Try again shortly.');
  }

  const body = createUploadSchema.parse(await request.json());

  const uploadId = randomUUID();
  const storageKey = buildOriginalKey({
    userId: user.id,
    uploadId,
    extension: extensionOf(body.filename),
  });

  const target = await storage().createUploadUrl({
    key: storageKey,
    contentType: body.mimeType,
    expiresInSeconds: DEFAULT_UPLOAD_URL_TTL_SECONDS,
  });

  return ok({
    uploadId,
    storageKey,
    // Echoed back so the client stores the normalized name, not the raw one.
    filename: sanitizeFilename(body.filename),
    upload: target,
  });
});
