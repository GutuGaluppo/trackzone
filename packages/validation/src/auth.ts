import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address');

/**
 * Length over composition rules: NIST guidance, and a long passphrase beats a
 * short string with a symbol bolted on.
 */
export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(128, 'Use at most 128 characters');

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'At least 3 characters')
  .max(30, 'At most 30 characters')
  .regex(/^[a-z0-9][a-z0-9_-]*$/, 'Use letters, numbers, dashes and underscores');

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password'),
});

// No .min(1): the field is optional, and an unfilled text input submits ''
// rather than undefined — react-hook-form has no way to send "not present"
// for a plain <input>. A .min(1) here would reject that '' as invalid and
// silently block submission for the common case of leaving it blank. An
// empty display name is already treated as "not provided" by callers (both
// the sign-up handler and the profile-update route fall back to null/omit
// on a falsy value), so there is nothing left for a length floor to guard.
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().max(80).optional(),
});

export const updateProfileSchema = z.object({
  username: usernameSchema.optional(),
  displayName: z.string().trim().max(80).nullable().optional(),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
