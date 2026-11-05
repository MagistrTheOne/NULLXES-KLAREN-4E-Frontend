"use client";

import Link from "next/link";
import { useRef } from "react";

export function LandingMobileMenu({ links }: { links: readonly (readonly [string, string])[] }) {
  const menu = useRef<HTMLDetailsElement>(null);
  return <details ref={menu} className="landing-mobile-menu" onKeyDown={(event) => {
    if (event.key === "Escape" && menu.current) {
      menu.current.open = false;
      menu.current.querySelector("summary")?.focus();
    }
  }}>
    <summary aria-label="Open navigation">Menu <span aria-hidden="true">+</span></summary>
    <nav aria-label="Mobile navigation" onClick={(event) => {
      if ((event.target as HTMLElement).closest("a") && menu.current) menu.current.open = false;
    }}>
      {links.map(([label, id]) => <a key={id} href={`#${id}`}>{label}</a>)}
      <Link href="/auth/register">Get Started</Link>
      <Link href="/auth/login?returnTo=%2Fapp">Let&apos;s Talk to Klaren</Link>
    </nav>
  </details>;
}
