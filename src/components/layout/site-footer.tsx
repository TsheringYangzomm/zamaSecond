import { OutlineLink } from "../ui/action-link";
import { ArrowIcon } from "../ui/icons";
import { sectionShell } from "../ui/styles";
import { useContent } from "../../cms/content-context";

export function SiteFooter() {
  const { blocks } = useContent();
  const footer = blocks.footer;

  return (
    <footer className="site-footer footer-watermark full-bleed-safe relative overflow-hidden bg-brand-forest py-8 text-brand-warm-white">
      <img className="footer-watermark-logo pointer-events-none absolute bottom-[-8%] left-1/2 z-0 w-[min(1200px,150%)] max-w-none -translate-x-1/2 opacity-[0.04]" src="assets/jaggle_logo.png" alt="" aria-hidden="true" loading="lazy" decoding="async" width="1200" height="300" />
      <div className={`relative z-[1] grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr] ${sectionShell}`}>
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="mb-3 inline-flex -rotate-2 rounded-wobbly-tag border-2 border-brand-yellow/80 bg-brand-warm-white px-3 py-2">
            <img className="w-22" src="assets/zama_logo.png" alt="Zama" width="88" height="38" />
          </div>
          <p className="text-brand-warm-white/78">{footer.tagline}</p>
          <p className="mt-1 text-brand-warm-white/78">{footer.location}</p>
          <div className="mt-3" aria-label="Launch updates">
            <OutlineLink href="#waitlist">{footer.joinLabel}</OutlineLink>
          </div>
        </div>
        <nav className="grid content-start gap-[0.45rem]" aria-label="Footer navigation - company">
          <p className="mb-1 text-[0.92rem] font-bold text-brand-white">{footer.companyTitle}</p>
          {footer.companyLinks.map((link) => <a className="footer-link relative inline-flex min-h-11 items-center text-brand-yellow sm:min-h-6" href={link.href} key={link.label}>{link.label}</a>)}
        </nav>
        <div className="grid content-start gap-[0.45rem]" aria-label="Footer navigation - support">
          <p className="mb-1 text-[0.92rem] font-bold text-brand-white">{footer.supportTitle}</p>
          {footer.supportLinks.map((link) => (
            <a className="footer-link relative inline-flex min-h-11 items-center text-brand-yellow sm:min-h-6" href={link.href} key={link.label}>
              {link.label}
              {link.href.startsWith("#/") ? <ArrowIcon className="ml-1.5" /> : null}
            </a>
          ))}
        </div>
        <div className="footer-bottom col-span-full mt-2 flex flex-col gap-[0.4rem] border-t-2 border-dashed border-brand-white/26 pt-4 text-[0.85rem] text-brand-warm-white/64 sm:flex-row sm:items-center sm:justify-between">
          <p>{footer.copyright}</p>
          <p className="flex items-center gap-[0.4rem]">{footer.poweredBy} <img className="h-4 w-auto" src="assets/jaggle_mark.png" alt="Jaggle AI" width="16" height="16" loading="lazy" decoding="async" /></p>
        </div>
      </div>
    </footer>
  );
}
