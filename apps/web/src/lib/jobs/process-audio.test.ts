import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  trigger: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  filter: vi.fn(),
}));
vi.mock('@trigger.dev/sdk', () => ({ tasks: { trigger: mocks.trigger } }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabase: () => ({ from: () => ({ update: mocks.update }) }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

async function dispatcher() {
  vi.resetModules();
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ eq: mocks.filter });
  mocks.filter.mockResolvedValue({ error: null });
  return (await import('./process-audio')).enqueueAudioProcessing;
}

describe('audio processing dispatch', () => {
  it.each(['http://127.0.0.1:54321', 'https://example.supabase.co'])(
    'leaves development uploads for the worker regardless of database location (%s)',
    async (url) => {
      vi.stubEnv('TRIGGER_SECRET_KEY', '');
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url);
      await (
        await dispatcher()
      )('audio-file');
      expect(mocks.trigger).not.toHaveBeenCalled();
      expect(mocks.update).not.toHaveBeenCalled();
    },
  );

  it('dispatches configured processing through Trigger.dev', async () => {
    vi.stubEnv('TRIGGER_SECRET_KEY', 'test-trigger-key');
    mocks.trigger.mockResolvedValue({ id: 'run' });
    await (
      await dispatcher()
    )('audio-file');
    expect(mocks.trigger).toHaveBeenCalledWith('process-audio-file', { audioFileId: 'audio-file' });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('marks missing production processing as failed instead of queued forever', async () => {
    vi.stubEnv('TRIGGER_SECRET_KEY', '');
    vi.stubEnv('NODE_ENV', 'production');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await (
        await dispatcher()
      )('audio-file');
      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({ processing_status: 'failed' }),
      );
      expect(mocks.eq).toHaveBeenCalledWith('id', 'audio-file');
      expect(mocks.filter).toHaveBeenCalledWith('processing_status', 'pending');
    } finally {
      vi.restoreAllMocks();
    }
  });
});
