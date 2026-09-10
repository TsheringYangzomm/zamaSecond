import { lazy, Suspense, useEffect, useRef } from "react";
import { useLocation, useRouter } from "@tanstack/react-router";
import "./App.css";
import { CartProvider } from "./cart-provider";
import { ContentProvider } from "./cms/content-context";
import { CartDrawer } from "./components/shop/cart-drawer";
import { SiteFooter } from "./components/layout/site-footer";
import { SiteHeader } from "./components/layout/site-header";
import { LaunchDetailsSection } from "./sections/launch/launch-section";
import { ShopSection } from "./sections/shop/shop-section";
import { FarmersSection } from "./sections/farmers/farmers-section";
import { FeaturesSection } from "./sections/features/features-section";
import { HeroSection } from "./sections/hero/hero-section";
import { MealKitsSection } from "./sections/meal-kits/meal-kits-section";
import { PricingSection } from "./sections/pricing/pricing-section";
import { ProcessSection } from "./sections/process/process-section";
import { AdminAuthProvider } from "./admin/admin-auth";
import { CustomerAuthProvider } from "./checkout/customer-auth";
import { getCategoryFromHash, getFarmerId, getProductId, getRoute, setPendingSection, takePendingSection } from "./router";

const ContactPage = lazy(() => import("./pages/contact-page").then((module) => ({ default: module.ContactPage })));
const PartnershipPage = lazy(() => import("./pages/partnership-page").then((module) => ({ default: module.PartnershipPage })));
const ShopPage = lazy(() => import("./pages/shop-page").then((module) => ({ default: module.ShopPage })));
const ProductPage = lazy(() => import("./pages/product-page").then((module) => ({ default: module.ProductPage })));
const CustomizeBoxPage = lazy(() => import("./pages/customize-box-page").then((module) => ({ default: module.CustomizeBoxPage })));
const CategoryPage = lazy(() => import("./pages/category-page").then((module) => ({ default: module.CategoryPage })));
const FarmersPage = lazy(() => import("./pages/farmers-page").then((module) => ({ default: module.FarmersPage })));
const FarmerProfilePage = lazy(() => import("./pages/farmer-profile-page").then((module) => ({ default: module.FarmerProfilePage })));
const LaunchUpdatesPage = lazy(() => import("./pages/launch-updates-page").then((module) => ({ default: module.LaunchUpdatesPage })));
const MembershipPage = lazy(() => import("./pages/membership-page").then((module) => ({ default: module.MembershipPage })));
const MealKitTrustPage = lazy(() => import("./pages/meal-kit-trust-page").then((module) => ({ default: module.MealKitTrustPage })));
const AccountPage = lazy(() => import("./pages/account-page").then((module) => ({ default: module.AccountPage })));
const AccountOrdersPage = lazy(() => import("./pages/account-page").then((module) => ({ default: module.AccountOrdersPage })));
const AccountWalletPage = lazy(() => import("./pages/account-wallet-page").then((module) => ({ default: module.AccountWalletPage })));
const AccountMembershipPage = lazy(() => import("./pages/account-membership-page").then((module) => ({ default: module.AccountMembershipPage })));
const CouponsPage = lazy(() => import("./pages/coupons-page").then((module) => ({ default: module.CouponsPage })));
const AdminPage = lazy(() => import("./pages/admin/admin-page").then((module) => ({ default: module.AdminPage })));
const AdminPasswordResetPage = lazy(() => import("./pages/admin/admin-password-reset").then((module) => ({ default: module.AdminPasswordResetPage })));
const JaggleCallbackPage = lazy(() => import("./pages/jaggle-callback-page").then((module) => ({ default: module.JaggleCallbackPage })));
const NotFoundPage = lazy(() => import("./pages/not-found-page").then((module) => ({ default: module.NotFoundPage })));

function PageFallback() {
  return (
    <main className="grid min-h-[50vh] place-items-center px-4" aria-live="polite">
      <p className="font-bold text-brand-green-ink">Loading Zama…</p>
    </main>
  );
}

function scrollToSection(targetId: string) {
  const target = document.getElementById(targetId);
  if (!target) return false;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  if (target instanceof HTMLElement && target.tabIndex >= 0) {
    target.focus({ preventScroll: true });
  }
  if (targetId === "waitlist") {
    requestAnimationFrame(() => document.getElementById("email")?.focus({ preventScroll: true }));
  }
  return true;
}

