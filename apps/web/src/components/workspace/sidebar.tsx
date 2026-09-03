'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Folder, HardDrive, Heart, Library, ListMusic, Plus, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

function NavItem({ href, label, icon: Icon, exact }: NavItemProps) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        'flex h-7 items-center gap-2 rounded-sm px-2 text-xs transition-colors',
        active ? 'bg-surface-3 text-fg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="label-plate mb-1 mt-4 px-2 first:mt-0">{children}</p>;
}

export interface SidebarCollection {
  id: string;
  name: string;
}

export function Sidebar({ collections }: { collections: SidebarCollection[] }) {
  return (
    <nav
      aria-label="Library navigation"
      className="border-line bg-surface-1 scrollbar-slim flex w-52 shrink-0 flex-col overflow-y-auto border-r p-3"
    >
      <Link href="/library" className="text-fg mb-4 px-2 font-mono text-xs tracking-[0.2em]">
        TRACKZONE<span className="text-signal">.</span>
      </Link>

      <SectionLabel>Library</SectionLabel>
      <NavItem href="/library" label="All Tracks" icon={Library} exact />
      <NavItem href="/library?scope=recent" label="Recently Added" icon={ListMusic} />
      <NavItem href="/library?scope=favorites" label="Favorites" icon={Heart} />
      <NavItem href="/library?scope=unsorted" label="Unsorted" icon={Star} />

      <SectionLabel>Sources</SectionLabel>
      <NavItem href="/library?source=local" label="Local Files" icon={HardDrive} />

      <SectionLabel>Collections</SectionLabel>
      {collections.map((collection) => (
        <NavItem
          key={collection.id}
          href={`/collections/${collection.id}`}
          label={collection.name}
          icon={Folder}
        />
      ))}
      <Link
        href="/collections"
        className="text-fg-subtle hover:bg-surface-2 hover:text-fg flex h-7 items-center gap-2 rounded-sm px-2 text-xs"
      >
        <Plus className="h-3.5 w-3.5 shrink-0" />
        New Collection
      </Link>
    </nav>
  );
}
