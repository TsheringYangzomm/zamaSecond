import { useState, type ReactNode } from "react";
import {
  Boxes,
  CreditCard,
  FileText,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Package,
  Repeat,
  ShoppingBag,
  Sprout,
  Star,
  Truck,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import { useAdminAuth } from "../../admin/admin-auth";
import { AdminLogin } from "./admin-login";
import { OverviewTab } from "./overview-tab";
import { WaitlistTab } from "./waitlist-tab";
import { ProductsTab } from "./products-tab";
import { InventoryTab } from "./inventory-tab";
import { FarmersTab } from "./farmers-tab";
import { ReviewsTab } from "./reviews-tab";
import { ContentTab } from "./content-tab";
import { OrdersTab } from "./orders-tab";
import { CustomersTab } from "./customers-tab";
import { SubscriptionsTab } from "./subscriptions-tab";
import { DeliveriesTab } from "./deliveries-tab";
import { PaymentsTab } from "./payments-tab";
import { MealKitTrustTab } from "./meal-kit-trust-tab";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "../../components/ui/sidebar";
import { btnOutlineSm } from "../../components/ui/styles";

type AdminTab = "overview" | "orders" | "products" | "inventory" | "farmers" | "customers" | "waitlist" | "reviews" | "subscriptions" | "deliveries" | "payments" | "content" | "meal-kit-trust";

const tabs: { key: AdminTab; label: string; icon: ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <LayoutDashboard /> },
  { key: "orders", label: "Orders", icon: <ShoppingBag /> },
  { key: "products", label: "Products", icon: <Package /> },
  { key: "inventory", label: "Inventory", icon: <Boxes /> },
  { key: "farmers", label: "Farmers", icon: <Sprout /> },
  { key: "customers", label: "Customers", icon: <Users /> },
  { key: "waitlist", label: "Waitlist", icon: <ListChecks /> },
  { key: "reviews", label: "Reviews", icon: <Star /> },
  { key: "meal-kit-trust", label: "Meal Kit Trust", icon: <UtensilsCrossed /> },
  { key: "subscriptions", label: "Subscriptions", icon: <Repeat /> },
  { key: "deliveries", label: "Deliveries", icon: <Truck /> },
  { key: "payments", label: "Payments", icon: <CreditCard /> },
  { key: "content", label: "Content", icon: <FileText /> },
];

function AdminShell() {
  const { email, signOut } = useAdminAuth();
  const [tab, setTab] = useState<AdminTab>("overview");

  return (
    <SidebarProvider className="flex min-h-svh w-full flex-col">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b-4 border-brand-forest bg-brand-yellow px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <img className="w-24" src="assets/zama_logo.png" alt="Zama" width="96" height="41" />
          <span className="rounded-full border-2 border-brand-forest bg-brand-warm-white px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-brand-forest">Admin</span>
        </div>
        <a className={btnOutlineSm} href="#/">← Back to site</a>
      </header>

      <div className="flex flex-1 min-w-0">
        <AdminSidebar
          className="top-16! h-[calc(100svh-4rem)]!"
          tab={tab}
          onSelect={setTab}
          email={email}
          onSignOut={() => void signOut()}
        />
        <SidebarInset className="min-w-0">
          <main className="px-4 py-8 sm:px-6 lg:px-10">
            {tab === "overview" ? <OverviewTab /> : null}
            {tab === "orders" ? <OrdersTab /> : null}
            {tab === "products" ? <ProductsTab /> : null}
            {tab === "inventory" ? <InventoryTab /> : null}
            {tab === "farmers" ? <FarmersTab /> : null}
            {tab === "customers" ? <CustomersTab /> : null}
            {tab === "waitlist" ? <WaitlistTab /> : null}
            {tab === "reviews" ? <ReviewsTab /> : null}
            {tab === "meal-kit-trust" ? <MealKitTrustTab /> : null}
            {tab === "subscriptions" ? <SubscriptionsTab /> : null}
            {tab === "deliveries" ? <DeliveriesTab /> : null}
            {tab === "payments" ? <PaymentsTab /> : null}
            {tab === "content" ? <ContentTab /> : null}
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
  const { state } = useSidebar();

  return (
    <Sidebar
      collapsible="icon"
      role="complementary"
      aria-label="Admin sections"
      data-collapsed={state === "collapsed"}
      className={className}
    >
      <SidebarHeader>
        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {tabs.map(({ key, label, icon }) => (
                <SidebarMenuItem key={key}>
                  <SidebarMenuButton
                    isActive={tab === key}
                    tooltip={label}
                    onClick={() => onSelect(key)}
                    aria-current={tab === key ? "page" : undefined}
                  >
                    {icon}
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
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
