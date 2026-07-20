import { useState } from "react";
import { farmerStories } from "../../data/landing";
import { OutlineLink } from "../../components/ui/action-link";
import { OutlineTag, StatusBadge } from "../../components/ui/tag";
import { sectionShell, sectionTitleCompact } from "../../components/ui/styles";

const storySelectorTones = [
  "bg-brand-buff",
  "bg-brand-mint",
  "bg-brand-warm-white",
] as const;

export function FarmersSection() {
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const activeStory = farmerStories[activeStoryIndex];

  function changeStory(step: number) {
    setActiveStoryIndex((currentIndex) => (currentIndex + step + farmerStories.length) % farmerStories.length);
  }

  return (
    <section className="farm-story-surface full-bleed-safe deferred-section farmers relative overflow-hidden py-[clamp(3rem,6vw,5rem)]" id="farmers" aria-labelledby="farmer-title">
      <div className={`relative z-[1] grid gap-6 ${sectionShell}`}>
        <div className="split-heading section-heading flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div>
            <OutlineTag>Our farmers</OutlineTag>
            <h2 id="farmer-title" className={`${sectionTitleCompact} text-balance text-brand-green-ink`}>Show where every ingredient comes from.</h2>
          </div>
          <p className="max-w-120 text-pretty text-[1.05rem] text-brand-black/72">Explore the chapters Zama will verify before publishing a farmer profile, seasonal claim, or sourcing story.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)] lg:items-stretch" role="region" aria-roledescription="carousel" aria-label="Farmer story previews">
          <figure className="farmer-portrait relative min-h-115 overflow-hidden rounded-[34px_22px_44px_26px/26px_44px_22px_34px] border-4 border-brand-forest bg-brand-buff shadow-brand-big">
            <img className="h-full min-h-115 w-full object-cover [filter:saturate(0.82)_contrast(1.05)] transition-transform duration-300 ease-in-out" src="assets/farmer.webp" alt="Illustration representing a future verified farmer story" loading="lazy" decoding="async" width="720" height="560" />
            <span className="absolute top-4 left-4 rounded-wobbly-tag border-2 border-brand-forest bg-brand-yellow px-3 py-2 text-xs font-bold text-brand-black">Field story preview</span>
            <span className="absolute top-4 right-4 rounded-full border-2 border-brand-forest bg-brand-warm-white px-3 py-2 text-xs font-bold tabular-nums text-brand-forest">0{activeStoryIndex + 1} / 0{farmerStories.length}</span>
            <figcaption key={activeStory.title} className="farmer-story-active absolute right-4 bottom-4 left-4 grid gap-1 rotate-[-1deg] rounded-wobbly-md border-3 border-brand-forest bg-brand-warm-white/96 p-4 shadow-brand">
              <span className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-brand-orange-ink">{activeStory.eyebrow}</span>
              <strong className="text-balance font-primary text-[clamp(1.45rem,3vw,2.25rem)] leading-[1.02] text-brand-black">{activeStory.title}</strong>
              <p className="text-pretty text-sm text-brand-black/68">{activeStory.summary}</p>
            </figcaption>
          </figure>

          <aside className="source-map-shell relative grid min-w-0 content-start gap-4 overflow-hidden rounded-[28px_42px_24px_38px/40px_24px_42px_26px] border-4 border-brand-forest bg-brand-forest p-5 text-brand-warm-white shadow-brand-big sm:p-6" aria-label="Selected farmer story">
            <div className="relative z-[1] grid gap-1">
              <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-brand-yellow">Farmer notebook · launch preview</span>
              <h3 className="text-balance font-primary text-[clamp(1.8rem,8vw,2.7rem)] font-bold leading-[1.02]">A field story, one verified chapter at a time.</h3>
              <p className="text-pretty text-sm text-brand-warm-white/72">Use the controls to preview what each published story will need to prove.</p>
            </div>

            <article key={activeStory.title} className={`farmer-story-active relative z-[1] grid gap-3 rounded-wobbly-md border-3 border-dashed border-brand-yellow/70 ${storySelectorTones[activeStoryIndex]} p-4 text-brand-black shadow-brand`} id="farmer-story-panel">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Chapter 0{activeStoryIndex + 1}</span>
                <StatusBadge tone="pending">{activeStory.status}</StatusBadge>
              </div>
              <div className="grid gap-1">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">{activeStory.eyebrow}</p>
                <h4 className="text-balance font-primary text-[clamp(1.65rem,5vw,2.35rem)] font-bold leading-[1.02] text-brand-black">{activeStory.title}</h4>
                <p className="text-pretty font-bold text-brand-black/72">{activeStory.summary}</p>
              </div>
              <div className="grid gap-1 border-t-2 border-dashed border-brand-forest/24 pt-3">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">What Zama will verify</p>
                <p className="text-pretty text-sm leading-[1.5] text-brand-black/72">{activeStory.body}</p>
              </div>
            </article>

            <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">Story {activeStoryIndex + 1} of {farmerStories.length}: {activeStory.title}</p>

            <div className="relative z-[1] grid grid-cols-2 gap-3">
              <button className="min-h-11 touch-manipulation rounded-wobbly-md border-2 border-brand-yellow bg-brand-warm-white px-4 py-2 font-bold text-brand-forest shadow-brand-tight transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-brand-yellow focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-yellow focus-visible:outline-offset-3" type="button" onClick={() => changeStory(-1)} aria-controls="farmer-story-panel">← Previous</button>
              <button className="min-h-11 touch-manipulation rounded-wobbly-md border-2 border-brand-yellow bg-brand-yellow px-4 py-2 font-bold text-brand-black shadow-brand-tight transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-brand-warm-white focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-yellow focus-visible:outline-offset-3" type="button" onClick={() => changeStory(1)} aria-controls="farmer-story-panel">Next →</button>
            </div>

            <div className="relative z-[1] grid gap-2 sm:grid-cols-3" aria-label="Choose a farmer story">
              {farmerStories.map((story, index) => (
                <button className={`grid min-h-18 touch-manipulation content-start gap-1 rounded-wobbly-md border-2 border-dashed px-3 py-2 text-left transition-[background-color,transform] duration-150 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-yellow focus-visible:outline-offset-3 ${activeStoryIndex === index ? "border-brand-yellow bg-brand-yellow text-brand-black" : "border-brand-warm-white/42 bg-brand-warm-white/10 text-brand-warm-white hover:bg-brand-warm-white/18"}`} type="button" key={story.title} onClick={() => setActiveStoryIndex(index)} aria-pressed={activeStoryIndex === index} aria-controls="farmer-story-panel">
                  <span className={`text-xs font-bold tabular-nums ${activeStoryIndex === index ? "text-brand-orange-ink" : "text-brand-yellow"}`}>0{index + 1}</span>
                  <span className="font-primary text-sm font-bold leading-[1.05]">{story.title}</span>
                </button>
              ))}
            </div>

            <div className="relative z-[1] mt-1">
              <OutlineLink href="mailto:hello@zama.bt?subject=Zama%20farm%20partnership">Become a Farm Partner</OutlineLink>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
