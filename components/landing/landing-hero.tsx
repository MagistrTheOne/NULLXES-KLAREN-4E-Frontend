import Image from "next/image";
import Link from "next/link";

export function LandingHero() {
  return (
    <section className="landing-hero" id="product" aria-labelledby="landing-title">
      <Image className="landing-character" src="/Klaren_langing.png" alt="Klaren lounging on a black leather sofa" fill priority sizes="100vw" />
      <div className="landing-hero-shade" aria-hidden="true" />
      <div className="landing-hero-copy">
        <p className="landing-eyebrow">NULLXES PRESENTS</p>
        <h1 id="landing-title">KLAREN <span>4E</span></h1>
        <p className="landing-orbit-label">ORBITAL INTELLIGENCE</p>
        <p className="landing-hero-line">A mind of her own.<br /><span>And a personality you won&apos;t forget.</span></p>
        <p className="landing-intro">She thinks. She talks back. Meet Klaren.</p>
        <div className="landing-hero-actions">
          <Link className="landing-button landing-button-primary landing-button-large" href="/auth/login?returnTo=%2Fapp">Talk to Klaren <span aria-hidden="true">↗</span></Link>
          <a className="landing-button landing-button-outline landing-button-large" href="#product-details">Meet KLAREN 4E</a>
        </div>
        <p className="landing-demo-note">ONE INTELLIGENCE. DIFFERENT BODIES.</p>
      </div>
      <span className="landing-index" aria-hidden="true">01 <i /> ORBITAL INTELLIGENCE</span>
    </section>
  );
}
