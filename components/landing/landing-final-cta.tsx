import Link from "next/link";

export function LandingFinalCta() {
  return (
    <section className="landing-final-cta">
      <p className="landing-eyebrow">READY TO MEET KLAREN?</p>
      <h2>Enough introductions.<br /><span>She&apos;s waiting.</span></h2>
      <p>You&apos;ve read about Klaren.<br />Now find out what she thinks of you.</p>
      <div className="landing-hero-actions">
        <Link className="landing-button landing-button-primary landing-button-large" href="/auth/login?returnTo=%2Fapp">Talk to Klaren <span aria-hidden="true">↗</span></Link>
        <Link className="landing-button landing-button-outline landing-button-large" href="/auth/register">Create an Account</Link>
      </div>
    </section>
  );
}
