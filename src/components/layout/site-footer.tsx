import { OutlineLink } from "../ui/action-link";
import { sectionShell } from "../ui/styles";

export function SiteFooter() {
  return (
    <footer className={`site-footer footer-watermark relative grid grid-cols-1 gap-8 overflow-hidden border-t-4 border-dashed border-brand-black/42 pt-8 pb-6 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr] ${sectionShell}`}>
      <img className="footer-watermark-logo pointer-events-none absolute bottom-[-8%] left-1/2 z-0 w-[min(1200px,150%)] max-w-none -translate-x-1/2 opacity-[0.14]" src="assets/jaggle_logo.png" alt="" aria-hidden="true" loading="lazy" decoding="async" width="1200" height="300" />
      <div className="relative z-[1] sm:col-span-2 lg:col-span-1">
        <img className="mb-2 w-22 -rotate-2" src="assets/zama_logo.png" alt="Zama" width="88" height="38" />
        <p className="text-brand-black/72">Fresh foods from Bhutanese farms at your doorstep.</p>
        <p className="mt-1 text-brand-black/72">Thimphu, Bhutan</p>
        <div className="mt-3" aria-label="Launch updates">
          <OutlineLink href="#waitlist">Join launch updates</OutlineLink>
        </div>
      </div>
      <nav className="relative z-[1] grid content-start gap-[0.45rem]" aria-label="Footer navigation - company">
        <p className="mb-1 text-[0.92rem] font-bold text-brand-black">Company</p>
        <a className="footer-link relative text-brand-green-ink" href="#about">About Zama</a><a className="footer-link relative text-brand-green-ink" href="#farmers">Our Farms</a><a className="footer-link relative text-brand-green-ink" href="#trust">Sourcing and trust</a><a className="footer-link relative text-brand-green-ink" href="mailto:hello@zama.bt?subject=Career%20enquiry">Careers</a><a className="footer-link relative text-brand-green-ink" href="mailto:hello@zama.bt?subject=Press%20enquiry">Press</a>
      </nav>
      <div className="relative z-[1] grid content-start gap-[0.45rem]" aria-label="Footer navigation - support">
        <p className="mb-1 text-[0.92rem] font-bold text-brand-black">Support</p>
        <a className="footer-link relative text-brand-green-ink" href="#how-it-works">How it Works</a><a className="footer-link relative text-brand-green-ink" href="#b2b">Farm Partnership</a><a className="footer-link relative text-brand-green-ink" href="#delivery">Delivery Areas</a><a className="footer-link relative text-brand-green-ink" href="mailto:hello@zama.bt">Contact Us</a><a className="footer-link relative text-brand-green-ink" href="#privacy-policy">Privacy Policy</a>
      </div>
      <div className="footer-bottom relative z-[1] col-span-full mt-2 flex flex-col gap-[0.4rem] border-t-2 border-dashed border-brand-black/30 pt-4 text-[0.85rem] text-brand-black/56 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Zama Technologies, Thimphu, Bhutan. All Rights Reserved.</p>
        <p className="flex items-center gap-[0.4rem]">Powered by Jaggle AI <img className="h-4 w-auto" src="assets/jaggle_mark.png" alt="Jaggle AI" width="16" height="16" loading="lazy" decoding="async" /></p>
      </div>
    </footer>
  );
}
