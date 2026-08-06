import { OutlineTag } from "../ui/tag";
import { useContent } from "../../cms/content-context";
import type { ShopProduct } from "./shop-utils";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-sm leading-none text-brand-orange-ink" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span aria-hidden="true" className={star <= rating ? "" : "text-brand-black/20"} key={star}>★</span>
      ))}
    </span>
  );
}

function initials(name: string) {
  return name.split(" ").map((word) => word[0]).slice(0, 2).join("").toUpperCase();
}

export function ReviewsSection({ product }: { product: ShopProduct }) {
  const { reviews: reviewsByProduct } = useContent();
  const reviews = reviewsByProduct[product.id] ?? [];
  if (reviews.length === 0) return null;

  const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

  return (
    <aside className="grid content-start gap-4 border-t-2 border-dashed border-brand-forest/26 pt-6" aria-labelledby="reviews-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <OutlineTag>Reviews & feedback</OutlineTag>
          <h2 id="reviews-title" className="font-primary text-[clamp(1.6rem,3vw,2.2rem)] font-bold leading-none text-brand-black">What previous buyers say</h2>
          <p className="text-sm text-brand-black/64">Sample reviews for the launch preview.</p>
        </div>
        <div className="grid min-w-36 place-items-center gap-1 rounded-wobbly-md border-2 border-brand-forest/24 bg-brand-white px-4 py-3 text-center shadow-brand-soft">
          <strong className="font-primary text-[clamp(1.8rem,3vw,2.4rem)] font-bold leading-none text-brand-orange-ink">{average.toFixed(1)}</strong>
          <Stars rating={Math.round(average)} />
          <span className="text-xs text-brand-black/64">Based on {reviews.length} review{reviews.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      <div className="grid content-start items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => (
          <article className="review-card grid content-start gap-2 rounded-wobbly-md border-2 border-brand-forest/22 bg-brand-white p-4 shadow-brand-soft" key={review.id} aria-label={`${review.rating} star review by ${review.author}`}>
            <div className="flex items-start justify-between gap-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-brand-forest bg-brand-yellow text-sm font-bold text-brand-black" aria-hidden="true">{initials(review.author)}</span>
              <Stars rating={review.rating} />
            </div>
            <div className="grid gap-0.5">
              <h3 className="font-secondary text-base font-bold leading-tight text-brand-black">{review.title}</h3>
              <p className="text-xs text-brand-black/64">{review.author} · {review.location} · {review.date}{review.verified ? " · Verified buyer" : ""}</p>
            </div>
            <p className="text-sm leading-[1.5] text-brand-black/72">{review.body}</p>
          </article>
        ))}
      </div>
    </aside>
  );
}
