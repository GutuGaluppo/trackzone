import Link from 'next/link';
import { ArchiveRestore, ArrowRight, ListMusic, Move, Play, Radio } from 'lucide-react';
import { HeroDevice } from '@/components/marketing/hero-device';
import { ConnectRow } from '@/components/marketing/connect-row';
import { TrustStrip } from '@/components/marketing/trust-strip';
import { ProductPreview } from '@/components/marketing/product-preview';
import { Pricing } from '@/components/marketing/pricing';

const BENEFITS = [
  {
    icon: Radio,
    title: 'Connect',
    body: 'Bring in audio from all your favorite platforms and storage services.',
  },
  {
    icon: ListMusic,
    title: 'Organize',
    body: 'Create collections, tag tracks and build your perfect workflow.',
  },
  {
    icon: Play,
    title: 'Listen',
    body: 'Persistent playback with the metadata that matters, wherever you navigate.',
  },
  {
    icon: Move,
    title: 'Move',
    body: "Move or copy tracks anywhere. You're always in control.",
  },
  {
    icon: ArchiveRestore,
    title: 'Backup',
    body: 'Keep a copy in TrackZone and never lose a take again.',
  },
];

export default function MarketingHomePage() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
        <div>
          <h1 className="text-ink text-4xl font-medium leading-[1.05] tracking-tight md:text-5xl">
            All your audio.
            <br />
            Finally yours.
          </h1>
          <p className="text-warm-gray mt-5 max-w-md text-sm">
            TrackZone brings every track, sample and idea from every platform into one place.
            Organize. Listen. Move. Backup. Yours.
          </p>
          <div className="mt-8 flex items-center gap-5">
            <Link
              href="/sign-up"
              className="bg-signal hover:bg-signal-dim inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white"
            >
              Get Started Free
            </Link>
            <Link
              href="#features"
              className="text-ink inline-flex items-center gap-2 text-sm font-medium"
            >
              <span className="border-ink/30 flex h-6 w-6 items-center justify-center rounded-full border">
                <Play className="ml-px h-2.5 w-2.5" aria-hidden />
              </span>
              See How It Works
            </Link>
          </div>

          <ConnectRow />
        </div>

        <HeroDevice />
      </section>

      <TrustStrip />

      <section className="bg-surface-0 text-fg py-20" data-environment="workspace">
        <div className="mx-auto max-w-6xl px-6">
          <p className="label-plate">One library.</p>
          <h2 className="text-fg mt-2 max-w-md text-2xl font-medium">Everywhere.</h2>
          <p className="text-fg-subtle mt-3 max-w-md text-sm">
            TrackZone creates a single, unified library across all your sources. No more digging
            through folders or tabs. Just your audio, ready when you are.
          </p>
        </div>

        <div className="mt-10 px-6">
          <ProductPreview />
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <p className="label-plate text-warm-gray">Your audio.</p>
        <h2 className="text-ink mt-2 text-2xl font-medium">Your rules.</h2>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <span className="border-paper-line flex h-9 w-9 items-center justify-center rounded-full border">
                <Icon className="text-signal h-4 w-4" aria-hidden />
              </span>
              <h3 className="text-ink mt-3 text-sm font-medium">{title}</h3>
              <p className="text-warm-gray mt-1 text-xs">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <Pricing />

      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <h2 className="text-ink mx-auto max-w-xl text-2xl font-medium">
          Private by default. Shared and public when you say so.
        </h2>
        <p className="text-warm-gray mx-auto mt-3 max-w-md text-sm">
          Every track carries its own visibility — private, shared with specific people, or public.
          Downloading is always a separate decision from being seen.
        </p>
        <Link
          href="/sign-up"
          className="bg-ink text-paper hover:bg-ink/90 mt-8 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
        >
          Start your library
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </section>
    </>
  );
}
