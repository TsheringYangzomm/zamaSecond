import { OutlineTag } from "../components/ui/tag";
import { sectionShell, sectionTitle } from "../components/ui/styles";

export function LaunchUpdatesPage() {
  return (
    <section className="full-bleed-safe relative overflow-hidden" aria-labelledby="launch-updates-title">
      <div className={`relative z-[1] grid gap-7 py-[clamp(2.5rem,5vw,4.5rem)] ${sectionShell}`}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm">
            <li><a className="font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest" href="#/">Home</a></li>
            <li aria-hidden="true" className="text-brand-black/40">/</li>
            <li aria-current="page" className="font-bold text-brand-black">Launch updates</li>
          </ol>
        </nav>

        <div className="grid max-w-170 gap-3">
          <OutlineTag>Zama launch</OutlineTag>
          <h1 id="launch-updates-title" className={`${sectionTitle} max-w-170 text-brand-green-ink`}>Stay close to the Zama launch.</h1>
          <p className="max-w-140 text-[1.05rem] leading-[1.5] text-brand-black/72">Get the first updates on fresh groceries, meal kits, local farmers, and what's coming to Thimphu.</p>
        </div>

        <div className="grid gap-3 rounded-[26px_38px_22px_34px/34px_24px_38px_22px] border-3 border-dashed border-brand-forest/30 bg-brand-warm-white p-6 shadow-brand-soft sm:p-8">
          <p className="text-sm text-brand-black/56">Launch updates form will appear here.</p>
        </div>
      </div>
    </section>
  );
}
