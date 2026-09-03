'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

export interface SliderProps extends Omit<
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
  'value' | 'onValueChange'
> {
  value: number;
  onValueChange: (value: number) => void;
  label: string;
}

/** Single-thumb slider (seek bar, volume) with the label wired for a11y. */
export const Slider = React.forwardRef<HTMLSpanElement, SliderProps>(function Slider(
  { className, value, onValueChange, label, min = 0, max = 100, step = 1, ...props },
  ref,
) {
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn('relative flex h-4 w-full touch-none select-none items-center', className)}
      value={[value]}
      onValueChange={(next) => {
        const nextValue = next[0];
        if (nextValue !== undefined) onValueChange(nextValue);
      }}
      min={min}
      max={max}
      step={step}
      aria-label={label}
      {...props}
    >
      <SliderPrimitive.Track className="bg-surface-4 relative h-[3px] grow rounded-full">
        <SliderPrimitive.Range className="bg-signal absolute h-full rounded-full" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className={cn(
          'bg-fg block h-3 w-3 rounded-full shadow-sm transition-transform',
          'focus-visible:ring-signal hover:scale-110 focus-visible:outline-none focus-visible:ring-2',
        )}
      />
    </SliderPrimitive.Root>
  );
});
