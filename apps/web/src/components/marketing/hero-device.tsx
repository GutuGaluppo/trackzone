import { cn } from '@/lib/utils';

const WAVEFORM = [
  6, 10, 16, 9, 22, 14, 28, 18, 34, 20, 30, 16, 24, 12, 26, 18, 32, 14, 20, 10, 24, 16, 28, 12, 18,
  8, 14, 22, 10, 6, 12, 20, 26, 16, 8,
];

function Knob({ accent }: { accent: 'signal' | 'olive' }) {
  return (
    <div className="relative h-8 w-8 shrink-0 rounded-full border border-white/15 bg-black/20">
      <span
        className={cn(
          'absolute left-1/2 top-1 h-2.5 w-px -translate-x-1/2',
          accent === 'signal' ? 'bg-signal' : 'bg-olive',
        )}
      />
    </div>
  );
}

/**
 * Two stacked hardware faceplates, code-drawn (docs LandingPageReference.png
 * composition) in TrackZone's own palette — precision markings, a counter
 * readout, restrained status text. No third-party device photography.
 */
export function HeroDevice() {
  return (
    <div className="flex flex-col gap-4">
      {/* Panel 1 — signal orange */}
      <div className="rounded-xl border border-white/10 bg-[#1c1a17] p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="label-plate text-white/40">Preset number</p>
            <p className="text-signal mt-1 font-mono text-5xl font-medium leading-none">02</p>
          </div>
          <div className="flex-1 text-right">
            <p className="text-signal text-2xs font-mono uppercase tracking-widest">
              System loading…
            </p>
            <p className="text-2xs mt-2 text-white/35">TrackZone Identity Matrix Online.</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
          <div className="flex gap-2">
            <Knob accent="signal" />
            <Knob accent="signal" />
          </div>
          <span className="label-plate text-white/30">TrackZone</span>
        </div>
      </div>

      {/* Panel 2 — olive */}
      <div className="rounded-xl border border-white/10 bg-[#1a1c16] p-5 shadow-2xl">
        <div className="gap-0.75 flex items-end" aria-hidden>
          {WAVEFORM.map((height, index) => (
            <span
              key={index}
              className={cn('w-0.75 rounded-full', index === 18 ? 'bg-olive' : 'bg-white/25')}
              style={{ height: `${height}px` }}
            />
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-6">
          <div>
            <p className="label-plate text-white/40">Preset number</p>
            <p className="text-olive mt-1 font-mono text-5xl font-medium leading-none">35</p>
          </div>
          <div className="flex-1 text-right">
            <p className="text-olive text-2xs font-mono uppercase tracking-widest">
              Detecting signal…
            </p>
            <p className="text-2xs mt-2 text-white/35">Updating library index.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Knob accent="olive" />
            <Knob accent="olive" />
          </div>
        </div>
      </div>
    </div>
  );
}
