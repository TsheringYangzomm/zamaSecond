import "./App.css";
import { SiteFooter } from "./components/layout/site-footer";
import { SiteHeader } from "./components/layout/site-header";
import { LaunchDetailsSection } from "./sections/launch/launch-section";
import { ShopSection } from "./sections/shop/shop-section";
import { FarmersSection } from "./sections/farmers/farmers-section";
import { FeaturesSection } from "./sections/features/features-section";
import { HeroSection } from "./sections/hero/hero-section";
import { MealKitsSection } from "./sections/meal-kits/meal-kits-section";
import { ProcessSection } from "./sections/process/process-section";

function App() {
  return (
    <>
      <a className="fixed left-4 top-3 z-50 -translate-y-24 rounded-wobbly-md border-3 border-brand-forest bg-brand-yellow px-4 py-3 font-bold text-brand-black shadow-brand transition-transform focus:translate-y-0 focus:outline-none focus:ring-4 focus:ring-brand-leaf/30" href="#top">
        Skip to Content
      </a>
      <SiteHeader />
      <main id="top" tabIndex={-1}>
        <HeroSection />
        <FeaturesSection />
        <ShopSection />
        <MealKitsSection />
        <ProcessSection />
        <FarmersSection />
        <LaunchDetailsSection />
      </main>
      <SiteFooter />
    </>
  );
}

export default App;
