import { cn } from '@/lib/utils';
import { PROCESSING_LABELS } from '@trackzone/types';
import type { ProcessingStatus } from '@trackzone/types';

const DOT_COLOR: Record<ProcessingStatus, string> = {
  pending: 'bg-fg-subtle',
  processing: 'bg-signal animate-pulse',
  ready: 'bg-olive',
  failed: 'bg-danger',
};

export function ProcessingBadge({ status }: { status: ProcessingStatus }) {
  if (status === 'ready') return null;

  return (
    <span className="text-2xs text-fg-subtle inline-flex items-center gap-1.5">
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT_COLOR[status])} aria-hidden />
      {PROCESSING_LABELS[status]}
    </span>
  );
}
