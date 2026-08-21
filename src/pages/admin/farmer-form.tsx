import { useState, type FormEvent } from "react";
import { btnOutlineSm, btnPrimarySm } from "../../components/ui/styles";
import { farmerDzongkhags } from "../../data/farmers";
import type { FarmerPrivateInfoRow, FarmerRow, FarmerSeasonalUpdateRow, FarmerStoryRow } from "../../cms/types";
import { Checkbox, Field, ImagePicker, TextArea, TextInput, selectClasses } from "./admin-fields";

export function blankFarmer(id: string): FarmerRow {
  return {
    id,
    name: "",
    location: "",
    dzongkhag: "Thimphu",
    products: [],
    tags: [],
    years_farming: 0,
    bio: "",
    verified: false,
    partner_since: null,
    image: "",
    sort_order: 0,
    published: true,
  };
}

export function blankFarmerPrivateInfo(farmerId: string): FarmerPrivateInfoRow {
  return {
    farmer_id: farmerId,
    village: "",
    farm_size: "",
    farming_practices: "",
    contact_phone: "",
    contact_email: "",
    alternative_contact: "",
    preferred_contact_method: "",
    admin_notes: "",
  };
}

export function blankFarmerStory(farmerId: string): FarmerStoryRow {
  return {
    farmer_id: farmerId,
    content: "",
    published: false,
  };
}

export function blankFarmerSeasonalUpdate(farmerId: string): FarmerSeasonalUpdateRow {
  return {
    farmer_id: farmerId,
    season: String(new Date().getFullYear()),
    content: "",
    published: false,
  };
}

type FarmerDraft = Omit<FarmerRow, "products" | "tags" | "years_farming" | "partner_since"> & {
  products: string;
  tags: string;
  years_farming: string;
  partner_since: string;
};

function toDraft(row: FarmerRow): FarmerDraft {
  return {
    ...row,
    products: row.products.join(", "),
    tags: row.tags.join(", "),
    years_farming: String(row.years_farming),
    partner_since: row.partner_since == null ? "" : String(row.partner_since),
  };
}

function fromDraft(draft: FarmerDraft): FarmerRow {
  const years = Number(draft.years_farming.trim());
  const partner = Number(draft.partner_since.trim());
  return {
    ...draft,
    products: draft.products.split(",").map((item) => item.trim()).filter(Boolean),
    tags: draft.tags.split(",").map((item) => item.trim()).filter(Boolean),
    years_farming: Number.isNaN(years) ? 0 : years,
    partner_since: draft.partner_since.trim() === "" || Number.isNaN(partner) ? null : partner,
  };
}

