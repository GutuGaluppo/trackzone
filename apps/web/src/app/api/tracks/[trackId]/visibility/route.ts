import { updateVisibilitySchema, uuidSchema } from '@trackzone/validation';
import { getOptionalUser } from '@/lib/auth/require-user';
import { fail, ok, route } from '@/lib/api/responses';
import { authorizeTrack } from '@/lib/tracks/authorize';

export const runtime = 'nodejs';

interface Context {
  params: Promise<{ trackId: string }>;
}

/**
 * PUT /api/tracks/:id/visibility
 *
 * Visibility and download rights move together through this route but stay
 * independent values: turning a track public never turns on downloads.
 */
export const PUT = route(async (request: Request, { params }: Context) => {
  const { trackId } = await params;
  const id = uuidSchema.parse(trackId);

  const { user, supabase } = await getOptionalUser();
  if (!user) return fail(401, 'not_authenticated', 'Sign in to continue.');

  await authorizeTrack(id, user, 'modify');
  const body = updateVisibilitySchema.parse(await request.json());

  const { data, error } = await supabase
    .from('tracks')
    .update({
      visibility: body.visibility,
      ...(body.allowDownload !== undefined ? { allow_download: body.allowDownload } : {}),
    })
    .eq('id', id)
    .select('id, visibility, allow_download')
    .single();

  if (error) throw error;

  // Grants for a track that is no longer shared are dead weight and a future
  // re-share would silently resurrect them, so drop them now.
  if (body.visibility !== 'shared') {
    await supabase.from('track_access').delete().eq('track_id', id);
  }

  return ok(data);
});