function App() {
  const location = useLocation();
  const router = useRouter();
  const routeLocation = `${location.pathname}${location.searchStr}`;
  const route = getRoute("", location.searchStr, location.pathname);
  const productId = route === "product" ? getProductId(routeLocation) : null;
  const farmerId = route === "farmer" ? getFarmerId(routeLocation) : null;
  const categorySlug = route === "category" ? getCategoryFromHash(routeLocation) : null;
  const previousRoute = useRef(route);

  useEffect(() => {
    if (previousRoute.current === route && route !== "product" && route !== "farmer" && route !== "category") return;
    previousRoute.current = route;
    const frame = requestAnimationFrame(() => document.getElementById("top")?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [route, routeLocation]);

  useEffect(() => {
    const titleByRoute: Partial<Record<typeof route, string>> = {
      home: "Zama — Meal Kits & Fresh Groceries for Thimphu",
      shop: "Shop — Zama",
      product: "Product — Zama",
      category: "Shop by category — Zama",
      farmers: "Our farmers — Zama",
      farmer: "Farmer story — Zama",
      membership: "Zama+ membership",
      contact: "Contact Zama",
      partnership: "Partner with Zama",
      coupons: "Coupons — Zama",
      "not-found": "Page not found — Zama",
    };
    document.title = titleByRoute[route] ?? "Zama";

    const publicOrigin = String(import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, "");
    const path = (routeLocation.startsWith("#") ? routeLocation.slice(1) : routeLocation).split("?")[0] || "/";
    const canonicalUrl = `${publicOrigin}${path === "/" ? "/" : path}`;
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute("href", canonicalUrl);
    document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.setAttribute("content", canonicalUrl);

    const privateRoute = route === "admin" || route === "admin-password-reset" || route === "auth-jaggle" || route.startsWith("account");
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = privateRoute || route === "not-found" ? "noindex, nofollow" : "index, follow";
  }, [route, routeLocation]);

  useEffect(() => {
    if (route !== "product" && route !== "category") return;
    window.scrollTo(0, 0);
  }, [productId, categorySlug, route]);

  useEffect(() => {
    if (route !== "home") return;
    const target = takePendingSection();
    if (!target) return;
    const frame = requestAnimationFrame(() => scrollToSection(target));
    return () => cancelAnimationFrame(frame);
  }, [route]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const href = anchor.getAttribute("href") ?? "";
      if (href.startsWith("#") && !href.startsWith("#/")) {
        const targetId = decodeURIComponent(href.slice(1));
        if (!targetId) return;
        if (document.getElementById(targetId)) {
          event.preventDefault();
          scrollToSection(targetId);
          return;
        }
        if (route === "home") return;
        event.preventDefault();
        setPendingSection(targetId);
        router.history.push("/");
        return;
      }

      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const target = new URL(anchor.href, window.location.href);
      if (target.origin !== window.location.origin || !href.startsWith("/")) return;
      event.preventDefault();
      router.history.push(`${target.pathname}${target.search}${target.hash}`);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [route, router]);

  if (route === "admin-password-reset") {
    return <Suspense fallback={<PageFallback />}><AdminPasswordResetPage /></Suspense>;
  }

  if (route === "auth-jaggle") {
    return <Suspense fallback={<PageFallback />}><JaggleCallbackPage /></Suspense>;
  }

  if (route === "admin") {
    return (
      <AdminAuthProvider>
        <Suspense fallback={<PageFallback />}><AdminPage /></Suspense>
      </AdminAuthProvider>
    );
  }

  return (
    <CartProvider>
      <CustomerAuthProvider>
        <ContentProvider>
          <a className="fixed left-4 top-3 z-50 -translate-y-24 rounded-wobbly-md border-3 border-brand-forest bg-brand-yellow px-4 py-3 font-bold text-brand-black shadow-brand transition-transform focus:translate-y-0 focus:outline-none focus:ring-4 focus:ring-brand-leaf/30" href="#top">
            Skip to Content
          </a>
      <SiteHeader />
      <Suspense fallback={<PageFallback />}>{route === "contact" ? (
        <main id="top" tabIndex={-1}>
          <ContactPage />
        </main>
      ) : route === "partnership" ? (
        <main id="top" tabIndex={-1}>
          <PartnershipPage />
        </main>
      ) : route === "farmers" ? (
        <main id="top" tabIndex={-1}>
          <FarmersPage />
        </main>
      ) : route === "farmer" ? (
        <main id="top" tabIndex={-1}>
          <FarmerProfilePage key={farmerId ?? "missing"} farmerId={farmerId} />
        </main>
      ) : route === "shop" ? (
        <main id="top" tabIndex={-1}>
          <ShopPage />
        </main>
      ) : route === "customize" ? (
        <main id="top" tabIndex={-1}>
          <CustomizeBoxPage />
        </main>
      ) : route === "launch-updates" ? (
        <main id="top" tabIndex={-1}>
          <LaunchUpdatesPage />
        </main>
      ) : route === "membership" ? (
        <main id="top" tabIndex={-1}>
          <MembershipPage />
        </main>
      ) : route === "meal-kit-trust" ? (
        <main id="top" tabIndex={-1}>
          <MealKitTrustPage />
        </main>
      ) : route === "account" ? (
        <main id="top" tabIndex={-1}>
          <AccountPage />
        </main>
      ) : route === "account-orders" ? (
        <main id="top" tabIndex={-1}>
          <AccountOrdersPage />
        </main>
      ) : route === "account-wallet" ? (
        <main id="top" tabIndex={-1}>
          <AccountWalletPage />
        </main>
      ) : route === "account-membership" ? (
        <main id="top" tabIndex={-1}>
          <AccountMembershipPage />
        </main>
      ) : route === "coupons" ? (
        <main id="top" tabIndex={-1}>
          <CouponsPage />
        </main>
      ) : route === "category" ? (
        <main id="top" tabIndex={-1}>
          <CategoryPage key={categorySlug ?? "missing"} categorySlug={categorySlug ?? ""} />
        </main>
      ) : route === "product" ? (
        <main id="top" tabIndex={-1}>
          <ProductPage key={productId ?? "missing"} productId={productId} />
        </main>
      ) : route === "not-found" ? (
        <main id="top" tabIndex={-1}>
          <NotFoundPage />
        </main>
      ) : (
        <main id="top" tabIndex={-1}>
          <HeroSection />
          <FeaturesSection />
          <ShopSection />
          <MealKitsSection />
          <ProcessSection />
          <FarmersSection />
          <PricingSection />
          <LaunchDetailsSection />
        </main>
      )}</Suspense>
      <SiteFooter />
      <CartDrawer />
        </ContentProvider>
      </CustomerAuthProvider>
    </CartProvider>
  );
}

export default App;
