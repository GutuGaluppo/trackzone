import { Logo } from '@/components/brand/logo';

/**
 * The auth screen is the threshold between the warm marketing site and the
 * dark workspace (docs §15): the page sits on paper, the card itself already
 * speaks the workspace's visual language.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-paper flex min-h-dvh flex-col items-center justify-center px-4">
      <Logo href="/" className="mb-8" wordmarkClassName="text-ink" />
      <div
        data-environment="workspace"
        className="border-line bg-surface-1 w-full max-w-sm rounded-md border p-6 shadow-sm"
      >
        {children}
      </div>
    </div>
  );
}
