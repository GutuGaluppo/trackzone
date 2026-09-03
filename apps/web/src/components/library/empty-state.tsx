import { Library } from 'lucide-react';
import { UploadButton } from '@/components/library/upload-button';

const COPY: Record<string, { title: string; body: string }> = {
  all: {
    title: 'Your library is empty',
    body: 'Import local audio to bring your first tracks into TrackZone.',
  },
  recent: { title: 'Nothing added yet', body: 'Tracks you import will show up here first.' },
  favorites: { title: 'No favorites yet', body: 'Mark a track as a favorite to find it here.' },
  unsorted: { title: 'Nothing unsorted', body: 'Every track is already in a collection.' },
};

export function EmptyState({ scope, search }: { scope: string; search?: string }) {
  if (search) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="text-fg text-sm">No tracks match “{search}”.</p>
        <p className="text-fg-subtle text-xs">Try a different title, artist or filename.</p>
      </div>
    );
  }

  const copy = COPY[scope] ?? COPY.all!;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <Library className="text-fg-subtle h-8 w-8" aria-hidden />
      <div>
        <p className="text-fg text-sm">{copy.title}</p>
        <p className="text-fg-subtle mt-1 text-xs">{copy.body}</p>
      </div>
      {scope === 'all' ? <UploadButton /> : null}
    </div>
  );
}
