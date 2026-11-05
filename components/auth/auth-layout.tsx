import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function AuthLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main className="auth-shell" lang="ru">
    <div className="auth-portrait" aria-hidden="true"><Image src="/Klaren_langing.png" alt="" fill priority sizes="(max-width:760px) 100vw,55vw" /></div>
    <section className="auth-card" aria-labelledby="auth-title">
      <Link className="auth-brand" href="/"><span>N</span><small>NULLXES</small></Link>
      <p className="auth-product-label">ORBITAL AI · KLAREN 4E</p>
      <h1 id="auth-title">{title}</h1><p className="auth-subtitle">{description}</p>
      {children}
      <Link className="auth-back" href="/">← На сайт NULLXES</Link>
    </section>
  </main>;
}
