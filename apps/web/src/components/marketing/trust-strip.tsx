const AUDIENCE = ['DJs', 'Producers', 'Sound Designers', 'Podcasters', 'Musicians', 'Collectors'];

export function TrustStrip() {
  return (
    <div className="border-paper-line border-y py-5">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-6">
        <span className="label-plate text-warm-gray shrink-0">Trusted by audio creators</span>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {AUDIENCE.map((item) => (
            <span key={item} className="text-warm-gray text-xs font-medium">
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
