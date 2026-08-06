import { useEffect, useRef, useState } from "react";
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
import { ContactPage } from "./pages/contact-page";
import { ShopPage } from "./pages/shop-page";
import { ProductPage } from "./pages/product-page";
import { FarmersPage } from "./pages/farmers-page";
import { AdminPage } from "./pages/admin/admin-page";
import { AdminAuthProvider } from "./admin/admin-auth";
import { getProductId, getRoute, setPendingSection, takePendingSection, type Route } from "./router";

function App() {
  const [route, setRoute] = useState<Route>(() => getRoute(window.location.hash));
  const productId = route === "product" ? getProductId(window.location.hash) : null;
  const previousRoute = useRef(route);

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (previousRoute.current === route) return;
    previousRoute.current = route;
    window.scrollTo(0, 0);
  }, [route]);

  useEffect(() => {
    if (route !== "product") return;
    window.scrollTo(0, 0);
  }, [productId, route]);

  useEffect(() => {
    if (route !== "home") return;
    const target = takePendingSection();
    if (!target) return;
    const frame = requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView());
    return () => cancelAnimationFrame(frame);
  }, [route]);

  useEffect(() => {
    if (route === "home") return;
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.('a[href^="#"]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const href = anchor.getAttribute("href") ?? "";
      if (href.startsWith("#/")) return;
      const targetId = href.replace(/^#/, "");
      if (!targetId || document.getElementById(targetId)) return;
      event.preventDefault();
      setPendingSection(targetId);
      window.location.hash = "#/";
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [route]);

  if (route === "admin") {
    return (
      <AdminAuthProvider>
        <AdminPage />
      </AdminAuthProvider>
    );
  }

  return (
    <ContentProvider>
      <CartProvider>
        <a className="fixed left-4 top-3 z-50 -translate-y-24 rounded-wobbly-md border-3 border-brand-forest bg-brand-yellow px-4 py-3 font-bold text-brand-black shadow-brand transition-transform focus:translate-y-0 focus:outline-none focus:ring-4 focus:ring-brand-leaf/30" href="#top">
          Skip to Content
        </a>
      <SiteHeader />
      {route === "contact" ? (
        <main id="top" tabIndex={-1}>
          <ContactPage />
        </main>
      ) : route === "farmers" ? (
        <main id="top" tabIndex={-1}>
          <FarmersPage />
        </main>
      ) : route === "shop" ? (
        <main id="top" tabIndex={-1}>
          <ShopPage />
        </main>
      ) : route === "product" ? (
        <main id="top" tabIndex={-1}>
          <ProductPage key={productId ?? "missing"} productId={productId} />
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
      )}
      <SiteFooter />
      <CartDrawer />
      </CartProvider>
    </ContentProvider>
  );
}

export default App;
