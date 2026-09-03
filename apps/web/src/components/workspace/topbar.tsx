'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export function Topbar({ username }: { username: string }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);

  return (
    <header className="border-line flex h-11 shrink-0 items-center justify-between border-b px-4">
      <Link href="/settings" className="label-plate hover:text-fg">
        {username}
      </Link>
      <Button
        variant="ghost"
        size="sm"
        disabled={signingOut}
        onClick={async () => {
          setSigningOut(true);
          const supabase = createClient();
          await supabase.auth.signOut();
          router.replace('/sign-in');
          router.refresh();
        }}
      >
        <LogOut className="h-3.5 w-3.5" aria-hidden />
        {signingOut ? 'Signing out…' : 'Sign out'}
      </Button>
    </header>
  );
}
