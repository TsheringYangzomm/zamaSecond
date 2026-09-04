import { ArrowIcon } from "../ui/icons";
import { FarmerAvatar } from "./farmer-avatar";
import type { Farmer } from "../../data/farmers";
import { formatPartnerSince } from "../../cms/partner-since";

export function FarmerCard({ farmer, image, detailed }: { farmer: Farmer; image?: string; detailed?: boolean }) {
  return (
    <article className={`farmer-card grid h-full w-full min-w-0 overflow-hidden rounded-[28px_22px_24px_20px/22px_24px_20px_26px] border-3 border-brand-forest bg-brand-warm-white shadow-brand transition-shadow duration-150 hover:shadow-brand-hover ${detailed ? "sm:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)]" : ""}`}>
      {image ? (
        <img
          src={image}
          alt={farmer.name}
          className={`w-full object-cover ${detailed ? "h-56 sm:h-full sm:min-h-[280px] rounded-t-[25px_19px_0_0] sm:rounded-t-none sm:rounded-l-[25px_19px_0_0]" : "h-48 rounded-t-[25px_19px_0_0] sm:h-56"}`}
        />
      ) : (
        <FarmerAvatar name={farmer.name} className={`w-full ${detailed ? "h-56 sm:h-[280px] rounded-t-[25px_19px_0_0] sm:rounded-t-none sm:rounded-l-[25px_19px_0_0]" : "h-48 rounded-t-[25px_19px_0_0] sm:h-56"}`} />
      )}

      <div className={`flex flex-1 flex-col gap-3.5 ${detailed ? "p-5 sm:p-6 sm:gap-4" : "p-4 sm:p-5"}`}>
        <div className="grid gap-1">
          <h3 className={`font-primary font-bold leading-[1.05] text-brand-black ${detailed ? "text-[clamp(1.4rem,2.4vw,1.8rem)]" : "text-[clamp(1.25rem,2vw,1.55rem)]"}`}>{farmer.name}</h3>
          <p className={`text-brand-black/64 ${detailed ? "text-base" : "text-sm"}`}>{farmer.location}</p>
        </div>

        {detailed && (
          <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-brand-black/56">
            <span>{farmer.dzongkhag} Dzongkhag</span>
            <span aria-hidden="true" className="text-brand-forest/25">·</span>
            <span>{farmer.yearsFarming} years farming</span>
            <span aria-hidden="true" className="text-brand-forest/25">·</span>
            <span>{farmer.products.length} product{farmer.products.length === 1 ? "" : "s"}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {farmer.products.map((product) => (
            <span className={`rounded-full border-2 border-brand-forest/20 bg-brand-white font-bold text-brand-black ${detailed ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs"}`} key={product}>{product}</span>
          ))}
        </div>

        <div className={`flex flex-wrap items-center gap-2 font-bold text-brand-green-ink ${detailed ? "text-sm" : "text-xs"}`}>
          <span className="inline-flex items-center gap-1 rounded-full border-2 border-brand-forest/14 bg-brand-leaf/10 px-2.5 py-0.5">✓ Verified Farmer</span>
          <span className="text-brand-black/46">Partner since {formatPartnerSince(farmer.partnerSince)}</span>
        </div>

        {detailed && (
          <div className="flex flex-wrap gap-1.5">
            {farmer.tags.map((tag) => (
              <span className="rounded-full border-2 border-brand-forest/12 bg-brand-mint px-3 py-1 text-sm font-bold text-brand-forest" key={tag}>{tag}</span>
            ))}
          </div>
        )}

        {detailed ? (
          <>
            <p className="border-t-2 border-dashed border-brand-forest/12 pt-3 text-base leading-[1.5] text-brand-black/68">
              {farmer.bio}
            </p>
            {farmer.story ? (
              <div className="grid gap-2 border-t-2 border-dashed border-brand-forest/12 pt-3">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Their story</p>
                <p className="text-base leading-[1.5] text-brand-black/68">{farmer.story}</p>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <p className="mt-auto border-t-2 border-dashed border-brand-forest/12 pt-3 text-sm italic leading-[1.5] text-brand-black/68">
              &ldquo;{farmer.seasonalUpdate || farmer.bio}&rdquo;
            </p>
            <a className="inline-flex w-fit items-center gap-1.5 text-sm font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" href={`#/farmers?farmer=${farmer.id}`}>
              {farmer.story ? "Read their story" : "Learn more"}
              <ArrowIcon className="!h-4 !w-4" />
            </a>
          </>
        )}
      </div>
    </article>
  );
}
