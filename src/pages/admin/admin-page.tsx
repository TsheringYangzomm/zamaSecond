import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import {
  Apple,
  Boxes,
  ClipboardList,
  FileText,
  Handshake,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Package,
  Repeat,
  ShoppingBag,
  Sprout,
  Star,
  Sparkles,
  TicketPercent,
  Users,
} from "lucide-react";
import { useAdminAuth } from "../../admin/admin-auth";
import { AdminLogin } from "./admin-login";
import { AdminNotificationBell } from "./admin-notification-bell";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "../../components/ui/sidebar";
import { btnOutlineSm } from "../../components/ui/styles";
import { navigateTo } from "../../router";

const OverviewTab = lazy(() => import("./overview-tab").then((module) => ({ default: module.OverviewTab })));
const WaitlistTab = lazy(() => import("./waitlist-tab").then((module) => ({ default: module.WaitlistTab })));
const ProductsTab = lazy(() => import("./products-tab").then((module) => ({ default: module.ProductsTab })));
const MealKitNotesTab = lazy(() => import("./meal-kit-notes-tab").then((module) => ({ default: module.MealKitNotesTab })));
const InventoryTab = lazy(() => import("./inventory-tab").then((module) => ({ default: module.InventoryTab })));
const FarmersTab = lazy(() => import("./farmers-tab").then((module) => ({ default: module.FarmersTab })));
const DieticiansTab = lazy(() => import("./dieticians-tab").then((module) => ({ default: module.DieticiansTab })));
const ReviewsTab = lazy(() => import("./reviews-tab").then((module) => ({ default: module.ReviewsTab })));
const ContentTab = lazy(() => import("./content-tab").then((module) => ({ default: module.ContentTab })));
const OrdersTab = lazy(() => import("./orders-tab").then((module) => ({ default: module.OrdersTab })));
const CustomersTab = lazy(() => import("./customers-tab").then((module) => ({ default: module.CustomersTab })));
const SubscriptionsTab = lazy(() => import("./subscriptions-tab").then((module) => ({ default: module.SubscriptionsTab })));
const MessagesTab = lazy(() => import("./messages-tab").then((module) => ({ default: module.MessagesTab })));
const CouponsTab = lazy(() => import("./coupons-tab").then((module) => ({ default: module.CouponsTab })));
const AccountsRewardsTab = lazy(() => import("./accounts-rewards-tab").then((module) => ({ default: module.AccountsRewardsTab })));
const PartnershipsTab = lazy(() => import("./partnerships-tab").then((module) => ({ default: module.PartnershipsTab })));

type AdminTab = "overview" | "orders" | "products" | "inventory" | "meal-kit-notes" | "coupons" | "farmers" | "partnerships" | "dieticians" | "customers" | "accounts-rewards" | "waitlist" | "reviews" | "messages" | "subscriptions" | "content";

const adminTabs: AdminTab[] = ["overview", "orders", "products", "inventory", "meal-kit-notes", "coupons", "farmers", "partnerships", "dieticians", "customers", "accounts-rewards", "waitlist", "reviews", "messages", "subscriptions", "content"];

function tabFromUrl(): AdminTab {
  if (typeof window === "undefined") return "overview";
  const requested = new URLSearchParams(window.location.search).get("tab");
  return requested && adminTabs.includes(requested as AdminTab) ? requested as AdminTab : "overview";
}

type NavItem = { key: AdminTab; label: string; icon: ReactNode };

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Commerce",
    items: [
      { key: "overview", label: "Overview", icon: <LayoutDashboard /> },
      { key: "orders", label: "Orders", icon: <ShoppingBag /> },
      { key: "products", label: "Products", icon: <Package /> },
      { key: "inventory", label: "Inventory", icon: <Boxes /> },
      { key: "meal-kit-notes", label: "Meal Kit Notes", icon: <ClipboardList /> },
      { key: "coupons", label: "Coupons", icon: <TicketPercent /> },
    ],
  },
  {
    label: "People",
    items: [
      { key: "farmers", label: "Farmers", icon: <Sprout /> },
      { key: "partnerships", label: "Partnerships", icon: <Handshake /> },
      { key: "dieticians", label: "Dieticians", icon: <Apple /> },
      { key: "customers", label: "Customers", icon: <Users /> },
      { key: "accounts-rewards", label: "Accounts & rewards", icon: <Sparkles /> },
      { key: "waitlist", label: "Waitlist", icon: <ListChecks /> },
    ],
  },
  {
    label: "Engagement",
    items: [
      { key: "reviews", label: "Reviews", icon: <Star /> },
      { key: "messages", label: "Messages", icon: <FileText /> },
      { key: "subscriptions", label: "Subscriptions", icon: <Repeat /> },
    ],
  },
  {
    label: "Content",
    items: [
      { key: "content", label: "Content", icon: <FileText /> },
    ],
  },
];

