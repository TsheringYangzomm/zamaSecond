import "./App.css";
import { SiteFooter } from "./components/layout/site-footer";
import { SiteHeader } from "./components/layout/site-header";
import { LaunchDetailsSection } from "./sections/launch/launch-section";
import { ShopSection } from "./sections/shop/shop-section";
import { FarmersSection } from "./sections/farmers/farmers-section";
import { FeaturesSection } from "./sections/features/features-section";
import { HeroSection } from "./sections/hero/hero-section";
import { MealKitsSection } from "./sections/meal-kits/meal-kits-section";
import { PlanBuilderSection } from "./sections/plan-builder/plan-builder-section";
import { PricingSection } from "./sections/pricing/pricing-section";
import { ProcessSection } from "./sections/process/process-section";
import { SubscriptionsSection } from "./sections/subscriptions/subscriptions-section";
import { TopPicksSection } from "./sections/top-picks/top-picks-section";

function App() {
  return (
    <>
      <SiteHeader />
      <main id="top">
        <HeroSection />
        <FeaturesSection />
        <ShopSection />
        <SubscriptionsSection />
        <MealKitsSection />
        <ProcessSection />
        <TopPicksSection />
        <FarmersSection />
        <PricingSection />
        <PlanBuilderSection />
        <LaunchDetailsSection />
      </main>
      <SiteFooter />
    </>
  );
}

export default App;
