import { LandingMotion } from "@/components/landing/landing-motion";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingProduct } from "@/components/landing/landing-product";
import { LandingCapabilities } from "@/components/landing/landing-capabilities";
import { LandingTechnology } from "@/components/landing/landing-technology";
import { LandingAbout } from "@/components/landing/landing-about";
import { LandingContact } from "@/components/landing/landing-contact";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingRoadmap } from "@/components/landing/landing-roadmap";
import { LandingFinalCta } from "@/components/landing/landing-final-cta";

export function LandingPage() {
  return (
    <main className="landing-shell">
      <LandingMotion />
      <LandingHeader />
      <LandingHero />
      <LandingProduct />
      <LandingCapabilities />
      <LandingTechnology />
      <LandingRoadmap />
      <LandingAbout />
      <LandingContact />
      <LandingFinalCta />
      <LandingFooter />
    </main>
  );
}
