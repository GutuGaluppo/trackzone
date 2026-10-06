/*
 * Throwaway checking page: the "One library. Everywhere." player mockup, old
 * vs. current, on a black background. Delete this folder and
 * components/marketing/product-preview-v1.tsx when the review is done.
 */
import { ProductPreviewV1 } from '@/components/marketing/product-preview-v1';
import { ProductPreview } from '@/components/marketing/product-preview';

export const metadata = { title: 'Player evolution' };

export default function PlayerEvolutionPage() {
  return (
    <main data-environment="workspace" className="min-h-dvh space-y-16 bg-black px-6 py-16">
      <section className="mx-auto max-w-5xl space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">v1 — commit 48f27fa</p>
        <ProductPreviewV1 />
      </section>

      <section className="space-y-3 overflow-x-auto">
        <p className="mx-auto max-w-5xl text-xs uppercase tracking-[0.2em] text-neutral-500">
          v2 — commit 9cfbdad (current)
        </p>
        <div className="mx-auto max-w-5xl">
          <ProductPreview />
        </div>
      </section>
    </main>
  );
}
