import { useState } from "react";
import "./App.css";

// Reusable button styles (kept as plain strings rather than components,
// per the "single file" requirement, purely to avoid repeating long
// utility strings across many buttons that share the exact same look).
const btnBase =
  "relative inline-flex items-center justify-center whitespace-nowrap text-center border-[3px] border-brand-black rounded-wobbly font-secondary font-normal leading-none transition-[background-color,color,box-shadow,transform] duration-[120ms] ease-in-out hover:shadow-[2px_2px_0_0_#262626] hover:-rotate-1 hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-1 active:translate-y-1 active:rotate-0 btn-sketch text-brand-black";

const btnPrimaryLg = `${btnBase} min-h-[48px] px-[1.1rem] py-[0.7rem] text-[1.12rem] shadow-brand bg-brand-green hover:bg-brand-orange`;
const btnOutlineLg = `${btnBase} min-h-[48px] px-[1.1rem] py-[0.7rem] text-[1.12rem] shadow-brand bg-brand-white hover:bg-brand-green`;
const btnPrimarySm = `${btnBase} min-h-[42px] px-[0.9rem] py-[0.55rem] text-base shadow-[3px_3px_0_0_#262626] bg-brand-green hover:bg-brand-orange`;
const btnOutlineSm = `${btnBase} min-h-[42px] px-[0.9rem] py-[0.55rem] text-base shadow-[3px_3px_0_0_#262626] bg-brand-white hover:bg-brand-green`;
const btnOutlineXs =
  `${btnBase} mt-[0.4rem] w-fit min-h-[38px] px-[0.8rem] py-[0.55rem] text-[0.98rem] shadow-[3px_3px_0_0_#262626] bg-brand-white hover:bg-brand-green`;
const btnPrimaryKit =
  `${btnBase} min-h-[32px] px-[0.6rem] py-[0.32rem] text-[0.85rem] shadow-[2px_2px_0_0_#262626] bg-brand-green hover:bg-brand-orange`;

const tagYellow =
  "inline-flex w-fit items-center border-2 border-dashed border-brand-black rounded-wobbly-tag bg-brand-yellow shadow-[2px_2px_0_0_rgb(38_38_38/0.18)] px-[0.68rem] py-[0.38rem] font-secondary text-base font-normal leading-none text-brand-black -rotate-[1.4deg]";
const tagOutline =
  "inline-flex w-fit items-center border-2 border-dashed border-brand-black rounded-wobbly-tag bg-brand-white shadow-[2px_2px_0_0_rgb(38_38_38/0.18)] px-[0.68rem] py-[0.38rem] font-secondary text-base font-normal leading-none text-brand-green -rotate-[1.4deg]";

const sectionShell = "w-[min(1120px,calc(100%-40px))] mx-auto";

