const milestones = [
  { year: "2026", title: "FOUNDATION", detail: "The KLAREN 4E intelligence architecture, identity, and core research foundation." },
  { year: "2027", title: "EMBODIMENT", detail: "Physical AI research, robotic integration, and humanoid development." },
  { year: "2040", title: "ORBITAL VISION", detail: "A long-term research direction toward intelligent systems designed for orbital environments." },
];

export function LandingRoadmap() {
  return (
    <section className="landing-roadmap" id="roadmap">
      <div className="landing-roadmap-heading"><p className="landing-eyebrow">THE ROAD AHEAD</p><h2>From language.<br /><span>To the physical world.</span></h2></div>
      <div className="landing-roadmap-list">{milestones.map((item) => <article key={item.year}><p>{item.year}</p><div><h3>{item.title}</h3><span>{item.detail}</span></div></article>)}</div>
      <p className="landing-roadmap-close">Different environments. Different bodies. One direction.</p>
      <p className="landing-roadmap-note">Roadmap milestones represent development goals, not guaranteed releases.</p>
    </section>
  );
}
