const milestones = [
  { year: "2026", title: "FOUNDATION", detail: "The beginning of KLAREN 4E and the identity that makes her unmistakable." },
  { year: "2027", title: "EMBODIMENT", detail: "Exploring new ways for intelligence to interact with the physical world." },
  { year: "2040", title: "ORBITAL VISION", detail: "A long-term ambition to take intelligent systems beyond Earth." },
];

export function LandingRoadmap() {
  return (
    <section className="landing-roadmap" id="roadmap">
      <div className="landing-roadmap-heading"><p className="landing-eyebrow">THE ROAD AHEAD</p><h2>From conversation.<br /><span>To new frontiers.</span></h2></div>
      <div className="landing-roadmap-list">{milestones.map((item) => <article key={item.year}><p>{item.year}</p><div><h3>{item.title}</h3><span>{item.detail}</span></div></article>)}</div>
      <p className="landing-roadmap-close">Different environments. Different bodies. One direction.</p>
      <p className="landing-roadmap-note">Roadmap milestones represent development goals, not guaranteed releases.</p>
    </section>
  );
}
