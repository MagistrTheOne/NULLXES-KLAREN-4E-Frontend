import Link from "next/link";

export function LandingFinalCta() {
  return (
    <section className="landing-final-cta">
      <p className="landing-eyebrow">READY TO MEET KLAREN?</p>
      <h2>Enough about AI.<br /><span>Talk to one.</span></h2>
      <p>No generic introductions. No scripted personality.<br />Just you and KLAREN 4E.</p>
      <div className="landing-hero-actions"><Link className="landing-button landing-button-primary landing-button-large" href="/auth/login?returnTo=%2Fapp">Let&apos;s Talk to Klaren <span aria-hidden="true">↗</span></Link><Link className="landing-button landing-button-outline landing-button-large" href="/auth/register">Create an Account</Link></div>
    </section>
  );
}
