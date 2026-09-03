'use client';

import * as React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search } from 'lucide-react';

export function LibrarySearch({ initialValue }: { initialValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = React.useState(initialValue);

  React.useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (value) params.set('q', value);
      else params.delete('q');
      router.replace(`${pathname}?${params.toString()}`);
    }, 300);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the debounced value should retrigger
  }, [value]);

  return (
    <div className="border-line-strong bg-surface-2 flex h-8 w-64 items-center gap-2 rounded-sm border px-2.5">
      <Search className="text-fg-subtle h-3.5 w-3.5 shrink-0" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search your library"
        aria-label="Search your library"
        className="text-fg placeholder:text-fg-subtle w-full bg-transparent text-xs focus:outline-none"
      />
    </div>
  );
}
