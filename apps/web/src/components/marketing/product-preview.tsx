import {
  Folder,
  HardDrive,
  Heart,
  Library,
  ListMusic,
  Pause,
  Play,
  Search,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PreviewTrack {
  title: string;
  artist: string;
  duration: string;
  format: string;
  sources: readonly string[];
  current?: boolean;
}

const TRACKS: PreviewTrack[] = [
  {
    title: 'Evening Drive',
    artist: 'Mara Solis',
    duration: '04:32',
    format: 'WAV',
    sources: ['LOC', 'GD', 'TZ'],
  },
  { title: 'Silk Road', artist: 'Kettu', duration: '03:18', format: 'WAV', sources: ['LOC', 'TZ'] },
  {
    title: 'Found Textures_01',
    artist: 'Mara Solis',
    duration: '01:47',
    format: 'WAV',
    sources: ['LOC'],
  },
  {
    title: 'Night Drive',
    artist: 'Mara Solis',
    duration: '04:31',
    format: 'WAV',
    sources: ['LOC', 'GD', 'TZ'],
    current: true,
  },
  {
    title: 'Broken Tape',
    artist: 'Analog Field',
    duration: '02:54',
    format: 'WAV',
    sources: ['LOC', 'TZ'],
  },
  {
    title: 'Aqua Mirage',
    artist: 'Kettu',
    duration: '05:02',
    format: 'FLAC',
    sources: ['LOC', 'GD'],
  },
];

/**
 * A static mockup of the real Library UI, sharing its actual tokens and
 * layout language — not a photo or a separate design, the product itself.
 */
export function ProductPreview() {
  return (
    <div
      data-environment="workspace"
      className="border-line-strong bg-surface-1 mx-auto flex h-[420px] max-w-5xl overflow-hidden rounded-lg border shadow-2xl"
      aria-hidden
    >
      <div className="border-line bg-surface-1 hidden w-44 shrink-0 flex-col border-r p-3 sm:flex">
        <span className="text-2xs text-fg mb-4 px-1 font-mono tracking-[0.2em]">TRACKZONE</span>
        <p className="label-plate mb-1 px-1">Library</p>
        {[
          { icon: Library, label: 'All Tracks' },
          { icon: ListMusic, label: 'Recently Added' },
          { icon: Heart, label: 'Favorites' },
          { icon: Star, label: 'Unsorted' },
        ].map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="text-2xs text-fg-muted flex items-center gap-2 rounded-sm px-1.5 py-1"
          >
            <Icon className="h-3 w-3" />
            {label}
          </span>
        ))}
        <p className="label-plate mb-1 mt-3 px-1">Sources</p>
        <span className="text-2xs text-fg-muted flex items-center gap-2 rounded-sm px-1.5 py-1">
          <HardDrive className="h-3 w-3" />
          Local Files
        </span>
        <p className="label-plate mb-1 mt-3 px-1">Collections</p>
        {['DJ Sets', 'Samples', 'Work in Progress'].map((label) => (
          <span
            key={label}
            className="text-2xs text-fg-muted flex items-center gap-2 rounded-sm px-1.5 py-1"
          >
            <Folder className="h-3 w-3" />
            {label}
          </span>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-line flex items-center justify-between border-b px-4 py-3">
          <span className="text-fg text-xs font-medium">All Tracks</span>
          <span className="border-line-strong bg-surface-2 text-2xs text-fg-subtle flex items-center gap-1.5 rounded-sm border px-2 py-1">
            <Search className="h-3 w-3" />
            Search your library
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden px-4">
          <table className="text-2xs w-full border-collapse text-left">
            <thead>
              <tr className="border-line text-fg-subtle border-b">
                <th className="w-7 py-2 font-normal" />
                <th className="py-2 pr-3 font-normal">Track</th>
                <th className="py-2 pr-3 font-normal">Artist</th>
                <th className="py-2 pr-3 text-right font-normal">Duration</th>
                <th className="py-2 pr-3 font-normal">Format</th>
                <th className="py-2 font-normal">Sources</th>
              </tr>
            </thead>
            <tbody>
              {TRACKS.map((track) => (
                <tr
                  key={track.title}
                  className={cn('border-line border-b', track.current && 'bg-surface-2')}
                >
                  <td className="py-2">
                    {track.current ? (
                      <Pause className="text-signal h-3 w-3" />
                    ) : (
                      <Play className="text-fg-subtle h-3 w-3" />
                    )}
                  </td>
                  <td
                    className={cn(
                      'py-2 pr-3 font-medium',
                      track.current ? 'text-signal' : 'text-fg',
                    )}
                  >
                    {track.title}
                  </td>
                  <td className="text-fg-muted py-2 pr-3">{track.artist}</td>
                  <td className="text-fg-muted tabular py-2 pr-3 text-right">{track.duration}</td>
                  <td className="text-fg-muted py-2 pr-3">{track.format}</td>
                  <td className="py-2">
                    <span className="text-olive flex gap-1">{track.sources.join(' ')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-line flex h-12 shrink-0 items-center gap-3 border-t px-4">
          <div className="bg-signal flex h-6 w-6 items-center justify-center rounded-full">
            <Pause className="h-3 w-3 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xs text-fg font-medium">Night Drive</span>
            <span className="text-2xs text-fg-subtle">Mara Solis</span>
          </div>
          <div className="bg-surface-4 mx-3 h-[3px] flex-1 rounded-full">
            <div className="bg-signal h-full w-1/3 rounded-full" />
          </div>
          <span className="text-2xs text-fg-subtle tabular">01:26 · 04:31</span>
        </div>
      </div>
    </div>
  );
}
