const AUDIENCE = ['DJs', 'Producers', 'Sound Designers', 'Podcasters', 'Musicians', 'Collectors'];

export function TrustStrip() {
  return (
    <div className="border-paper-line bg-paper-ground relative z-10 border-y py-5">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-6">
        <span className="label-plate text-warm-gray shrink-0">Trusted by audio creators</span>
        <div className="text-warm-gray flex flex-1 flex-wrap items-center justify-between gap-x-6 gap-y-2">
          {AUDIENCE.map((item, index) => (
            <span key={item} className="flex items-center gap-6">
              {index > 0 ? (
                <span className="bg-paper-line hidden h-3 w-px sm:block" aria-hidden />
              ) : null}
              <span className="text-2xs font-medium uppercase tracking-[0.14em]">{item}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
