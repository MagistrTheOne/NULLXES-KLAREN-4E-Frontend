"use client";

import { useEffect } from "react";

/**
 * Progressive enhancement for landing-section reveals.
 * Keeps the page fully visible when JavaScript or motion is unavailable.
 */
export function LandingMotion() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const sections = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".landing-product, .landing-capabilities, .landing-technology, .landing-roadmap, .landing-company, .landing-contact, .landing-final-cta"
      )
    );

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("landing-revealed");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -32px 0px" }
    );

    for (const section of sections) {
      if (section.getBoundingClientRect().top < window.innerHeight) {
        section.classList.add("landing-revealed");
      } else {
        section.classList.add("landing-reveal-pending");
        observer.observe(section);
      }
    }

    return () => observer.disconnect();
  }, []);

  return null;
}
