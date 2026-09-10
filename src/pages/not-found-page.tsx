import { PrimaryLink } from "../components/ui/action-link";

export function NotFoundPage() {
  return (
    <section className="grid min-h-[55vh] place-items-center px-4 py-16 text-center">
      <div className="grid max-w-xl justify-items-center gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-warm-white p-8 shadow-brand-big">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-orange-ink">404 · Page not found</p>
        <h1 className="font-primary text-[clamp(2rem,6vw,4rem)] font-bold leading-none text-brand-green-ink">This path is not in the field notebook.</h1>
        <p className="text-brand-black/70">Return to Zama’s launch page or browse the current shop range.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <PrimaryLink href="/">Back to Zama</PrimaryLink>
          <PrimaryLink href="/shop">Browse the shop</PrimaryLink>
        </div>
      </div>
    </section>
  );
}
