import Link from 'next/link';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tier {
  name: string;
  price: string;
  cadence: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

const TIERS: Tier[] = [
  {
    name: 'Free',
    price: '€0',
    cadence: '/ month',
    features: [
      'Connect unlimited sources',
      'Organize your library',
      'Preview & playback',
      'Basic metadata',
    ],
    cta: 'Get started',
  },
  {
    name: 'Pro',
    price: '€8',
    cadence: '/ month',
    features: [
      '100 GB TrackZone Storage',
      'Automatic backup',
      'Duplicate detection',
      'Advanced metadata',
      'Batch operations',
      'Priority support',
    ],
    cta: 'Start Pro trial',
    highlighted: true,
  },
  {
    name: 'Studio',
    price: '€16',
    cadence: '/ month',
    features: [
      '1 TB TrackZone Storage',
      'All Pro features',
      'Team collaboration',
      'Custom workflows',
      'Early access features',
    ],
    cta: 'Upgrade to Studio',
  },
];

/**
 * Pricing and limits are not final (docs §26) — this section exists so the
 * structure is in place; the CTAs route to sign-up, not a live checkout.
 */
export function Pricing() {
  return (
    <section id="pricing" className="bg-ink text-paper py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-[minmax(0,0.32fr)_minmax(0,0.68fr)] md:items-start">
        <h2 className="text-paper text-3xl font-bold leading-[1.05] tracking-[-0.02em]">
          Simple pricing.
          <br />
          Powerful value.
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                'flex flex-col rounded-lg border p-6',
                tier.highlighted ? 'border-signal bg-white/[0.04]' : 'border-white/12',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-paper text-sm font-semibold uppercase tracking-[0.1em]">
                  {tier.name}
                </span>
                {tier.highlighted ? (
                  <span className="border-olive text-olive text-2xs rounded-full border px-2 py-0.5 font-medium uppercase tracking-[0.1em]">
                    Most popular
                  </span>
                ) : null}
              </div>

              <p className="tabular mt-4">
                <span className="text-paper text-2xl font-semibold">{tier.price}</span>
                <span className="text-warm-gray text-xs"> {tier.cadence}</span>
              </p>

              <ul className="mt-5 flex-1 space-y-2.5">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-white/70">
                    <Check className="text-olive mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/sign-up"
                className={cn(
                  'text-2xs mt-6 block rounded-full px-4 py-2.5 text-center font-semibold uppercase tracking-[0.12em] transition-colors',
                  tier.highlighted
                    ? 'bg-signal hover:bg-signal-dim text-white'
                    : 'text-paper border border-white/20 hover:bg-white/5',
                )}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
