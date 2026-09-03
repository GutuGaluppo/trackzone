import Link from 'next/link';
import { ArrowRight, HardDrive, ListMusic, Lock, Move, Radio } from 'lucide-react';
import { HeroDevice } from '@/components/marketing/hero-device';

const BENEFITS = [
  {
    icon: Radio,
    title: 'Connect',
    body: 'Bring in audio from Local Files today, with Google Drive and more providers on the way.',
  },
  {
    icon: ListMusic,
    title: 'Organize',
    body: 'One logical library. Collections for sets, samples and works in progress.',
  },
  {
    icon: HardDrive,
    title: 'Listen',
    body: 'Persistent playback that survives navigation, with the metadata that matters.',
  },
  {
    icon: Move,
    title: 'Move',
    body: 'Your audio stays yours — organized, portable and never locked to one place.',
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
            Finally <span className="text-signal">yours.</span>
          </h1>
          <p className="text-warm-gray mt-5 max-w-md text-sm">
            TrackZone brings every track, sample and idea from every platform into one place.
            Organize. Listen. Move. Backup. Yours.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <Link
              href="/sign-up"
              className="bg-signal hover:bg-signal-dim inline-flex items-center gap-2 rounded-sm px-4 py-2.5 text-sm font-medium text-white"
            >
              Get Started Free
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <Link
              href="#how-it-works"
              className="border-paper-line text-ink hover:bg-paper-2 inline-flex items-center gap-2 rounded-sm border px-4 py-2.5 text-sm font-medium"
            >
              See How It Works
            </Link>
          </div>

          <div className="text-2xs text-warm-gray mt-10 flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Private by default. Short-lived signed URLs for every play. You decide what&apos;s
            shared.
          </div>
        </div>

        <HeroDevice />
      </section>

      <section id="how-it-works" className="border-paper-line bg-paper-2/50 border-y py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="label-plate text-warm-gray">One library. Everywhere.</p>
          <h2 className="text-ink mt-2 max-w-lg text-2xl font-medium">
            Connect → Import → Organize → Listen → Move
          </h2>

          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <Icon className="text-signal h-5 w-5" aria-hidden />
                <h3 className="text-ink mt-3 text-sm font-medium">{title}</h3>
                <p className="text-warm-gray mt-1 text-xs">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <p className="label-plate text-warm-gray">Your audio. Your rules.</p>
        <h2 className="text-ink mx-auto mt-2 max-w-xl text-2xl font-medium">
          Private by default. Shared and public when you say so.
        </h2>
        <p className="text-warm-gray mx-auto mt-3 max-w-md text-sm">
          Every track carries its own visibility — private, shared with specific people, or public.
          Downloading is always a separate decision from being seen.
        </p>
        <Link
          href="/sign-up"
          className="bg-ink text-paper hover:bg-ink/90 mt-8 inline-flex items-center gap-2 rounded-sm px-4 py-2.5 text-sm font-medium"
        >
          Start your library
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </section>
    </>
  );
}
