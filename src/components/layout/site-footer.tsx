import { OutlineLink } from "../ui/action-link";
import { sectionShell } from "../ui/styles";

export function SiteFooter() {
  return (
    <footer className="site-footer footer-watermark full-bleed-safe relative overflow-hidden bg-brand-forest py-8 text-brand-warm-white">
      <img className="footer-watermark-logo pointer-events-none absolute bottom-[-8%] left-1/2 z-0 w-[min(1200px,150%)] max-w-none -translate-x-1/2 opacity-[0.04]" src="assets/jaggle_logo.png" alt="" aria-hidden="true" loading="lazy" decoding="async" width="1200" height="300" />
      <div className={`relative z-[1] grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr] ${sectionShell}`}>
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="mb-3 inline-flex -rotate-2 rounded-wobbly-tag border-2 border-brand-yellow/80 bg-brand-warm-white px-3 py-2">
            <img className="w-22" src="assets/zama_logo.png" alt="Zama" width="88" height="38" />
          </div>
          <p className="text-brand-warm-white/78">Meal kits and groceries for Thimphu, with sourcing shown clearly.</p>
          <p className="mt-1 text-brand-warm-white/78">Thimphu, Bhutan</p>
          <div className="mt-3" aria-label="Launch updates">
            <OutlineLink href="#waitlist">Join launch updates</OutlineLink>
          </div>
        </div>
        <nav className="grid content-start gap-[0.45rem]" aria-label="Footer navigation - company">
          <p className="mb-1 text-[0.92rem] font-bold text-brand-white">Company</p>
          <a className="footer-link relative inline-flex min-h-11 items-center text-brand-yellow sm:min-h-6" href="#about">About Zama</a><a className="footer-link relative inline-flex min-h-11 items-center text-brand-yellow sm:min-h-6" href="#farmers">Our Farms</a><a className="footer-link relative inline-flex min-h-11 items-center text-brand-yellow sm:min-h-6" href="#trust">Sourcing and trust</a><a className="footer-link relative inline-flex min-h-11 items-center text-brand-yellow sm:min-h-6" href="mailto:hello@zama.bt?subject=Career%20enquiry">Careers</a><a className="footer-link relative inline-flex min-h-11 items-center text-brand-yellow sm:min-h-6" href="mailto:hello@zama.bt?subject=Press%20enquiry">Press</a>
        </nav>
        <div className="grid content-start gap-[0.45rem]" aria-label="Footer navigation - support">
          <p className="mb-1 text-[0.92rem] font-bold text-brand-white">Support</p>
          <a className="footer-link relative inline-flex min-h-11 items-center text-brand-yellow sm:min-h-6" href="#how-it-works">How it Works</a><a className="footer-link relative inline-flex min-h-11 items-center text-brand-yellow sm:min-h-6" href="#b2b">Farm Partnership</a><a className="footer-link relative inline-flex min-h-11 items-center text-brand-yellow sm:min-h-6" href="#delivery">Delivery Areas</a><a className="footer-link relative inline-flex min-h-11 items-center text-brand-yellow sm:min-h-6" href="mailto:hello@zama.bt">Contact Us</a><a className="footer-link relative inline-flex min-h-11 items-center text-brand-yellow sm:min-h-6" href="#privacy-policy">Privacy Policy</a>
        </div>
        <div className="footer-bottom col-span-full mt-2 flex flex-col gap-[0.4rem] border-t-2 border-dashed border-brand-white/26 pt-4 text-[0.85rem] text-brand-warm-white/64 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Zama Technologies, Thimphu, Bhutan. All Rights Reserved.</p>
          <p className="flex items-center gap-[0.4rem]">Powered by Jaggle AI <img className="h-4 w-auto" src="assets/jaggle_mark.png" alt="Jaggle AI" width="16" height="16" loading="lazy" decoding="async" /></p>
        </div>
      </div>
    </footer>
  );
}
