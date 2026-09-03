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
      'Basic metadata',
      'Preview & playback',
    ],
    cta: 'Get started',
  },
  {
    name: 'Pro',
    price: '€8',
    cadence: '/ month',
    features: [
      'TrackZone storage',
      'Automatic backup',
      'Duplicate detection',
      'Lossless transfer',
      'Advanced metadata',
      'Batch operations',
    ],
    cta: 'Start Pro trial',
    highlighted: true,
  },
  {
    name: 'Studio',
    price: '€16',
    cadence: '/ month',
    features: [
      'Larger storage allocation',
      'All Pro features',
      'Collaboration',
      'Professional workflows',
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
    <section id="pricing" className="bg-ink text-paper py-20">
      <div className="mx-auto max-w-6xl px-6">
        <p className="label-plate text-warm-gray">Simple pricing.</p>
        <h2 className="text-paper mt-2 text-2xl font-medium">Powerful value.</h2>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                'rounded-md border p-6',
                tier.highlighted ? 'border-signal bg-white/5' : 'border-white/10',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-paper text-sm font-medium">{tier.name}</span>
                {tier.highlighted ? (
                  <span className="bg-signal text-2xs rounded-full px-2 py-0.5 font-medium text-white">
                    Most popular
                  </span>
                ) : null}
              </div>
              <p className="tabular mt-3">
                <span className="text-paper text-2xl font-medium">{tier.price}</span>
                <span className="text-warm-gray text-xs"> {tier.cadence}</span>
              </p>

              <ul className="mt-5 space-y-2">
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
                  'mt-6 block rounded-full px-4 py-2 text-center text-xs font-medium',
                  tier.highlighted
                    ? 'bg-signal hover:bg-signal-dim text-white'
                    : 'text-paper border border-white/15 hover:bg-white/5',
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
