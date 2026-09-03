/**
 * Hero hardware render (docs LandingPageReference.png). The two KOSMA
 * faceplates ship as one flat asset (`/brand/devices.webp`, 1504×1128,
 * devices side by side on a neutral studio ground). We reveal each one
 * through its own cropping window — sized to that device's bounding box
 * in the source — and stack them on the diagonal to match the reference
 * composition: 02 up and left, 35 down and right, lightly overlapping.
 *
 * The hero band uses `--color-paper-ground`, matched to that studio
 * ground; a soft feather (two crossed gradients intersected) then melts
 * each window's four edges so the source's faint vignette never lands
 * as a visible rectangle.
 */
const EDGE_FEATHER = {
  maskImage:
    'linear-gradient(to right, transparent 0, #000 7%, #000 93%, transparent 100%), linear-gradient(to bottom, transparent 0, #000 6%, #000 92%, transparent 100%)',
  WebkitMaskImage:
    'linear-gradient(to right, transparent 0, #000 7%, #000 93%, transparent 100%), linear-gradient(to bottom, transparent 0, #000 6%, #000 92%, transparent 100%)',
  maskComposite: 'intersect',
  WebkitMaskComposite: 'source-in',
} as const;

export function HeroDevice() {
  return (
    <div className="pointer-events-none relative mx-auto aspect-[6/5] w-full max-w-[620px] select-none">
      {/* Panel 02 — top left */}
      <div
        className="absolute left-0 top-0 aspect-[118/100] w-[60%] drop-shadow-[0_26px_40px_rgba(23,23,23,0.16)]"
        style={{
          backgroundImage: 'url(/brand/devices.webp)',
          backgroundSize: '318% 262%',
          backgroundPosition: '19% 51%',
          ...EDGE_FEATHER,
        }}
      />
      {/* Panel 35 — bottom right, in front */}
      <div
        className="absolute right-[-8%] top-[52%] aspect-[150/100] w-[74%] drop-shadow-[0_32px_48px_rgba(23,23,23,0.18)]"
        style={{
          backgroundImage: 'url(/brand/devices.webp)',
          backgroundSize: '250% 262%',
          backgroundPosition: '78% 53%',
          ...EDGE_FEATHER,
        }}
      />
    </div>
  );
}
