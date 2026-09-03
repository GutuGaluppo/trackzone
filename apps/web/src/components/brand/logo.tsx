import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type LogoVariant = 'full' | 'mark';

/**
 * TZ Cursor mark (docs: LogoReference.png — T + Z fused into a cursor,
 * Signal Orange dot accent). The badge PNG carries its own rounded-square
 * backing, so it's used as-is for the icon form rather than re-traced as
 * inline SVG; the wordmark is set in Instrument Sans Semibold per the
 * brand sheet's "TIPOGRAFIA SUGERIDA".
 */
export function Logo({
  href = '/',
  variant = 'full',
  size = 22,
  className,
  wordmarkClassName,
}: {
  href?: string | null;
  variant?: LogoVariant;
  size?: number;
  className?: string;
  wordmarkClassName?: string;
}) {
  const content = (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Image
        src="/brand/favicon.png"
        alt=""
        width={size}
        height={size}
        priority
        className="shrink-0 rounded-[22%]"
      />
      {variant === 'full' ? (
        <span
          className={cn(
            'font-sans text-sm font-semibold uppercase tracking-tight',
            wordmarkClassName,
          )}
        >
          TrackZone
        </span>
      ) : null}
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} aria-label="TrackZone home">
      {content}
    </Link>
  );
}
