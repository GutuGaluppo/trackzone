import {
  Box,
  Clock,
  Cloud,
  Folder,
  GalleryVerticalEnd,
  HardDrive,
  Heart,
  Inbox,
  LayoutGrid,
  ListMusic,
  Music2,
  Pause,
  Play,
  Plus,
  PlusCircle,
  Rows3,
  Search,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const LIBRARY = [
  { icon: Music2, label: 'All Tracks', count: '1,284', active: true },
  { icon: Clock, label: 'Recently Added', count: '42' },
  { icon: Heart, label: 'Favorites', count: '87' },
  { icon: Inbox, label: 'Unsorted', count: '19' },
];

const SOURCES = [
  { icon: Cloud, label: 'SoundCloud', count: '486' },
  { icon: Folder, label: 'Local Files', count: '321' },
  { icon: HardDrive, label: 'Google Drive', count: '284' },
  { icon: Box, label: 'Dropbox', count: '183' },
];

const COLLECTIONS = ['DJ Sets', 'Samples', 'Field Recordings', 'Work In Progress', 'Archive'];

interface PreviewTrack {
  title: string;
  artist: string;
  duration: string;
  format: string;
  active?: boolean;
}

const TRACKS: PreviewTrack[] = [
  { title: 'Evening Drive', artist: 'Gutu Galuppo', duration: '04:32', format: 'WAV' },
  { title: 'Silk Road', artist: 'Nyla', duration: '03:18', format: 'WAV' },
  { title: 'Found Textures_01', artist: 'Gutu Galuppo', duration: '01:47', format: 'WAV' },
  { title: 'Night Drive', artist: 'Gutu Galuppo', duration: '04:31', format: 'WAV', active: true },
  { title: 'Broken Tape', artist: 'Analog Bloom', duration: '02:54', format: 'WAV' },
  { title: 'Aqua Mirage', artist: 'Nyla', duration: '05:02', format: 'FLAC' },
  { title: 'Dusty Vinyl', artist: 'Gutu Galuppo', duration: '01:15', format: 'WAV' },
  { title: 'Juno Dreams', artist: 'KOSMA', duration: '06:31', format: 'WAV' },
];

// Static waveform for the transport scrubber. ~44% elapsed.
const WAVE = [
  5, 8, 12, 7, 15, 10, 18, 9, 22, 13, 16, 8, 11, 19, 24, 14, 9, 6, 12, 20, 26, 17, 10, 7, 13, 21,
  28, 16, 11, 8, 14, 9, 6, 10, 17, 23, 15, 9, 12, 7, 19, 25, 14, 8, 11, 5, 9, 16, 22, 13, 7, 10, 18,
  12, 8, 6, 11, 15, 9, 7,
];
const WAVE_HEAD = 26;

function SourceDots({ active }: { active?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      {['SC', 'GD', 'DR'].map((code, index) => (
        <span
          key={code}
          className={cn(
            'rounded-[3px] border px-1 py-[1px] text-[8px] font-medium leading-none',
            active && index === 0
              ? 'border-signal/40 bg-signal/10 text-signal'
              : 'border-line-strong text-fg-subtle',
          )}
        >
          {code}
        </span>
      ))}
      <span className="bg-olive ml-0.5 h-1.5 w-1.5 rounded-full" />
    </span>
  );
}

/**
 * A static mockup of the real Library + player UI (docs
 * brand/PlayerTrackZone.png), rebuilt on TrackZone's own tokens:
 * Signal Orange stays rationed to the wordmark tick and the active
 * row's primary source; Olive carries every "ready / playing" cue.
 */
export function ProductPreview() {
  return (
    <div
      data-environment="workspace"
      aria-hidden
      className="border-line-strong bg-surface-1 text-fg mx-auto flex w-full min-w-[880px] flex-col overflow-hidden rounded-2xl border shadow-[0_50px_120px_-40px_rgba(0,0,0,0.6)]"
    >
      <div className="flex min-h-0 flex-1">
        {/* Sidebar ------------------------------------------------------- */}
        <aside className="border-line flex w-[218px] shrink-0 flex-col gap-5 border-r px-4 py-5">
          <div className="flex items-center gap-0.5 px-1">
            <span className="text-fg text-[11px] font-semibold tracking-[0.22em]">TRACKZONE</span>
            <span className="bg-signal mb-2 h-1 w-1 rounded-full" />
          </div>

          <nav className="space-y-1">
            <p className="label-plate mb-1.5 px-1">Library</p>
            {LIBRARY.map(({ icon: Icon, label, count, active }) => (
              <span
                key={label}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2 py-[7px] text-[11px]',
                  active ? 'bg-surface-2 text-fg' : 'text-fg-muted',
                )}
              >
                <Icon
                  className={cn('h-3.5 w-3.5 shrink-0', active ? 'text-olive' : 'text-fg-subtle')}
                  strokeWidth={1.75}
                />
                <span className="flex-1 truncate">{label}</span>
                <span className="text-fg-subtle tabular text-[10px]">{count}</span>
              </span>
            ))}
          </nav>

          <nav className="space-y-1">
            <p className="label-plate mb-1.5 px-1">Sources</p>
            {SOURCES.map(({ icon: Icon, label, count }) => (
              <span
                key={label}
                className="text-fg-muted flex items-center gap-2.5 rounded-md px-2 py-[7px] text-[11px]"
              >
                <Icon className="text-fg-subtle h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                <span className="flex-1 truncate">{label}</span>
                <span className="text-fg-subtle tabular text-[10px]">{count}</span>
              </span>
            ))}
          </nav>

          <nav className="space-y-1">
            <div className="mb-1.5 flex items-center justify-between px-1">
              <p className="label-plate">Collections</p>
              <PlusCircle className="text-fg-subtle h-3.5 w-3.5" strokeWidth={1.75} />
            </div>
            {COLLECTIONS.map((label) => (
              <span
                key={label}
                className="text-fg-muted flex items-center gap-2.5 rounded-md px-2 py-[7px] text-[11px]"
              >
                <Folder className="text-fg-subtle h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                <span className="flex-1 truncate">{label}</span>
              </span>
            ))}
          </nav>

          <div className="mt-auto">
            <div className="border-line-strong flex items-center justify-between rounded-full border px-3 py-1.5">
              <span className="text-fg-subtle text-[10px]" />
              <Plus className="text-fg-subtle h-3 w-3" strokeWidth={2} />
            </div>
          </div>
        </aside>

        {/* Main -------------------------------------------------------- */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="border-line-strong bg-surface-2 flex flex-1 items-center gap-2 rounded-full border px-3.5 py-2">
              <Search className="text-fg-subtle h-3.5 w-3.5" strokeWidth={1.75} />
              <span className="text-fg-subtle text-[11px]">Search tracks, artists, albums…</span>
            </div>
            <div className="text-fg-subtle flex items-center gap-3">
              <GalleryVerticalEnd className="h-4 w-4" strokeWidth={1.75} />
              <LayoutGrid className="h-4 w-4" strokeWidth={1.75} />
              <Rows3 className="h-4 w-4" strokeWidth={1.75} />
            </div>
          </div>

          <div className="border-line border-t" />

          <div className="flex-1 px-5 pt-3">
            <div className="text-fg-subtle grid grid-cols-[24px_minmax(0,1fr)_140px_84px_64px_120px] items-center gap-3 px-2 pb-2 text-[9px] font-medium uppercase tracking-[0.14em]">
              <span />
              <span>Track</span>
              <span>Artist</span>
              <span>Duration</span>
              <span>Format</span>
              <span>Sources</span>
            </div>

            <div>
              {TRACKS.map((track) => (
                <div
                  key={track.title}
                  className={cn(
                    'grid grid-cols-[24px_minmax(0,1fr)_140px_84px_64px_120px] items-center gap-3 rounded-lg px-2 py-[11px] text-[11px]',
                    track.active ? 'bg-surface-2' : 'border-line border-b',
                  )}
                >
                  <span className="relative flex items-center justify-center">
                    {track.active ? (
                      <>
                        <Play className="fill-olive text-olive absolute -left-2 h-3 w-3" />
                        <Play className="text-fg-subtle h-3 w-3" strokeWidth={1.75} />
                      </>
                    ) : (
                      <Play className="text-fg-subtle h-3 w-3" strokeWidth={1.75} />
                    )}
                  </span>
                  <span
                    className={cn('truncate', track.active ? 'text-fg font-medium' : 'text-fg')}
                  >
                    {track.title}
                  </span>
                  <span className="text-fg-muted truncate">{track.artist}</span>
                  <span className="text-fg-muted tabular">{track.duration}</span>
                  <span className="text-fg-muted">{track.format}</span>
                  <SourceDots active={track.active} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Player bar --------------------------------------------------- */}
      <div className="border-line flex items-center gap-4 border-t px-5 py-3.5">
        <div className="flex w-[218px] shrink-0 items-center gap-3">
          <div className="bg-surface-3 border-line-strong grid h-11 w-11 shrink-0 place-items-center rounded-md border">
            <ListMusic className="text-fg-subtle h-4 w-4" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="text-fg truncate text-[11px] font-semibold">Night Drive</p>
            <p className="text-fg-subtle truncate text-[10px]">Gutu Galuppo</p>
          </div>
        </div>

        <div className="flex flex-1 items-center gap-3">
          <span className="text-fg-subtle tabular text-[10px]">01:26</span>
          <div className="relative flex h-8 flex-1 items-center gap-[2px]">
            {WAVE.map((height, index) => (
              <span
                key={index}
                className={cn(
                  'w-[2px] shrink-0 rounded-full',
                  index < WAVE_HEAD ? 'bg-fg-muted' : 'bg-surface-4',
                )}
                style={{ height: `${height}px` }}
              />
            ))}
            <span
              className="bg-olive absolute bottom-0 top-0 w-px"
              style={{ left: `${(WAVE_HEAD / WAVE.length) * 100}%` }}
            />
          </div>
          <span className="text-fg-subtle tabular text-[10px]">04:31</span>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <SkipBack className="text-fg h-4 w-4 fill-current" />
          <span className="border-olive grid h-8 w-8 place-items-center rounded-full border-2">
            <Pause className="fill-olive text-olive h-3.5 w-3.5" />
          </span>
          <SkipForward className="text-fg h-4 w-4 fill-current" />
        </div>

        <div className="flex w-[130px] shrink-0 items-center gap-2">
          <Volume2 className="text-fg-muted h-4 w-4 shrink-0" strokeWidth={1.75} />
          <div className="bg-surface-4 relative h-[3px] flex-1 rounded-full">
            <div className="bg-olive h-full w-2/3 rounded-full" />
            <span className="bg-olive absolute left-[66%] top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
