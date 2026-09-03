'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

type Variant = 'signal' | 'solid' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';

/**
 * Signal Orange is the only "primary" and it is rationed: one per view, on the
 * action that matters (docs §10). Everything else is a quieter control.
 */
const VARIANTS: Record<Variant, string> = {
  signal: 'bg-signal text-white hover:bg-signal-dim active:translate-y-px disabled:bg-signal/40',
  solid: 'bg-surface-4 text-fg hover:bg-line-strong active:translate-y-px',
  outline: 'border border-line-strong text-fg hover:bg-surface-3 active:translate-y-px',
  ghost: 'text-fg-muted hover:bg-surface-3 hover:text-fg',
  danger: 'border border-danger/40 text-danger hover:bg-danger/10',
};

const SIZES: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-8 px-3 text-xs gap-2',
  lg: 'h-10 px-4 text-sm gap-2',
  icon: 'h-8 w-8 justify-center',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'outline', size = 'md', asChild = false, type, ...props },
  ref,
) {
  const Component = asChild ? Slot : 'button';

  return (
    <Component
      ref={ref}
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(
        'inline-flex items-center rounded-sm font-medium transition-colors',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
});
