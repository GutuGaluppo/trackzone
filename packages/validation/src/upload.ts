import { z } from 'zod';
import {
  MAX_UPLOAD_BYTES,
  MIN_UPLOAD_BYTES,
  isAllowedMimeType,
  mimeMatchesExtension,
} from './audio.ts';

/**
 * Request for a signed R2 upload URL.
 *
 * Everything here is attacker-controlled, so the checks are deliberately
 * strict: the server refuses to sign anything it has not validated.
 */
export const createUploadSchema = z
  .object({
    filename: z.string().trim().min(1, 'Missing filename').max(255),
    mimeType: z.string().trim().min(1).max(120),
    fileSize: z
      .number()
      .int('File size must be a whole number of bytes')
      .min(MIN_UPLOAD_BYTES, 'The file is empty')
      .max(MAX_UPLOAD_BYTES, 'The file exceeds the 2 GB upload limit'),
    checksum: z
      .string()
      .regex(/^[a-f0-9]{64}$/, 'Expected a lowercase SHA-256 hex digest')
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (!isAllowedMimeType(value.mimeType)) {
      ctx.addIssue({
        code: 'custom',
        path: ['mimeType'],
        message: 'Unsupported audio format',
      });
      return;
    }

    if (!mimeMatchesExtension(value.mimeType, value.filename)) {
      ctx.addIssue({
        code: 'custom',
        path: ['filename'],
        message: 'The file extension does not match the declared audio format',
      });
    }
  });

/**
 * Sent after the browser has finished its direct PUT to R2. The server
 * re-verifies the object against storage before creating any record.
 */
export const completeUploadSchema = z.object({
  storageKey: z.string().min(1).max(512),
  checksum: z
    .string()
    .regex(/^[a-f0-9]{64}$/, 'Expected a lowercase SHA-256 hex digest')
    .optional(),
});

export type CreateUploadInput = z.infer<typeof createUploadSchema>;
export type CompleteUploadInput = z.infer<typeof completeUploadSchema>;