const navLinkClass =
  "nav-link relative px-[0.1rem] py-[0.22rem] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-dashed focus-visible:outline-brand-green focus-visible:outline-offset-4";

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="site-header relative z-20 mx-auto mt-3 w-[calc(100%-28px)] max-w-[1120px] rounded-[26px_18px_28px_14px/16px_30px_18px_28px] border-[3px] border-brand-black px-[0.9rem] py-[0.7rem] shadow-brand sm:sticky sm:top-[10px] sm:w-[min(1260px,calc(100%-40px))]">
        <div className="grid grid-cols-[auto_1fr] items-center gap-[0.9rem] sm:grid-cols-[auto_1fr] sm:gap-[1.4rem] lg:grid-cols-[auto_1fr_auto]">
          <a className="brand inline-flex shrink-0 -rotate-2 items-center" href="#top" aria-label="Zama home">
            <img className="w-20 sm:w-24" src="assets/zama_logo.png" alt="Zama" />
          </a>

          <nav
            className="site-nav hidden sm:order-3 sm:col-span-2 sm:flex sm:flex-wrap sm:justify-start sm:gap-[clamp(0.85rem,2.2vw,2.25rem)] sm:text-[1.07rem] lg:order-none lg:col-span-1"
            aria-label="Main navigation"
          >
            <a className={navLinkClass} href="#farmers">Our Team</a>
            <a className={navLinkClass} href="#how-it-works">How it Works</a>
            <a className={navLinkClass} href="#subscriptions">Subscriptions</a>
            <a className={navLinkClass} href="#meal-kits">Meal Kits</a>
          </nav>

          <div className="header-actions hidden items-center gap-[0.7rem] sm:flex sm:justify-end" aria-label="Primary actions">
            <a className={btnOutlineSm} href="#farmers">
              Farm Partner
            </a>
            <a className={btnPrimarySm} href="#waitlist">
              Join Waitlist
            </a>
          </div>

          <div className="flex items-center justify-end gap-[0.55rem] sm:hidden">
            <a className={`${btnPrimarySm} px-[0.75rem] text-[0.92rem]`} href="#waitlist">
              Join
            </a>
            <button
              type="button"
              className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-wobbly-md border-[3px] border-brand-black bg-brand-white text-brand-black shadow-[2px_2px_0_0_#262626] transition-transform duration-[120ms] ease-in-out active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                {menuOpen ? (
                  <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                ) : (
                  <>
                    <path d="M3 5.5h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                    <path d="M3 10h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                    <path d="M3 14.5h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        <div
          id="mobile-menu"
          className={`mobile-menu grid overflow-hidden transition-[grid-template-rows,opacity,margin-top] duration-300 ease-in-out sm:hidden ${
            menuOpen ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <nav className="grid min-h-0 gap-[0.6rem] overflow-hidden rounded-wobbly-md border-[3px] border-brand-black bg-brand-white p-[0.9rem] shadow-brand" aria-label="Mobile navigation">
            <a className={`${navLinkClass} text-[1.05rem]`} href="#farmers" onClick={() => setMenuOpen(false)}>Our Team</a>
            <a className={`${navLinkClass} text-[1.05rem]`} href="#how-it-works" onClick={() => setMenuOpen(false)}>How it Works</a>
            <a className={`${navLinkClass} text-[1.05rem]`} href="#subscriptions" onClick={() => setMenuOpen(false)}>Subscriptions</a>
            <a className={`${navLinkClass} text-[1.05rem]`} href="#meal-kits" onClick={() => setMenuOpen(false)}>Meal Kits</a>
            <a className={`${btnOutlineSm} mt-1 w-full`} href="#farmers" onClick={() => setMenuOpen(false)}>
              Farm Partner
            </a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section
          className={`hero hero-shell relative grid min-h-[auto] grid-cols-1 items-center gap-[clamp(1.5rem,5vw,3.6rem)] pt-6 pb-[clamp(1.6rem,3.5vw,2.4rem)] sm:pt-[clamp(1.6rem,3.5vw,2.6rem)] lg:min-h-[min(600px,calc(100vh-118px))] lg:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)] ${sectionShell}`}
          aria-labelledby="hero-title"
        >
          <div className="hero-content hero-content-shell relative z-[1] flex min-w-0 flex-col items-start gap-[0.85rem]">
            <p className={tagYellow}>Bhutan's First Farm to Kitchen Delivery</p>
            <h1 id="hero-title" className="hero-h1 relative max-w-[11.5ch] font-primary text-[clamp(2rem,7.5vw,2.4rem)] font-bold leading-[1.02] text-brand-black sm:max-w-[690px] sm:text-[clamp(3rem,6.5vw,5.6rem)]">
              Local Products to your door. No Middleman.
            </h1>
            <p className="hero-copy max-w-full text-[clamp(1rem,4vw,1.1rem)] text-brand-black/72 sm:max-w-[570px] sm:text-[clamp(1.15rem,1.6vw,1.32rem)]">
              Fresh groceries, meal kits, wellness essentials and local farm
              products, delivered when you need them.
            </p>

            <form
              className="waitlist-form waitlist-form-shell relative mt-[0.3rem] flex w-full max-w-[500px] flex-col flex-wrap gap-[0.65rem] sm:flex-row"
              id="waitlist"
              aria-label="Join waitlist"
            >
              <label className="sr-only">Email address</label>
              <input
                id="email"
                type="email"
                placeholder="your@email.com"
                required
                className="min-h-[46px] min-w-0 flex-1 rounded-[20px_28px_16px_24px/24px_16px_28px_20px] border-[3px] border-brand-black bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-[3px_3px_0_0_rgb(38_38_38/0.16)] outline-none placeholder:text-brand-black/46 focus:border-brand-green focus:shadow-[3px_3px_0_0_rgb(38_38_38/0.16),0_0_0_4px_rgb(21_182_61/0.2)]"
              />
              <button className={`${btnPrimaryLg} w-full sm:w-auto`} type="submit">
                Join Waitlist
              </button>
              <p className="form-status min-h-[1.4em] basis-full text-[1.05rem] text-brand-green" role="status" aria-live="polite"></p>
            </form>
          </div>

          <div
            className="hero-media hero-media-shell relative grid min-w-0 place-items-center rotate-[1.2deg]"
            aria-label="Fresh groceries and local produce"
          >
            <img
              className="relative z-[1] w-[min(100%,560px)] -rotate-1 object-contain"
              src="assets/hero.png"
              alt="Fresh produce, grocery bags, and delivery boxes"
            />
            <div className="harvest-note harvest-note-shell absolute right-[clamp(0.2rem,2vw,1rem)] bottom-[clamp(0.5rem,4vw,2rem)] z-[2] grid w-[128px] gap-[0.2rem] rotate-[-4deg] rounded-[18px_28px_16px_24px/26px_18px_28px_16px] border-[3px] border-brand-black bg-brand-white p-[0.65rem] shadow-brand sm:w-[158px] sm:gap-[0.25rem] sm:p-[0.85rem]">
              <strong className="font-primary text-[1.5rem] leading-none text-brand-orange sm:text-[2rem]">48 hr</strong>
              <span className="text-[0.85rem] leading-[1.08] text-brand-black sm:text-base">farm-to-kitchen freshness</span>
            </div>
          </div>
        </section>

        <section
          className={`feature-strip grid grid-cols-1 gap-4 pt-[0.4rem] pb-4 sm:grid-cols-2 md:grid-cols-4 ${sectionShell}`}
          aria-label="Zama promises"
        >
          <div className="flex min-h-[106px] -rotate-[1.5deg] items-center gap-3 rounded-wobbly-card border-[3px] border-brand-black bg-brand-yellow p-[1rem_1.1rem] shadow-brand transition-[box-shadow,transform] duration-[120ms] ease-in-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#262626] hover:rotate-0">
            <span className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[44%_56%_48%_52%/54%_44%_56%_46%] border-[3px] border-brand-black bg-brand-orange font-primary text-[0.92rem] leading-none text-brand-black">01</span>
            <p className="text-[1.15rem] leading-[1.12] text-brand-black">Farm-to-door Freshness</p>
          </div>
          <div className="flex min-h-[106px] rotate-[1.2deg] items-center gap-3 rounded-wobbly-card border-[3px] border-brand-black bg-brand-white p-[1rem_1.1rem] shadow-brand transition-[box-shadow,transform] duration-[120ms] ease-in-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#262626] hover:rotate-0">
            <span className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[44%_56%_48%_52%/54%_44%_56%_46%] border-[3px] border-brand-black bg-brand-orange font-primary text-[0.92rem] leading-none text-brand-black">02</span>
            <p className="text-[1.15rem] leading-[1.12] text-brand-black">100% locally sourced</p>
          </div>
          <div className="flex min-h-[106px] -rotate-[1.5deg] items-center gap-3 rounded-wobbly-card border-[3px] border-brand-black bg-brand-yellow p-[1rem_1.1rem] shadow-brand transition-[box-shadow,transform] duration-[120ms] ease-in-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#262626] hover:rotate-0">
            <span className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[44%_56%_48%_52%/54%_44%_56%_46%] border-[3px] border-brand-black bg-brand-orange font-primary text-[0.92rem] leading-none text-brand-black">03</span>
            <p className="text-[1.15rem] leading-[1.12] text-brand-black">Doorstep delivery</p>
          </div>
          <div className="flex min-h-[106px] rotate-[1.2deg] items-center gap-3 rounded-wobbly-card border-[3px] border-brand-black bg-brand-white p-[1rem_1.1rem] shadow-brand transition-[box-shadow,transform] duration-[120ms] ease-in-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#262626] hover:rotate-0">
            <span className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[44%_56%_48%_52%/54%_44%_56%_46%] border-[3px] border-brand-black bg-brand-orange font-primary text-[0.92rem] leading-none text-brand-black">04</span>
            <p className="text-[1.15rem] leading-[1.12] text-brand-black">Zero waste packaging</p>
          </div>
        </section>

        <section className={`values grid grid-cols-1 gap-[1rem] py-[clamp(2.4rem,8vw,6rem)] sm:grid-cols-2 sm:gap-[clamp(1.2rem,4vw,3rem)] md:grid-cols-3 ${sectionShell}`} aria-label="Why Zama works">
          <article className="value-card value-card-shell relative grid -rotate-[1.3deg] justify-items-center gap-[0.5rem] rounded-wobbly-card border-[3px] border-brand-black bg-brand-white p-[1.1rem_1rem_1rem] text-center shadow-brand-soft transition-[box-shadow,transform] duration-[120ms] ease-in-out hover:-translate-x-px hover:-translate-y-px hover:rotate-0 hover:shadow-brand sm:gap-[0.8rem] sm:p-[1.45rem_1rem_1.3rem]">
            <img className="h-[76px] w-[76px] object-contain sm:h-[124px] sm:w-[124px]" src="assets/Frame.png" alt="" aria-hidden="true" />
            <h2 className="font-primary text-[1.55rem] font-bold leading-[1.02] text-brand-black sm:text-[2.1rem]">Eat Well</h2>
            <p className="max-w-[300px] text-[0.98rem] text-brand-black/72 sm:text-[1.12rem]">
              Seasonal local produce, fresher than supermarkets and grown
              without long storage.
            </p>
          </article>

          <article className="value-card value-card-shell relative grid rotate-[1.1deg] justify-items-center gap-[0.5rem] rounded-wobbly-card border-[3px] border-brand-black bg-brand-yellow p-[1.1rem_1rem_1rem] text-center shadow-brand-soft transition-[box-shadow,transform] duration-[120ms] ease-in-out hover:-translate-x-px hover:-translate-y-px hover:rotate-0 hover:shadow-brand sm:gap-[0.8rem] sm:p-[1.45rem_1rem_1.3rem]">
            <img className="h-[76px] w-[76px] object-contain sm:h-[124px] sm:w-[124px]" src="assets/Frame (1).png" alt="" aria-hidden="true" />
            <h2 className="font-primary text-[1.55rem] font-bold leading-[1.02] text-brand-black sm:text-[2.1rem]">Less fuss</h2>
            <p className="max-w-[300px] text-[0.98rem] text-brand-black/72 sm:text-[1.12rem]">
              No market runs. No meal planning. No forgotten items. Your kitchen
              runs on autopilot.
            </p>
          </article>

          <article className="value-card value-card-shell relative grid -rotate-[0.5deg] justify-items-center gap-[0.5rem] rounded-wobbly-card border-[3px] border-brand-black bg-brand-white p-[1.1rem_1rem_1rem] text-center shadow-brand-soft transition-[box-shadow,transform] duration-[120ms] ease-in-out hover:-translate-x-px hover:-translate-y-px hover:rotate-0 hover:shadow-brand sm:gap-[0.8rem] sm:p-[1.45rem_1rem_1.3rem]">
            <img className="h-[76px] w-[76px] object-contain sm:h-[124px] sm:w-[124px]" src="assets/Frame (2).png" alt="" aria-hidden="true" />
            <h2 className="font-primary text-[1.55rem] font-bold leading-[1.02] text-brand-black sm:text-[2.1rem]">One box</h2>
            <p className="max-w-[300px] text-[0.98rem] text-brand-black/72 sm:text-[1.12rem]">
              Vegetables, meal kits, pharmacy, dairy, and pantry basics sorted
              in one delivery.
            </p>
          </article>
        </section>

        <section
          className={`products grid gap-[clamp(2.6rem,6vw,5rem)] pb-[clamp(4rem,7vw,6rem)] ${sectionShell}`}
          id="subscriptions"
          aria-labelledby="products-title"
        >
          <div className="section-heading grid justify-items-center gap-[0.55rem] text-center">
            <p className={tagOutline}>Subscriptions</p>
            <h2 id="products-title" className="font-primary text-[clamp(2.35rem,5vw,5rem)] font-bold leading-[1.02] text-brand-black">Explore what we have</h2>
          </div>

          <article className="product-row product-row-shell product-art-first relative grid grid-cols-1 items-center gap-[clamp(2rem,7vw,5.4rem)] sm:grid-cols-[minmax(250px,0.88fr)_minmax(0,1fr)]">
            <div className="product-art product-art-shell relative grid min-h-[250px] place-items-center sm:min-h-[300px]">
              <img
                className="relative z-[1] max-h-[340px] -rotate-1 object-contain transition-transform duration-[120ms] ease-in-out group-hover:rotate-[1.5deg]"
                src="assets/vegetableBox.png"
                alt="Vegetable box with fresh greens"
              />
            </div>
            <div className="product-copy grid max-w-[520px] content-center gap-4">
              <p className={tagOutline}>Weekly fresh box</p>
              <h3 className="font-primary text-[clamp(2.6rem,5vw,4.65rem)] font-bold leading-[1.02] text-brand-black">Vegetable Box</h3>
              <p className="text-[1.25rem] text-brand-black/72">
                Farm fresh vegetables, picked with care from Bhutanese hillside
                farms.
              </p>
              <div className="button-row flex flex-wrap gap-[0.8rem]">
                <a className={btnPrimaryLg} href="#waitlist">
                  Get this box
                </a>
                <a className={btnOutlineLg} href="#subscriptions">
                  Explore Varieties
                </a>
              </div>
            </div>
          </article>

          <article className="product-row product-row-reverse product-row-shell product-row-reverse-shell relative grid grid-cols-1 items-center gap-[clamp(2rem,7vw,5.4rem)] sm:grid-cols-[minmax(0,1fr)_minmax(250px,0.88fr)]">
            <div className="product-art product-art-shell product-art-shell-alt order-none relative grid min-h-[250px] place-items-center sm:order-2 sm:min-h-[300px]">
              <img
                className="relative z-[1] max-h-[340px] -rotate-1 object-contain"
                src="assets/fruit box.png"
                alt="Fruit box with seasonal fruit"
              />
            </div>
            <div className="product-copy grid max-w-[520px] content-center gap-4">
              <p className={tagOutline}>Peak ripeness</p>
              <h3 className="font-primary text-[clamp(2.6rem,5vw,4.65rem)] font-bold leading-[1.02] text-brand-black">Fruit Box</h3>
              <p className="text-[1.25rem] text-brand-black/72">
                Seasonal fruits, naturally sweet and sourced at peak ripeness.
              </p>
              <div className="button-row flex flex-wrap gap-[0.8rem]">
                <a className={btnPrimaryLg} href="#waitlist">
                  Get this box
                </a>
                <a className={btnOutlineLg} href="#subscriptions">
                  Explore Varieties
                </a>
              </div>
            </div>
          </article>

          <article className="product-row product-row-shell relative grid grid-cols-1 items-center gap-[clamp(2rem,7vw,5.4rem)] sm:grid-cols-[minmax(250px,0.88fr)_minmax(0,1fr)]">
            <div className="product-art product-art-shell product-art-shell-alt relative grid min-h-[250px] place-items-center sm:min-h-[300px]">
              <img
                className="relative z-[1] max-h-[340px] -rotate-1 object-contain"
                src="assets/grocery box.png"
                alt="Grocery box with pantry essentials"
              />
            </div>
            <div className="product-copy grid max-w-[520px] content-center gap-4">
              <p className={tagOutline}>Everyday staples</p>
              <h3 className="font-primary text-[clamp(2.6rem,5vw,4.65rem)] font-bold leading-[1.02] text-brand-black">Grocery Box</h3>
              <p className="text-[1.25rem] text-brand-black/72">
                Everyday pantry essentials: grains, pulses, oils, and spices.
              </p>
              <div className="button-row flex flex-wrap gap-[0.8rem]">
                <a className={btnPrimaryLg} href="#waitlist">
                  Get this box
                </a>
                <a className={btnOutlineLg} href="#subscriptions">
                  Explore Items
                </a>
              </div>
            </div>
          </article>

          <article className="product-row product-row-reverse product-row-shell product-row-reverse-shell relative grid grid-cols-1 items-center gap-[clamp(2rem,7vw,5.4rem)] sm:grid-cols-[minmax(0,1fr)_minmax(250px,0.88fr)]">
            <div className="product-art product-art-shell order-none relative grid min-h-[250px] place-items-center sm:order-2 sm:min-h-[300px]">
              <img
                className="relative z-[1] max-h-[340px] -rotate-1 object-contain"
                src="assets/mealkit box.png"
                alt="Meal kit box with pre-portioned ingredients"
              />
            </div>
            <div className="product-copy grid max-w-[520px] content-center gap-4">
              <p className={tagOutline}>Recipes included</p>
              <h3 className="font-primary text-[clamp(2.6rem,5vw,4.65rem)] font-bold leading-[1.02] text-brand-black">Meal Kit Box</h3>
              <p className="text-[1.25rem] text-brand-black/72">
                Pre-portioned ingredients with recipes, farmer notes, and
                dietician guidance.
              </p>
              <div className="button-row flex flex-wrap gap-[0.8rem]">
                <a className={btnPrimaryLg} href="#meal-kits">
                  Get this box
                </a>
                <a className={btnOutlineLg} href="#meal-kits">
                  Explore Varieties
                </a>
              </div>
            </div>
          </article>

          <article className="product-row product-row-shell relative grid grid-cols-1 items-center gap-[clamp(2rem,7vw,5.4rem)] sm:grid-cols-[minmax(250px,0.88fr)_minmax(0,1fr)]">
            <div className="product-art product-art-shell product-art-shell-alt relative grid min-h-[250px] place-items-center sm:min-h-[300px]">
              <img
                className="relative z-[1] max-h-[340px] -rotate-1 object-contain"
                src="assets/allInOneBox.png"
                alt="All-in-one box with groceries and produce"
              />
            </div>
            <div className="product-copy grid max-w-[520px] content-center gap-4">
              <p className={tagOutline}>Full kitchen refill</p>
              <h3 className="font-primary text-[clamp(2.6rem,5vw,4.65rem)] font-bold leading-[1.02] text-brand-black">All in One Box</h3>
              <p className="text-[1.25rem] text-brand-black/72">
                Groceries, vegetables, fruits, meat, pharmacy and supplements,
                everything in a single delivery.
              </p>
              <div className="button-row flex flex-wrap gap-[0.8rem]">
                <a className={btnPrimaryLg} href="#waitlist">
                  Get this box
                </a>
                <a className={btnOutlineLg} href="#subscriptions">
                  See full content
                </a>
              </div>
            </div>
          </article>
        </section>

        <section
          className={`meal-kits grid gap-[1.6rem] pt-[clamp(1rem,4vw,2rem)] pb-[clamp(4rem,8vw,6rem)] ${sectionShell}`}
          id="meal-kits"
          aria-labelledby="meal-title"
        >
          <div className="section-heading split-heading flex flex-col items-start gap-[0.55rem] sm:flex-row sm:items-end sm:justify-between sm:gap-8">
            <div>
              <p className={tagOutline}>Meal kits</p>
              <h2 id="meal-title" className="font-primary text-[clamp(2.35rem,5vw,5rem)] font-bold leading-[1.02] text-brand-black">Don't know what to cook?</h2>
              <p className="font-primary text-[clamp(1.8rem,3.5vw,3.2rem)] leading-[1.05] text-brand-orange">Let us plan it for you.</p>
            </div>
            <a className={btnOutlineLg} href="#waitlist">
              See all Meal Kits
            </a>
          </div>

          <div className="kit-grid grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <article className="kit-card kit-card-shell kit-card-yellow relative grid min-h-[300px] -rotate-[1.2deg] overflow-hidden rounded-wobbly-card border-4 border-brand-black bg-brand-yellow p-[1rem] shadow-brand transition-[box-shadow,transform] duration-[120ms] ease-in-out hover:-translate-x-px hover:-translate-y-px hover:rotate-0 hover:shadow-[6px_6px_0_0_#262626] sm:min-h-[380px] sm:p-[1.2rem] md:min-h-[360px] md:rotate-[-1.2deg]">
              <div className="kit-copy relative z-[1] grid max-w-[82%] content-start gap-[0.7rem] md:max-w-[72%]">
                <p className={tagYellow}>Balanced high fibre</p>
                <h3 className="font-primary text-[clamp(1.55rem,2.4vw,2.15rem)] font-bold leading-[1.02] text-brand-black">Breakfast Kit</h3>
                <p className="text-brand-black/72">Eggs, avocado, oats, and greens.</p>
                <strong className="text-brand-black">From Nu 180/day</strong>
              </div>
              <img
                className="absolute -right-[30px] bottom-10 w-[56%] max-h-[160px] rotate-[7deg] object-contain sm:-right-[50px] sm:bottom-12 sm:w-[62%] sm:max-h-[230px]"
                src="assets/orderkit.png"
                alt="Breakfast meal kit ingredients"
              />
              <a className={`${btnPrimaryKit} absolute right-[1rem] bottom-[1rem] left-[1rem] sm:right-[1.2rem] sm:bottom-[1.2rem] sm:left-[1.2rem]`} href="#waitlist">
                Order Kit
              </a>
            </article>

            <article className="kit-card kit-card-shell kit-card-green relative grid min-h-[300px] rotate-[1.4deg] overflow-hidden rounded-wobbly-card border-4 border-brand-black bg-brand-green/18 p-[1rem] shadow-brand transition-[box-shadow,transform] duration-[120ms] ease-in-out hover:-translate-x-px hover:-translate-y-px hover:rotate-0 hover:shadow-[6px_6px_0_0_#262626] sm:min-h-[380px] sm:p-[1.2rem] md:min-h-[360px]">
              <span className="absolute right-[0.9rem] top-[0.9rem] z-[2] inline-flex items-center rounded-full border-2 border-brand-black bg-brand-green px-[0.62rem] py-[0.22rem] font-secondary text-[0.72rem] font-medium leading-none text-white shadow-[2px_2px_0_0_rgb(38_38_38/0.3)]">
                Most Popular
              </span>
              <div className="kit-copy relative z-[1] grid max-w-[82%] content-start gap-[0.7rem] md:max-w-[72%]">
                <p className={tagYellow}>High protein, gym ready</p>
                <h3 className="font-primary text-[clamp(1.55rem,2.4vw,2.15rem)] font-bold leading-[1.02] text-brand-black">Muscle Gain Kit</h3>
                <p className="text-brand-black/72">Chicken, brown rice, broccoli, carrot, legumes.</p>
                <strong className="text-brand-black">From Nu 320/day</strong>
              </div>
              <img
                className="absolute -right-[30px] bottom-10 w-[56%] max-h-[160px] rotate-[7deg] object-contain sm:-right-[50px] sm:bottom-12 sm:w-[62%] sm:max-h-[230px]"
                src="assets/orderkit.png"
                alt="Muscle gain meal kit ingredients"
              />
              <a className={`${btnPrimaryKit} absolute right-[1rem] bottom-[1rem] left-[1rem] sm:right-[1.2rem] sm:bottom-[1.2rem] sm:left-[1.2rem]`} href="#waitlist">
                Order Kit
              </a>
            </article>

            <article className="kit-card kit-card-shell kit-card-yellow relative grid min-h-[300px] -rotate-[0.7deg] overflow-hidden rounded-wobbly-card border-4 border-brand-black bg-brand-yellow p-[1rem] shadow-brand transition-[box-shadow,transform] duration-[120ms] ease-in-out hover:-translate-x-px hover:-translate-y-px hover:rotate-0 hover:shadow-[6px_6px_0_0_#262626] sm:min-h-[380px] sm:p-[1.2rem] md:min-h-[360px]">
              <div className="kit-copy relative z-[1] grid max-w-[82%] content-start gap-[0.7rem] md:max-w-[72%]">
                <p className={tagYellow}>Low calorie, filling</p>
                <h3 className="font-primary text-[clamp(1.55rem,2.4vw,2.15rem)] font-bold leading-[1.02] text-brand-black">Weight Loss Kit</h3>
                <p className="text-brand-black/72">Veggies, tofu, quinoa, lentils, herbs.</p>
                <strong className="text-brand-black">From Nu 240/day</strong>
              </div>
              <img
                className="absolute -right-[30px] bottom-10 w-[56%] max-h-[160px] rotate-[7deg] object-contain sm:-right-[50px] sm:bottom-12 sm:w-[62%] sm:max-h-[230px]"
                src="assets/orderkit.png"
                alt="Weight loss meal kit ingredients"
              />
              <a className={`${btnPrimaryKit} absolute right-[1rem] bottom-[1rem] left-[1rem] sm:right-[1.2rem] sm:bottom-[1.2rem] sm:left-[1.2rem]`} href="#waitlist">
                Order Kit
              </a>
            </article>
          </div>

          <aside className="dietician-banner dietician-banner-shell relative grid grid-cols-1 items-center gap-4 -rotate-[0.6deg] rounded-[26px_38px_22px_34px/34px_24px_38px_22px] border-4 border-brand-black bg-brand-white p-[1.35rem] shadow-brand-big sm:grid-cols-[auto_1fr_auto]" aria-label="Dietician support">
            <div className="health-mark grid h-16 w-16 rotate-[8deg] place-items-center rounded-[48%_52%_54%_46%/52%_45%_55%_48%] border-4 border-brand-black bg-brand-orange font-primary text-[2.4rem] leading-none text-brand-black" aria-hidden="true">
              +
            </div>
            <div>
              <h3 className="font-primary text-[clamp(1.55rem,2.4vw,2.15rem)] font-bold leading-[1.02] text-brand-black">Every kit is designed by our in-house dietician.</h3>
              <p className="text-brand-black/72">
                Macros, micronutrients, and your goal are all factored in.
                Members get 1-on-1 consultations.
              </p>
            </div>
            <a className={btnPrimaryLg} href="#pricing">
              Learn More
            </a>
          </aside>
        </section>

        <section
          className={`process grid gap-[2.1rem] py-[clamp(2.4rem,5vw,4.2rem)] ${sectionShell}`}
          id="how-it-works"
          aria-labelledby="process-title"
        >
          <div className="section-heading grid justify-items-center gap-[0.55rem] text-center">
            <p className={tagOutline}>How it works</p>
            <h2 id="process-title" className="font-primary text-[clamp(2.35rem,5vw,5rem)] font-bold leading-[1.02] text-brand-black">From farm list to dinner table.</h2>
          </div>

          <div className="process-grid process-grid-shell relative grid grid-cols-1 items-start gap-6 sm:grid-cols-2 sm:gap-[clamp(0.6rem,2vw,1rem)] md:grid-cols-5">
            <article className="process-step relative z-[1] grid min-h-[190px] -rotate-[1.4deg] justify-items-center gap-[0.6rem] rounded-wobbly-card border-[3px] border-brand-black bg-brand-white p-[0.85rem_0.7rem] text-center shadow-brand-soft transition-[box-shadow,transform] duration-[120ms] ease-in-out hover:-translate-x-px hover:-translate-y-px hover:rotate-0 hover:shadow-brand sm:min-h-[280px] sm:gap-[0.85rem] sm:p-[1rem_0.75rem]">
              <h3 className="font-primary text-[clamp(1.35rem,2vw,2rem)] font-bold leading-[1.02] text-brand-black">Choose.</h3>
              <span className="grid h-[38px] w-[38px] place-items-center rounded-[42%_58%_52%_48%/54%_48%_52%_46%] border-[3px] border-brand-black bg-brand-green font-primary text-base leading-none text-brand-black">1</span>
              <img className="h-[92px] w-[min(100%,108px)] object-contain sm:h-[138px] sm:w-[min(100%,158px)]" src="assets/choose (2).png" alt="Choosing a produce box" />
            </article>
            <article className="process-step relative z-[1] grid min-h-[190px] rotate-[1.3deg] justify-items-center gap-[0.6rem] rounded-wobbly-card border-[3px] border-brand-black bg-brand-yellow p-[0.85rem_0.7rem] text-center shadow-brand-soft transition-[box-shadow,transform] duration-[120ms] ease-in-out hover:-translate-x-px hover:-translate-y-px hover:rotate-0 hover:shadow-brand sm:min-h-[280px] sm:gap-[0.85rem] sm:p-[1rem_0.75rem]">
              <h3 className="font-primary text-[clamp(1.35rem,2vw,2rem)] font-bold leading-[1.02] text-brand-black">Packed.</h3>
              <span className="grid h-[38px] w-[38px] place-items-center rounded-[42%_58%_52%_48%/54%_48%_52%_46%] border-[3px] border-brand-black bg-brand-orange font-primary text-base leading-none text-brand-black">2</span>
              <img className="h-[92px] w-[min(100%,108px)] object-contain sm:h-[138px] sm:w-[min(100%,158px)]" src="assets/packed.png" alt="Packed grocery box" />
            </article>
            <article className="process-step relative z-[1] grid min-h-[190px] -rotate-[1.4deg] justify-items-center gap-[0.6rem] rounded-wobbly-card border-[3px] border-brand-black bg-brand-white p-[0.85rem_0.7rem] text-center shadow-brand-soft transition-[box-shadow,transform] duration-[120ms] ease-in-out hover:-translate-x-px hover:-translate-y-px hover:rotate-0 hover:shadow-brand sm:min-h-[280px] sm:gap-[0.85rem] sm:p-[1rem_0.75rem]">
              <h3 className="font-primary text-[clamp(1.35rem,2vw,2rem)] font-bold leading-[1.02] text-brand-black">Delivered.</h3>
              <span className="grid h-[38px] w-[38px] place-items-center rounded-[42%_58%_52%_48%/54%_48%_52%_46%] border-[3px] border-brand-black bg-brand-green font-primary text-base leading-none text-brand-black">3</span>
              <img className="h-[92px] w-[min(100%,108px)] object-contain sm:h-[138px] sm:w-[min(100%,158px)]" src="assets/delivered (2).png" alt="Delivery arriving at the door" />
            </article>
            <article className="process-step relative z-[1] grid min-h-[190px] rotate-[1.3deg] justify-items-center gap-[0.6rem] rounded-wobbly-card border-[3px] border-brand-black bg-brand-yellow p-[0.85rem_0.7rem] text-center shadow-brand-soft transition-[box-shadow,transform] duration-[120ms] ease-in-out hover:-translate-x-px hover:-translate-y-px hover:rotate-0 hover:shadow-brand sm:min-h-[280px] sm:gap-[0.85rem] sm:p-[1rem_0.75rem]">
              <h3 className="font-primary text-[clamp(1.35rem,2vw,2rem)] font-bold leading-[1.02] text-brand-black">Cook.</h3>
              <span className="grid h-[38px] w-[38px] place-items-center rounded-[42%_58%_52%_48%/54%_48%_52%_46%] border-[3px] border-brand-black bg-brand-orange font-primary text-base leading-none text-brand-black">4</span>
              <img className="h-[92px] w-[min(100%,108px)] object-contain sm:h-[138px] sm:w-[min(100%,158px)]" src="assets/cook (2).png" alt="Cooking fresh produce" />
            </article>
            <article className="process-step relative z-[1] grid min-h-[190px] -rotate-[1.4deg] justify-items-center gap-[0.6rem] rounded-wobbly-card border-[3px] border-brand-black bg-brand-white p-[0.85rem_0.7rem] text-center shadow-brand-soft transition-[box-shadow,transform] duration-[120ms] ease-in-out hover:-translate-x-px hover:-translate-y-px hover:rotate-0 hover:shadow-brand sm:min-h-[280px] sm:gap-[0.85rem] sm:p-[1rem_0.75rem]">
              <h3 className="font-primary text-[clamp(1.35rem,2vw,2rem)] font-bold leading-[1.02] text-brand-black">Repeat.</h3>
              <span className="grid h-[38px] w-[38px] place-items-center rounded-[42%_58%_52%_48%/54%_48%_52%_46%] border-[3px] border-brand-black bg-brand-green font-primary text-base leading-none text-brand-black">5</span>
              <img className="h-[92px] w-[min(100%,108px)] object-contain sm:h-[138px] sm:w-[min(100%,158px)]" src="assets/choose (2).png" alt="Choosing the next weekly box" />
            </article>
          </div>
        </section>

        <section
          className={`top-picks grid grid-cols-1 items-center gap-[1.3rem] py-[clamp(1rem,3vw,1.8rem)] sm:grid-cols-[minmax(220px,0.52fr)_1fr] ${sectionShell}`}
          aria-labelledby="top-picks-title"
        >
          <div className="top-picks-copy top-picks-copy-shell relative">
            <p className={tagOutline}>This week's top picks</p>
            <h2 id="top-picks-title" className="font-primary text-[clamp(2rem,3.5vw,3.5rem)] font-bold leading-[1.02] text-brand-black">Made with what's fresh now.</h2>
          </div>

          <div className="dish-grid grid grid-cols-1 gap-[0.9rem] sm:grid-cols-3">
            <article className="dish-card grid grid-cols-[90px_1fr] items-center gap-[0.8rem] rounded-[22px_34px_18px_30px/28px_18px_34px_22px] border-[3px] border-brand-black bg-brand-white p-[0.58rem] shadow-brand-soft transition-[box-shadow,transform] duration-[120ms] ease-in-out hover:-translate-x-px hover:-translate-y-px hover:-rotate-1 hover:shadow-brand">
              <img className="h-[78px] w-[90px] rounded-[18px_10px_16px_12px/12px_18px_10px_16px] border-[3px] border-brand-black object-cover" src="assets/topPick.png" alt="Ema datshi meal kit" />
              <div>
                <h3 className="text-[1.25rem] font-bold text-brand-black">Ema Datshi Kit</h3>
                <p className="text-brand-black/72">~20 mins</p>
              </div>
            </article>
            <article className="dish-card rotate-1 grid grid-cols-[90px_1fr] items-center gap-[0.8rem] rounded-[22px_34px_18px_30px/28px_18px_34px_22px] border-[3px] border-brand-black bg-brand-yellow p-[0.58rem] shadow-brand-soft transition-[box-shadow,transform] duration-[120ms] ease-in-out hover:-translate-x-px hover:-translate-y-px hover:-rotate-1 hover:shadow-brand">
              <img className="h-[78px] w-[90px] rounded-[18px_10px_16px_12px/12px_18px_10px_16px] border-[3px] border-brand-black object-cover" src="assets/topPick.png" alt="Kewa datshi meal kit" />
              <div>
                <h3 className="text-[1.25rem] font-bold text-brand-black">Kewa Datshi Kit</h3>
                <p className="text-brand-black/72">~35 mins</p>
              </div>
            </article>
            <article className="dish-card grid grid-cols-[90px_1fr] items-center gap-[0.8rem] rounded-[22px_34px_18px_30px/28px_18px_34px_22px] border-[3px] border-brand-black bg-brand-white p-[0.58rem] shadow-brand-soft transition-[box-shadow,transform] duration-[120ms] ease-in-out hover:-translate-x-px hover:-translate-y-px hover:-rotate-1 hover:shadow-brand">
              <img className="h-[78px] w-[90px] rounded-[18px_10px_16px_12px/12px_18px_10px_16px] border-[3px] border-brand-black object-cover" src="assets/topPick.png" alt="Cabbage fry meal kit" />
              <div>
                <h3 className="text-[1.25rem] font-bold text-brand-black">Cabbage Fry Kit</h3>
                <p className="text-brand-black/72">~25 mins</p>
              </div>
            </article>
          </div>
        </section>

        <section
          className={`farmers grid gap-4 py-[clamp(2.2rem,4.5vw,3.4rem)] ${sectionShell}`}
          id="farmers"
          aria-labelledby="farmer-title"
        >
          <div className="split-heading section-heading flex flex-col items-start gap-[0.4rem] sm:flex-row sm:items-end sm:justify-between sm:gap-8">
            <div>
              <p className={tagOutline}>Our farmers</p>
              <h2 id="farmer-title" className="font-primary text-[clamp(2rem,4vw,3.6rem)] font-bold leading-[1.02] text-brand-black">Every Ingredient has a Name.</h2>
            </div>
            <p className="max-w-[480px] text-[1.05rem] text-brand-black/72">
              Every item on Zama — whether a single carrot or a full kit —
              comes from a named farm. We sell stories, not just produce.
            </p>
          </div>

          <div className="farmer-grid grid grid-cols-1 gap-[1rem] sm:grid-cols-2 lg:grid-cols-3">
            <article className="farmer-card farmer-card-shell relative -rotate-[1.1deg] overflow-hidden rounded-wobbly-card border-[3px] border-brand-black bg-brand-white shadow-brand-soft transition-[box-shadow,transform] duration-[120ms] ease-in-out hover:-translate-x-px hover:-translate-y-px hover:rotate-0 hover:shadow-brand">
              <img className="aspect-[1.3] w-full border-b-[3px] border-brand-black object-cover [filter:saturate(0.92)_contrast(1.04)]" src="assets/farmer.png" alt="Farmer Tshewang Dorji" />
              <div className="grid gap-[0.35rem] p-[0.9rem]">
                <h3 className="text-[1.35rem] font-bold text-brand-black">Tshewang Dorji</h3>
                <p className="text-[0.98rem] text-brand-black/72">Punakha Valley</p>
                <p className="text-[0.98rem] text-brand-black/72">Organic greens and herbs</p>
                <a className={btnOutlineXs} href="#farmers">
                  Read his story
                </a>
              </div>
            </article>

            <article className="farmer-card farmer-card-shell relative rotate-[1.2deg] overflow-hidden rounded-wobbly-card border-[3px] border-brand-black bg-brand-white shadow-brand-soft transition-[box-shadow,transform] duration-[120ms] ease-in-out hover:-translate-x-px hover:-translate-y-px hover:rotate-0 hover:shadow-brand">
              <img className="aspect-[1.3] w-full border-b-[3px] border-brand-black object-cover [filter:saturate(0.92)_contrast(1.04)]" src="assets/farmer.png" alt="Farmer Choki Wangmo" />
              <div className="grid gap-[0.35rem] p-[0.9rem]">
                <h3 className="text-[1.35rem] font-bold text-brand-black">Choki Wangmo</h3>
                <p className="text-[0.98rem] text-brand-black/72">Thimphu Valley</p>
                <p className="text-[0.98rem] text-brand-black/72">Organic vegetables and fruits</p>
                <a className={btnOutlineXs} href="#farmers">
                  Read her story
                </a>
              </div>
            </article>

            <article className="farmer-card farmer-card-shell relative -rotate-[1.1deg] overflow-hidden rounded-wobbly-card border-[3px] border-brand-black bg-brand-white shadow-brand-soft transition-[box-shadow,transform] duration-[120ms] ease-in-out hover:-translate-x-px hover:-translate-y-px hover:rotate-0 hover:shadow-brand">
              <img className="aspect-[1.3] w-full border-b-[3px] border-brand-black object-cover [filter:saturate(0.92)_contrast(1.04)]" src="assets/farmer.png" alt="Farmer Sonam Lhamo" />
              <div className="grid gap-[0.35rem] p-[0.9rem]">
                <h3 className="text-[1.35rem] font-bold text-brand-black">Sonam Lhamo</h3>
                <p className="text-[0.98rem] text-brand-black/72">Paro Valley</p>
                <p className="text-[0.98rem] text-brand-black/72">Root vegetables and dairy</p>
                <a className={btnOutlineXs} href="#farmers">
                  Read her story
                </a>
              </div>
            </article>
          </div>

          <div className="section-action flex justify-end">
            <a className={btnOutlineLg} href="#farmers">
              Meet all Farmers
            </a>
          </div>
        </section>

        <section
          className={`pricing grid gap-[1.45rem] pb-[clamp(4rem,8vw,6rem)] ${sectionShell}`}
          id="pricing"
          aria-labelledby="pricing-title"
        >
          <div className="section-heading grid gap-[0.55rem]">
            <p className={tagOutline}>Membership</p>
            <h2 id="pricing-title" className="font-primary text-[clamp(2.35rem,5vw,5rem)] font-bold leading-[1.02] text-brand-black">Save more, eat better</h2>
          </div>

          <div className="pricing-grid grid grid-cols-1 gap-[1.15rem] sm:grid-cols-2">
            <article className="price-card relative grid min-h-[390px] -rotate-1 content-start gap-4 rounded-wobbly-card border-[3px] border-brand-black bg-brand-white p-[1.2rem] shadow-brand-soft transition-[box-shadow,transform] duration-[120ms] ease-in-out hover:-translate-x-px hover:-translate-y-px hover:rotate-0 hover:shadow-brand">
              <p className={tagOutline}>Free</p>
              <h3 className="text-[2.6rem] font-bold text-brand-black">
                Nu 0<span className="font-secondary text-base font-normal text-brand-black/72">/month</span>
              </h3>
              <ul className="grid list-none gap-[0.55rem] text-brand-black/72">
                <li className="relative pl-5 before:absolute before:left-0 before:font-primary before:leading-none before:text-brand-green before:content-['+']">Shop all fresh produce</li>
                <li className="relative pl-5 before:absolute before:left-0 before:font-primary before:leading-none before:text-brand-green before:content-['+']">Order any meal kit</li>
                <li className="relative pl-5 before:absolute before:left-0 before:font-primary before:leading-none before:text-brand-green before:content-['+']">Daily / Weekly / Monthly orders</li>
                <li className="relative pl-5 before:absolute before:left-0 before:font-primary before:leading-none before:text-brand-green before:content-['+']">Standard delivery fee</li>
              </ul>
              <a className={`${btnOutlineLg} mt-auto self-end`} href="#waitlist">
                Start For Free
              </a>
            </article>

            <article className="price-card featured-plan featured-plan-shell relative grid min-h-[390px] rotate-1 content-start gap-4 rounded-wobbly-card border-[3px] border-brand-black bg-brand-yellow p-[1.2rem] shadow-brand-big transition-[box-shadow,transform] duration-[120ms] ease-in-out hover:-translate-x-px hover:-translate-y-px hover:rotate-0">
              <p className={tagOutline}>Membership</p>
              <h3 className="text-[2.6rem] font-bold text-brand-black">
                Nu 499<span className="font-secondary text-base font-normal text-brand-black/72">/month</span>
              </h3>
              <ul className="grid list-none gap-[0.55rem] text-brand-black/72">
                <li className="relative pl-5 before:absolute before:left-0 before:font-primary before:leading-none before:text-brand-green before:content-['+']">Membership priorities</li>
                <li className="relative pl-5 before:absolute before:left-0 before:font-primary before:leading-none before:text-brand-green before:content-['+']">Free delivery on all orders</li>
                <li className="relative pl-5 before:absolute before:left-0 before:font-primary before:leading-none before:text-brand-green before:content-['+']">Monthly dietician consultation</li>
                <li className="relative pl-5 before:absolute before:left-0 before:font-primary before:leading-none before:text-brand-green before:content-['+']">Priority stock – first pick of seasonal produce</li>
                <li className="relative pl-5 before:absolute before:left-0 before:font-primary before:leading-none before:text-brand-green before:content-['+']">Personalized meal planner</li>
              </ul>
              <a className={`${btnPrimaryLg} mt-auto self-end`} href="#waitlist">
                Become a Member
              </a>
            </article>
          </div>
        </section>

        <section
          className={`plan-builder plan-builder-shell relative mb-[clamp(4rem,8vw,6rem)] grid grid-cols-1 items-center gap-[clamp(2rem,7vw,5rem)] border-y-4 border-dashed border-brand-black/42 py-[clamp(2.8rem,6vw,4.8rem)] sm:grid-cols-[minmax(0,0.95fr)_minmax(300px,0.78fr)] ${sectionShell}`}
        >
          <div className="plan-copy grid gap-4">
            <p className={tagOutline}>Zama app</p>
            <h2 className="font-primary text-[clamp(2.35rem,5vw,5rem)] font-bold leading-[1.02] text-brand-black">Build your plan the way you eat.</h2>
            <p className="max-w-[560px] text-[1.25rem] text-brand-black/72">
              Pick your box, set delivery days, swap items, and see the farmer
              story behind each ingredient before it reaches your kitchen.
            </p>
            <div className="store-row mt-[0.4rem] flex flex-wrap items-center gap-[0.7rem]">
              <a
                className="store-badge inline-flex items-center gap-[0.55rem] rounded-[10px] bg-brand-black px-[0.9rem] py-[0.5rem] text-white shadow-[2px_2px_0_0_rgb(38_38_38/0.35)] transition-transform duration-[120ms] ease-in-out hover:-translate-y-px"
                href="#waitlist"
                aria-label="Download on the App Store"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M16.365 1.43c0 1.14-.393 2.108-1.18 2.903-.94.95-2.03 1.428-3.15 1.334-.045-1.098.4-2.19 1.15-2.94.83-.83 2.14-1.32 3.18-1.297zM20.5 17.14c-.44 1.02-.66 1.48-1.24 2.38-.8 1.26-1.94 2.83-3.35 2.84-1.25.02-1.57-.82-3.27-.81-1.69.01-2.05.83-3.3.81-1.4-.02-2.48-1.42-3.28-2.68-2.25-3.53-2.49-7.67-1.1-9.87.98-1.56 2.53-2.47 3.98-2.47 1.48 0 2.4.82 3.63.82 1.19 0 1.9-.82 3.6-.82 1.3 0 2.68.71 3.66 1.94-3.22 1.76-2.7 6.35.11 7.7z" />
                </svg>
                <span className="grid text-left leading-[1.05]">
                  <span className="text-[0.62rem] uppercase tracking-wide text-white/78">Download on the</span>
                  <span className="text-[1.02rem] font-secondary font-medium">App Store</span>
                </span>
              </a>
              <a
                className="store-badge inline-flex items-center gap-[0.55rem] rounded-[10px] bg-brand-black px-[0.9rem] py-[0.5rem] text-white shadow-[2px_2px_0_0_rgb(38_38_38/0.35)] transition-transform duration-[120ms] ease-in-out hover:-translate-y-px"
                href="#waitlist"
                aria-label="Get it on Google Play"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4.5 2.75 14.6 12 4.5 21.25c-.3-.25-.5-.63-.5-1.06V3.8c0-.42.2-.8.5-1.05z" fill="#00D2FF" />
                  <path d="M17.6 9.1 14.6 12l3 2.9 3.6-2.08c.66-.38.66-1.34 0-1.72z" fill="#FFC400" />
                  <path d="M4.5 2.75c.2-.17.5-.24.82-.06l12.28 7.1-3 2.9z" fill="#00F076" />
                  <path d="M4.5 21.25c.2.17.5.24.82.06l12.28-7.1-3-2.9z" fill="#FF3A44" />
                </svg>
                <span className="grid text-left leading-[1.05]">
                  <span className="text-[0.62rem] uppercase tracking-wide text-white/78">Get it on</span>
                  <span className="text-[1.02rem] font-secondary font-medium">Google Play</span>
                </span>
              </a>
            </div>
          </div>

          <div
            className="app-preview app-preview-shell relative grid gap-[0.9rem] rotate-[1.2deg] rounded-[34px_24px_38px_22px/26px_38px_24px_34px] border-4 border-brand-black p-4 shadow-brand-big"
            aria-label="Zama mobile ordering preview"
          >
            <div className="app-topbar flex items-center justify-between rounded-wobbly-md border-[3px] border-brand-black bg-brand-white p-3">
              <span className="h-[34px] w-[34px] rounded-full border-[3px] border-brand-black bg-brand-yellow"></span>
              <strong className="text-brand-black">Today</strong>
              <small className="text-brand-black">Nu 520</small>
            </div>
            <div className="delivery-card rounded-wobbly-md border-[3px] border-brand-black bg-brand-yellow p-4">
              <p className="text-brand-black/72">Next delivery</p>
              <h3 className="my-[0.2rem] text-[1.5rem] font-bold text-brand-black">Vegetable Box + Weight Loss Kit</h3>
              <span className="text-brand-orange">Friday, 8:00 AM - 10:00 AM</span>
            </div>
            <div className="mini-map mini-map-shell relative flex min-h-[116px] items-center justify-between overflow-hidden rounded-[24px_16px_28px_18px/18px_28px_16px_24px] border-[3px] border-dashed border-brand-black p-4">
              <span className="relative z-[1] rounded-wobbly border-[3px] border-brand-black bg-brand-white px-[0.74rem] py-[0.4rem] text-brand-black">Farm</span>
              <i className="mini-map-dot relative z-[1] h-[18px] w-[18px] rounded-full border-[3px] border-brand-black bg-brand-orange"></i>
              <span className="relative z-[1] rounded-wobbly border-[3px] border-brand-black bg-brand-white px-[0.74rem] py-[0.4rem] text-brand-black">Kitchen</span>
            </div>
            <div className="app-list grid gap-[0.45rem] rounded-wobbly-md border-[3px] border-brand-black bg-brand-white p-[0.9rem]">
              <p className="flex items-center gap-2 text-brand-black">
                <span className="h-3 w-3 rounded-full border-2 border-brand-black bg-brand-orange"></span> Punakha greens
              </p>
              <p className="flex items-center gap-2 text-brand-black">
                <span className="h-3 w-3 rounded-full border-2 border-brand-black bg-brand-orange"></span> Paro potatoes
              </p>
              <p className="flex items-center gap-2 text-brand-black">
                <span className="h-3 w-3 rounded-full border-2 border-brand-black bg-brand-orange"></span> Datshi kit
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className={`site-footer footer-watermark relative grid grid-cols-1 gap-8 overflow-hidden border-t-4 border-dashed border-brand-black/42 pt-8 pb-6 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr] ${sectionShell}`}>
        <img
          className="footer-watermark-logo pointer-events-none absolute bottom-[-8%] left-1/2 z-0 w-[min(1200px,150%)] max-w-none -translate-x-1/2 opacity-[0.14]"
          src="assets/jaggle_logo.png"
          alt=""
          aria-hidden="true"
        />
        <div className="relative z-[1] sm:col-span-2 lg:col-span-1">
          <img className="mb-2 w-[88px] -rotate-2" src="assets/zama_logo.png" alt="Zama" />
          <p className="text-brand-black/72">
            Fresh foods from Bhutanese farms at your doorstep.
          </p>
          <p className="mt-1 text-brand-black/72">Thimphu, Bhutan</p>
          <div className="mt-3 flex gap-[0.55rem]" aria-label="Social links">
            <a className="grid h-8 w-8 place-items-center rounded-full border-2 border-brand-black bg-brand-white text-brand-black transition-transform duration-[120ms] ease-in-out hover:-translate-y-px hover:bg-brand-yellow" href="#top" aria-label="Zama on Facebook">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.9h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94z" /></svg>
            </a>
            <a className="grid h-8 w-8 place-items-center rounded-full border-2 border-brand-black bg-brand-white text-brand-black transition-transform duration-[120ms] ease-in-out hover:-translate-y-px hover:bg-brand-yellow" href="#top" aria-label="Zama on Instagram">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" /></svg>
            </a>
            <a className="grid h-8 w-8 place-items-center rounded-full border-2 border-brand-black bg-brand-white text-brand-black transition-transform duration-[120ms] ease-in-out hover:-translate-y-px hover:bg-brand-yellow" href="#top" aria-label="Zama on X">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-7.6 8.7L23.3 22H16.7l-5.2-6.8L5.6 22H2.4l8.1-9.3L1.6 2h6.8l4.7 6.2L18.9 2zm-1.2 18h1.7L7.4 4H5.6l12.1 16z" /></svg>
            </a>
          </div>
        </div>
        <nav className="relative z-[1] grid content-start gap-[0.45rem]" aria-label="Footer navigation - company">
          <p className="mb-1 text-[0.92rem] font-bold text-brand-black">Company</p>
          <a className="footer-link relative text-brand-green" href="#top">About Zama</a>
          <a className="footer-link relative text-brand-green" href="#farmers">Our Farms</a>
          <a className="footer-link relative text-brand-green" href="#top">Sustainability</a>
          <a className="footer-link relative text-brand-green" href="#top">Careers</a>
          <a className="footer-link relative text-brand-green" href="#top">Press</a>
        </nav>
        <div className="relative z-[1] grid content-start gap-[0.45rem]" aria-label="Footer navigation - support">
          <p className="mb-1 text-[0.92rem] font-bold text-brand-black">Support</p>
          <a className="footer-link relative text-brand-green" href="#how-it-works">How it Works</a>
          <a className="footer-link relative text-brand-green" href="#farmers">Farm Partnership</a>
          <a className="footer-link relative text-brand-green" href="#top">Delivery Areas</a>
          <a className="footer-link relative text-brand-green" href="mailto:hello@zama.bt">Contact Us</a>
          <a className="footer-link relative text-brand-green" href="#top">Privacy Policy</a>
        </div>
        <div className="footer-bottom relative z-[1] col-span-full mt-2 flex flex-col gap-[0.4rem] border-t-2 border-dashed border-brand-black/30 pt-4 text-[0.85rem] text-brand-black/56 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Zama Technologies, Thimphu, Bhutan. All Rights Reserved.</p>
          <p className="flex items-center gap-[0.4rem]">
            Powered by Jaggle AI
            <img className="h-4 w-auto" src="assets/jaggle_mark.png" alt="Jaggle AI" />
          </p>
        </div>
      </footer>
    </>
  );
}

export default App;
