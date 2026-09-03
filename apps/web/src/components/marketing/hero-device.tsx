const BAR_HEIGHTS = [
  6, 10, 16, 9, 22, 14, 28, 18, 34, 20, 30, 16, 24, 12, 26, 18, 32, 14, 20, 10, 24, 16, 28, 12, 18,
  8, 14, 22, 10, 6,
];

/**
 * A code-drawn instrument faceplate — precision markings, a restrained status
 * light, tabular readouts — in TrackZone's own palette (docs §8: hardware
 * faceplates and equipment displays, not streaming-app chrome).
 */
export function HeroDevice() {
  return (
    <div className="border-line-strong bg-surface-1 rounded-lg border p-5 shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <span className="label-plate">Now Indexing</span>
        <span className="label-plate flex items-center gap-1.5">
          <span className="bg-olive h-1.5 w-1.5 rounded-full" aria-hidden />
          Signal
        </span>
      </div>

      <div className="border-line bg-surface-0 rounded-sm border p-4">
        <div className="flex items-end gap-[3px]" aria-hidden>
          {BAR_HEIGHTS.map((height, index) => (
            <span
              key={index}
              className="bg-fg-muted w-[3px] rounded-full"
              style={{ height: `${height}px`, opacity: index % 4 === 0 ? 1 : 0.55 }}
            />
          ))}
        </div>
        <div className="tabular mt-3 flex items-baseline justify-between">
          <span className="text-fg text-xl font-medium">Night Drive</span>
          <span className="text-2xs text-fg-subtle">04:31</span>
        </div>
        <div className="text-2xs text-fg-subtle tabular mt-1 flex items-center justify-between">
          <span>WAV · 24-bit · 48 kHz</span>
          <span className="flex items-center gap-1.5">
            {['LOC', 'GD', 'TZ'].map((code) => (
              <span key={code} className="text-olive">
                {code}
              </span>
            ))}
            <span className="text-fg-subtle/40">SC</span>
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        {['Drive', 'Filter'].map((label) => (
          <div key={label} className="flex flex-col items-center gap-1.5">
            <div className="border-line-strong bg-surface-2 relative h-10 w-10 rounded-full border">
              <span className="bg-signal absolute left-1/2 top-1 h-3 w-px -translate-x-1/2" />
            </div>
            <span className="label-plate">{label}</span>
          </div>
        ))}
        <div className="border-line-strong bg-surface-2 ml-auto flex h-10 items-center gap-2 rounded-sm border px-3">
          <span className="bg-signal h-2 w-2 rounded-full" aria-hidden />
          <span className="label-plate">Rec 02</span>
        </div>
      </div>
    </div>
  );
}