function AdminShell() {
  const { email, signOut } = useAdminAuth();
  const [tab, setTab] = useState<AdminTab>(tabFromUrl);

  useEffect(() => {
    const onLocationChange = () => setTab(tabFromUrl());
    window.addEventListener("popstate", onLocationChange);
    return () => window.removeEventListener("popstate", onLocationChange);
  }, []);

  const selectTab = (nextTab: AdminTab) => {
    const nextPath = `/admin?tab=${encodeURIComponent(nextTab)}`;
    if (`${window.location.pathname}${window.location.search}` === nextPath) return;
    navigateTo(nextPath);
  };

  return (
    <SidebarProvider className="flex min-h-svh w-full flex-col">
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between gap-3 border-b-4 border-brand-forest bg-brand-yellow px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <img className="h-12 w-auto shrink-0" src="/assets/zama_logo.png" alt="Zama" width="144" height="94" />
          <span className="rounded-full border-2 border-brand-forest bg-brand-warm-white px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-brand-forest">Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <AdminNotificationBell />
          <a className={btnOutlineSm} href="/">← Back to site</a>
        </div>
      </header>

      <div className="flex min-w-0 flex-1 pt-16">
        <AdminSidebar
          className="top-16! h-[calc(100svh-4rem)]!"
          tab={tab}
          onSelect={selectTab}
          email={email}
          onSignOut={() => void signOut()}
        />
        <SidebarInset className="min-w-0">
          <main className="admin-shell px-4 py-8 sm:px-6 lg:px-10">
            <Suspense fallback={<p className="font-bold text-brand-green-ink" role="status">Loading admin section…</p>}>
              {tab === "overview" ? <OverviewTab /> : null}
              {tab === "orders" ? <OrdersTab /> : null}
              {tab === "products" ? <ProductsTab /> : null}
              {tab === "inventory" ? <InventoryTab /> : null}
              {tab === "meal-kit-notes" ? <MealKitNotesTab /> : null}
              {tab === "coupons" ? <CouponsTab /> : null}
              {tab === "farmers" ? <FarmersTab /> : null}
              {tab === "partnerships" ? <PartnershipsTab /> : null}
              {tab === "dieticians" ? <DieticiansTab /> : null}
              {tab === "customers" ? <CustomersTab /> : null}
              {tab === "accounts-rewards" ? <AccountsRewardsTab /> : null}
              {tab === "waitlist" ? <WaitlistTab /> : null}
              {tab === "reviews" ? <ReviewsTab /> : null}
              {tab === "messages" ? <MessagesTab /> : null}
              {tab === "subscriptions" ? <SubscriptionsTab /> : null}
              {tab === "content" ? <ContentTab /> : null}
            </Suspense>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function AdminSidebar({
  tab,
  onSelect,
  email,
  onSignOut,
  className,
}: {
  tab: AdminTab;
  onSelect: (tab: AdminTab) => void;
  email: string | null;
  onSignOut: () => void;
  className?: string;
}) {
  const { state, isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar
      collapsible="icon"
      role="complementary"
      aria-label="Admin sections"
      data-collapsed={state === "collapsed"}
      className={className}
    >
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(({ key, label, icon }) => (
                  <SidebarMenuItem key={key}>
                    <SidebarMenuButton
                      isActive={tab === key}
                      tooltip={label}
                      onClick={() => {
                        onSelect(key);
                        if (isMobile) setOpenMobile(false);
                      }}
                      aria-current={tab === key ? "page" : undefined}
                      className={tab === key ? "bg-brand-yellow/20! text-brand-warm-white!" : ""}
                    >
                      {icon}
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarSeparator />
        <UserCard email={email} onSignOut={onSignOut} />
      </SidebarFooter>
    </Sidebar>
  );
}

function UserCard({ email, onSignOut }: { email: string | null; onSignOut: () => void }) {
  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={onSignOut} tooltip="Sign out">
            <LogOut />
            <span>Sign out</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <p className="hidden truncate px-3 pt-1 text-xs font-bold text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden md:block">{email}</p>
    </SidebarGroup>
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
