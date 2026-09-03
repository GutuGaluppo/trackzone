import { z } from 'zod';
import { uuidSchema, visibilitySchema } from './track.ts';

export const createCollectionSchema = z.object({
  name: z.string().trim().min(1, 'Name your collection').max(120),
  description: z.string().trim().max(500).nullable().optional(),
  visibility: visibilitySchema.default('private'),
});

export const updateCollectionSchema = createCollectionSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update');

export const collectionTrackSchema = z.object({
  trackId: uuidSchema,
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
/** Pre-default shape (`visibility` optional) — what a form's fields actually hold. */
export type CreateCollectionFormInput = z.input<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
