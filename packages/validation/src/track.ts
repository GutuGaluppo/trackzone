import { z } from 'zod';

export const visibilitySchema = z.enum(['private', 'shared', 'public']);
export const providerSchema = z.enum([
  'trackzone',
  'local',
  'google_drive',
  'soundcloud',
  'dropbox',
]);

export const uuidSchema = z.string().uuid('Expected a valid id');

export const updateTrackSchema = z
  .object({
    title: z.string().trim().min(1).max(300).optional(),
    artistName: z.string().trim().max(200).nullable().optional(),
    albumName: z.string().trim().max(200).nullable().optional(),
    favorite: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update');

/**
 * Visibility and download rights are set together but remain separate concepts:
 * `public` never implies `allow_download`.
 */
export const updateVisibilitySchema = z.object({
  visibility: visibilitySchema,
  allowDownload: z.boolean().optional(),
});

export const grantAccessSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9][a-z0-9_-]*$/, 'Enter a valid username'),
  role: z.literal('viewer').default('viewer'),
});

export const librarySortSchema = z
  .enum(['created_at', 'title', 'artist_name', 'duration_ms'])
  .default('created_at');

export const libraryQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  scope: z.enum(['all', 'recent', 'favorites', 'unsorted']).default('all'),
  collectionId: uuidSchema.optional(),
  sort: librarySortSchema,
  direction: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export type UpdateTrackInput = z.infer<typeof updateTrackSchema>;
export type UpdateVisibilityInput = z.infer<typeof updateVisibilitySchema>;
export type GrantAccessInput = z.infer<typeof grantAccessSchema>;
export type LibraryQuery = z.infer<typeof libraryQuerySchema>;
