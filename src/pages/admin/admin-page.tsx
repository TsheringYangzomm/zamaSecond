import { useState } from "react";
import { useAdminAuth } from "../../admin/admin-auth";
import { AdminLogin } from "./admin-login";
import { WaitlistTab } from "./waitlist-tab";
import { ProductsTab } from "./products-tab";
import { FarmersTab } from "./farmers-tab";
import { ReviewsTab } from "./reviews-tab";
import { ContentTab } from "./content-tab";
import { btnOutlineSm } from "../../components/ui/styles";

type AdminTab = "overview" | "waitlist" | "products" | "farmers" | "reviews" | "content";

const tabs: { key: AdminTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "waitlist", label: "Waitlist" },
  { key: "products", label: "Products" },
  { key: "farmers", label: "Farmers" },
  { key: "reviews", label: "Reviews" },
  { key: "content", label: "Content" },
];

const activeTabClasses = "bg-brand-forest text-brand-white";
const inactiveTabClasses = "bg-brand-white text-brand-forest hover:bg-brand-yellow";

function AdminShell() {
  const { email, signOut } = useAdminAuth();
  const [tab, setTab] = useState<AdminTab>("overview");

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <header className="border-b-4 border-brand-forest bg-brand-yellow">
        <div className="section-shell flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <img className="w-24" src="assets/zama_logo.png" alt="Zama" width="96" height="41" />
            <span className="rounded-full border-2 border-brand-forest bg-brand-warm-white px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-brand-forest">Admin</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-brand-black">{email}</span>
            <a className={btnOutlineSm} href="#/">← Back to site</a>
            <button className={btnOutlineSm} type="button" onClick={() => void signOut()}>Sign out</button>
          </div>
        </div>
      </header>

      <nav className="border-b-3 border-dashed border-brand-forest/30 bg-brand-white" aria-label="Admin sections">
        <div className="section-shell flex flex-wrap gap-2 py-3">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-current={tab === key ? "page" : undefined}
              className={`min-h-10 rounded-full border-2 border-brand-forest px-4 py-2 text-sm font-bold transition-all duration-150 ease-out focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2 ${tab === key ? activeTabClasses : inactiveTabClasses}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <main className="section-shell py-8">
        {tab === "overview" ? <OverviewTab /> : null}
        {tab === "waitlist" ? <WaitlistTab /> : null}
        {tab === "products" ? <ProductsTab /> : null}
        {tab === "farmers" ? <FarmersTab /> : null}
        {tab === "reviews" ? <ReviewsTab /> : null}
        {tab === "content" ? <ContentTab /> : null}
      </main>
    </div>
  );
}

function OverviewTab() {
  return (
    <div className="grid gap-4">
      <h1 className="font-primary text-[clamp(1.9rem,4vw,2.8rem)] font-bold leading-[1.02] text-brand-green-ink">Welcome to the Zama admin.</h1>
      <p className="max-w-170 text-[1.05rem] text-brand-black/72">Manage the waitlist, catalog, farmers, reviews, and landing content from here. Changes publish to the live site immediately.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Waitlist", note: "Signups, delete, CSV export" },
          { label: "Catalog", note: "Products, farmers, reviews" },
          { label: "Content", note: "Landing copy blocks" },
        ].map(({ label, note }) => (
          <div key={label} className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">{label}</span>
            <p className="text-sm text-brand-black/72">{note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminPage() {
  const { status, signOut } = useAdminAuth();
  if (status === "bootstrapping") {
    return <div className="grid min-h-screen place-items-center"><p className="font-primary text-xl font-bold text-brand-green-ink">Checking access...</p></div>;
  }
  if (status === "unavailable") {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <p className="max-w-120 rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-5 text-center font-semibold text-brand-black">Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to use the admin.</p>
      </div>
    );
  }
  if (status === "signed-out") {
    return <AdminLogin />;
  }
  if (status === "denied") {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="grid max-w-120 justify-items-center gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-warm-white p-6 text-center shadow-brand">
          <h1 className="font-primary text-[clamp(1.6rem,4vw,2.2rem)] font-bold text-brand-green-ink">Not authorized</h1>
          <p className="text-sm text-brand-black/72">Your account is not in the admin allowlist. Ask the site owner to add your email to admin_users.</p>
          <button className={btnOutlineSm} type="button" onClick={() => void signOut()}>Sign out</button>
        </div>
      </div>
    );
  }
  return <AdminShell />;
}
