import Link from 'next/link';
import { ArrowRight, Copy, Move, Play, Maximize2, CloudUpload } from 'lucide-react';
import { HeroDevice } from '@/components/marketing/hero-device';
import { ConnectRow } from '@/components/marketing/connect-row';
import { TrustStrip } from '@/components/marketing/trust-strip';
import { ProductPreview } from '@/components/marketing/product-preview';
import { Pricing } from '@/components/marketing/pricing';

const BENEFITS = [
  {
    icon: Maximize2,
    title: 'Connect',
    lead: 'Bring in audio',
    body: 'from all your favorite platforms and storage services.',
  },
  {
    icon: Copy,
    title: 'Organize',
    lead: 'Create collections,',
    body: 'tag tracks and build your perfect workflow.',
  },
  {
    icon: Play,
    title: 'Listen',
    lead: 'Waveform player,',
    body: 'high quality preview and smart playback.',
  },
  {
    icon: Move,
    title: 'Move',
    lead: 'Move or copy tracks anywhere.',
    body: "You're always in control.",
  },
  {
    icon: CloudUpload,
    title: 'Backup',
    lead: 'Keep a copy in TrackZone',
    body: 'and never lose a take again.',
  },
];

export default function MarketingHomePage() {
  return (
    <>
      {/* Hero -------------------------------------------------------------- */}
      <section className="bg-paper-ground relative">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-6 pb-8 pt-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:pb-20 md:pt-16">
          <div className="relative z-10">
            <h1 className="text-ink text-[2.75rem] font-extrabold leading-[0.98] tracking-[-0.03em] sm:text-6xl">
              All your audio.
              <br />
              Finally yours.
            </h1>
            <p className="text-warm-gray mt-6 max-w-sm text-sm leading-relaxed">
              TrackZone brings every track, sample and idea from every platform into one place.
              <br />
              Organize. Listen. Move. Backup. Yours.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-6">
              <Link
                href="/sign-up"
                className="bg-signal hover:bg-signal-dim text-2xs inline-flex items-center rounded-full px-6 py-3 font-semibold uppercase tracking-[0.12em] text-white transition-colors"
              >
                Get Started Free
              </Link>
              <Link
                href="#one-library"
                className="text-ink text-2xs inline-flex items-center gap-2.5 font-semibold uppercase tracking-[0.12em]"
              >
                See How It Works
                <span className="border-ink/30 flex h-6 w-6 items-center justify-center rounded-full border">
                  <Play className="ml-px h-2.5 w-2.5 fill-current" aria-hidden />
                </span>
              </Link>
            </div>

            <ConnectRow />
          </div>

          <div className="relative -mx-6 md:mx-0 md:translate-x-6">
            <HeroDevice />
          </div>
        </div>
      </section>

      <TrustStrip />

      {/* One library. Everywhere. --------------------------------------- */}
      <section
        id="one-library"
        className="bg-surface-0 text-fg overflow-hidden py-20 md:py-28"
        data-environment="workspace"
      >
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-fg text-3xl font-bold leading-[1.05] tracking-[-0.02em]">
            One library.
            <br />
            Everywhere.
          </h2>
          <p className="text-fg-subtle mt-5 max-w-md text-sm leading-relaxed">
            TrackZone creates a single, unified library across all your sources. No more digging
            through folders or tabs. Just your audio, ready when you are.
          </p>
        </div>

        <div className="scrollbar-slim mt-12 overflow-x-auto px-6 pb-2">
          <div className="mx-auto max-w-5xl">
            <ProductPreview />
          </div>
        </div>
      </section>

      {/* Your audio. Your rules. --------------------------------------- */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <h2 className="text-ink text-3xl font-bold tracking-[-0.02em]">Your audio. Your rules.</h2>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {BENEFITS.map(({ icon: Icon, title, lead, body }) => (
            <div
              key={title}
              className="border-paper-line rounded-lg border p-5"
            >
              <span className="border-paper-line flex h-9 w-9 items-center justify-center rounded-md border">
                <Icon className="text-signal h-4 w-4" strokeWidth={1.75} aria-hidden />
              </span>
              <h3 className="text-ink mt-4 text-sm font-semibold">{title}</h3>
              <p className="text-warm-gray mt-1.5 text-xs leading-relaxed">
                <span className="text-ink font-medium">{lead} </span>
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Pricing />

      {/* Visibility ---------------------------------------------------- */}
      <section id="about" className="mx-auto max-w-6xl px-6 py-20 text-center md:py-24">
        <h2 className="text-ink mx-auto max-w-xl text-2xl font-bold tracking-[-0.02em]">
          Private by default. Shared and public when you say so.
        </h2>
        <p className="text-warm-gray mx-auto mt-4 max-w-md text-sm leading-relaxed">
          Every track carries its own visibility — private, shared with specific people, or public.
          Downloading is always a separate decision from being seen.
        </p>
        <Link
          href="/sign-up"
          className="bg-ink text-paper hover:bg-ink/90 text-2xs mt-9 inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold uppercase tracking-[0.12em] transition-colors"
        >
          Start your library
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </section>
    </>
  );
}
