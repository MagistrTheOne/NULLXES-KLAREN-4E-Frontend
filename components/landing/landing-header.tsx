import Link from "next/link";
import { LandingMobileMenu } from "./landing-mobile-menu";

const links = [
  ["Home", "top"],
  ["KLAREN 4E", "product"],
  ["Capabilities", "capabilities"],
  ["Technology", "technology"],
  ["Roadmap", "roadmap"],
  ["NULLXES", "about"],
  ["Contact", "contact"],
] as const;

export function LandingHeader() {
  return (
    <header className="landing-header" id="top">
      <Link href="/" className="landing-wordmark" aria-label="NULLXES home">
        <span className="landing-monogram">N</span>
        <span>NULLXES</span>
      </Link>
      <nav className="landing-nav" aria-label="Main navigation">
        {links.map(([label, id]) => <a key={id} href={`#${id}`}>{label}</a>)}
      </nav>
      <LandingMobileMenu links={links} />
      <div className="landing-header-actions">
        <Link className="landing-button landing-button-outline" href="/auth/register">Get Started</Link>
        <Link className="landing-button landing-button-primary" href="/auth/login?returnTo=%2Fapp">
          Let&apos;s Talk to Klaren <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </header>
  );
}