export function FarmerForm({ initial, privateInfo, storyInfo, seasonalInfo, privateEnabled, storyEnabled, seasonalEnabled, onSave, onCancel }: {
  initial: FarmerRow;
  privateInfo?: FarmerPrivateInfoRow | null;
  storyInfo?: FarmerStoryRow | null;
  seasonalInfo?: FarmerSeasonalUpdateRow | null;
  privateEnabled: boolean;
  storyEnabled: boolean;
  seasonalEnabled: boolean;
  onSave: (row: FarmerRow, privateRow: FarmerPrivateInfoRow | null, storyRow: FarmerStoryRow | null, seasonalRow: FarmerSeasonalUpdateRow | null) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<FarmerDraft>(() => toDraft(initial));
  const [privateDraft, setPrivateDraft] = useState<FarmerPrivateInfoRow>(() => privateInfo ?? blankFarmerPrivateInfo(initial.id));
  const [storyDraft, setStoryDraft] = useState<FarmerStoryRow>(() => storyInfo ?? blankFarmerStory(initial.id));
  const [seasonalDraft, setSeasonalDraft] = useState<FarmerSeasonalUpdateRow>(() => seasonalInfo ?? blankFarmerSeasonalUpdate(initial.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FarmerDraft>(key: K, value: FarmerDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function setPrivate<K extends keyof FarmerPrivateInfoRow>(key: K, value: FarmerPrivateInfoRow[K]) {
    setPrivateDraft((current) => ({ ...current, [key]: value }));
  }

  function setStory<K extends keyof FarmerStoryRow>(key: K, value: FarmerStoryRow[K]) {
    setStoryDraft((current) => ({ ...current, [key]: value }));
  }

  function setSeasonal<K extends keyof FarmerSeasonalUpdateRow>(key: K, value: FarmerSeasonalUpdateRow[K]) {
    setSeasonalDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) {
      setError("Name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave(
        fromDraft(draft),
        privateEnabled ? privateDraft : null,
        storyEnabled ? storyDraft : null,
        seasonalEnabled ? seasonalDraft : null,
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the farmer.");
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-5 rounded-wobbly-card border-3 border-brand-forest bg-brand-warm-white p-5 shadow-brand" onSubmit={handleSubmit} aria-label="Farmer form">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-primary text-2xl font-bold text-brand-green-ink">{initial.name ? `Edit ${initial.name}` : "New farmer"}</h2>
        <span className="rounded-full border-2 border-brand-forest bg-brand-white px-3 py-1 text-xs font-bold text-brand-black">{initial.id}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name *" htmlFor="farmer-name"><TextInput id="farmer-name" required value={draft.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Location" htmlFor="farmer-location" hint="e.g. Paro, Bhutan"><TextInput id="farmer-location" value={draft.location} onChange={(e) => set("location", e.target.value)} /></Field>
        <Field label="Dzongkhag" htmlFor="farmer-dzongkhag">
          <select id="farmer-dzongkhag" className="min-h-11.5 w-full rounded-[18px_12px_16px_10px/12px_18px_10px_16px] border-3 border-brand-forest bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20" value={draft.dzongkhag} onChange={(e) => set("dzongkhag", e.target.value)}>
            {farmerDzongkhags.map((dzongkhag) => <option key={dzongkhag} value={dzongkhag}>{dzongkhag}</option>)}
          </select>
        </Field>
        <Field label="Years farming" htmlFor="farmer-years" hint="e.g. 18"><TextInput id="farmer-years" type="number" min="0" value={draft.years_farming} onChange={(e) => set("years_farming", e.target.value)} /></Field>
        <Field label="Partner since" htmlFor="farmer-partner" hint="Year, e.g. 2025"><TextInput id="farmer-partner" type="number" min="2000" max="2100" value={draft.partner_since} onChange={(e) => set("partner_since", e.target.value)} /></Field>
      </div>

      <Field label="Products (comma-separated)" htmlFor="farmer-products"><TextInput id="farmer-products" value={draft.products} onChange={(e) => set("products", e.target.value)} /></Field>
      <Field label="Tags (comma-separated)" htmlFor="farmer-tags" hint="Vegetable, Fruit, Herbs, Organic, Seasonal"><TextInput id="farmer-tags" value={draft.tags} onChange={(e) => set("tags", e.target.value)} /></Field>
      <Field label="Bio" htmlFor="farmer-bio"><TextArea id="farmer-bio" value={draft.bio} onChange={(e) => set("bio", e.target.value)} /></Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <ImagePicker label="Image" image={draft.image} onChange={(url) => set("image", url)} folder="farmers" id={draft.id} />
        <div className="grid content-start gap-4">
          <Field label="Sort order" htmlFor="farmer-sort" hint="Lower numbers appear first.">
            <TextInput id="farmer-sort" type="number" value={String(draft.sort_order)} onChange={(e) => set("sort_order", Number(e.target.value))} />
          </Field>
          <Checkbox checked={draft.verified} onChange={(next) => set("verified", next)} label="Verified partner" />
          <Checkbox checked={draft.published} onChange={(next) => set("published", next)} label="Published (visible on the site)" />
        </div>
      </div>

      <div className="grid gap-4 rounded-wobbly-card border-3 border-dashed border-brand-green-ink/40 bg-brand-mint/25 p-4">
        <div className="grid gap-1">
          <h3 className="font-primary text-lg font-bold text-brand-green-ink">Farmer storytelling</h3>
          <p className="text-xs font-semibold text-brand-black/60">The latest published seasonal update appears as a quote on the landing page, and a published story is linked with &ldquo;Read their story&rdquo;. Save drafts here anytime — they stay private until you publish them.</p>
        </div>

        {storyEnabled ? (
          <>
            <Field label="Farmer story" htmlFor="farmer-story" hint="A longer narrative. Linked from the landing page as &ldquo;Read their story&rdquo;.">
              <TextArea id="farmer-story" rows={5} value={storyDraft.content} onChange={(e) => setStory("content", e.target.value)} />
            </Field>
            <Checkbox checked={storyDraft.published} onChange={(next) => setStory("published", next)} label="Show story on the site" />
          </>
        ) : (
          <p className="rounded-wobbly-md border-2 border-dashed border-brand-forest/30 bg-brand-white px-3 py-2 text-xs font-semibold text-brand-black/64">
            Farmer stories require the <code className="font-bold">farmer_stories</code> table. Run <code className="font-bold">supabase/farmer-story-schema.sql</code> to enable them.
          </p>
        )}

        {seasonalEnabled ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Season" htmlFor="farmer-season" hint="e.g. 2026. Each season is kept, so previous updates are preserved.">
                <TextInput id="farmer-season" value={seasonalDraft.season} onChange={(e) => setSeasonal("season", e.target.value)} />
              </Field>
            </div>
            <Field label="Seasonal update" htmlFor="farmer-seasonal-update" hint="A short quote. Only the latest published update shows on the landing page.">
              <TextArea id="farmer-seasonal-update" rows={3} value={seasonalDraft.content} onChange={(e) => setSeasonal("content", e.target.value)} />
            </Field>
            <Checkbox checked={seasonalDraft.published} onChange={(next) => setSeasonal("published", next)} label="Publish this update (show on the landing page)" />
          </>
        ) : (
          <p className="rounded-wobbly-md border-2 border-dashed border-brand-forest/30 bg-brand-white px-3 py-2 text-xs font-semibold text-brand-black/64">
            Seasonal updates require the <code className="font-bold">farmer_seasonal_updates</code> table. Run <code className="font-bold">supabase/farmer-story-schema.sql</code> to enable them.
          </p>
        )}

        <div className="grid gap-2 rounded-wobbly-md border-2 border-dashed border-brand-forest/30 bg-brand-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Landing page preview</p>
          {seasonalDraft.content.trim() ? (
            <p className="italic leading-[1.5] text-brand-black/68">&ldquo;{seasonalDraft.content}&rdquo;</p>
          ) : (
            <p className="italic leading-[1.5] text-brand-black/68">&ldquo;{draft.bio}&rdquo;</p>
          )}
          {storyDraft.content.trim() && storyDraft.published ? (
            <a className="inline-flex w-fit items-center gap-1.5 text-sm font-bold text-brand-green-ink underline decoration-dashed underline-offset-4" href="#/farmers">Read their story →</a>
          ) : null}
          {seasonalDraft.content.trim() && !seasonalDraft.published ? (
            <p className="text-xs font-semibold text-brand-black/52">Draft only — not shown on the landing page until this update is published.</p>
          ) : null}
          {storyDraft.content.trim() && !storyDraft.published ? (
            <p className="text-xs font-semibold text-brand-black/52">Story saved as a draft — not linked until &ldquo;Show story on the site&rdquo; is checked.</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 rounded-wobbly-card border-3 border-dashed border-brand-orange-ink/40 bg-brand-buff/50 p-4">
        <div className="grid gap-1">
          <h3 className="font-primary text-lg font-bold text-brand-orange-ink">Private — admin only</h3>
          <p className="text-xs font-semibold text-brand-black/60">These details are never shown on the public site and can only be seen by Zama admins.</p>
        </div>

        {privateEnabled ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Village" htmlFor="farmer-village" hint="e.g. Dotey">
                <TextInput id="farmer-village" value={privateDraft.village} onChange={(e) => setPrivate("village", e.target.value)} />
              </Field>
              <Field label="Farm size" htmlFor="farmer-farm-size" hint="e.g. 3 acres">
                <TextInput id="farmer-farm-size" value={privateDraft.farm_size} onChange={(e) => setPrivate("farm_size", e.target.value)} />
              </Field>
              <Field label="Farming practices" htmlFor="farmer-farming-practices">
                <TextArea id="farmer-farming-practices" rows={2} value={privateDraft.farming_practices} onChange={(e) => setPrivate("farming_practices", e.target.value)} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone number" htmlFor="farmer-contact-phone">
                <TextInput id="farmer-contact-phone" type="tel" value={privateDraft.contact_phone} onChange={(e) => setPrivate("contact_phone", e.target.value)} />
              </Field>
              <Field label="Email" htmlFor="farmer-contact-email">
                <TextInput id="farmer-contact-email" type="email" value={privateDraft.contact_email} onChange={(e) => setPrivate("contact_email", e.target.value)} />
              </Field>
              <Field label="Alternative contact" htmlFor="farmer-alternative-contact">
                <TextInput id="farmer-alternative-contact" value={privateDraft.alternative_contact} onChange={(e) => setPrivate("alternative_contact", e.target.value)} />
              </Field>
              <Field label="Preferred contact method" htmlFor="farmer-preferred-contact">
                <select id="farmer-preferred-contact" className={selectClasses} value={privateDraft.preferred_contact_method} onChange={(e) => setPrivate("preferred_contact_method", e.target.value)}>
                  <option value="">Select a method</option>
                  <option value="Phone">Phone</option>
                  <option value="Email">Email</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Alternative contact">Alternative contact</option>
                </select>
              </Field>
            </div>

            <Field label="Admin notes" htmlFor="farmer-admin-notes">
              <TextArea id="farmer-admin-notes" rows={3} value={privateDraft.admin_notes} onChange={(e) => setPrivate("admin_notes", e.target.value)} />
            </Field>
          </>
        ) : (
          <p className="rounded-wobbly-md border-2 border-dashed border-brand-forest/30 bg-brand-white px-3 py-2 text-xs font-semibold text-brand-black/64">
            Private farmer details require the <code className="font-bold">farmer_private_info</code> table. Run <code className="font-bold">supabase/farmer-private-schema.sql</code> to enable them.
          </p>
        )}
      </div>

      {error ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 px-3 py-2 text-sm font-semibold text-brand-black" role="alert">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button className={btnPrimarySm} type="submit" disabled={busy}>{busy ? "Saving..." : "Save farmer"}</button>
        <button className={btnOutlineSm} type="button" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}
