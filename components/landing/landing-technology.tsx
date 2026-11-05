const architecture = [
  ["Identity", "KLAREN 4E"],
  ["Experience", "Conversation & reasoning"],
  ["Ambition", "Beyond the screen"],
  ["Vision", "Orbital Intelligence"],
] as const;

export function LandingTechnology() {
  return (
    <section className="landing-technology" id="technology" aria-labelledby="technology-title">
      <div className="landing-technology-copy">
        <p className="landing-eyebrow">03 / KLAREN · THE VISION</p>
        <h2 id="technology-title">MORE THAN AN INTERFACE.</h2>
        <p>Klaren is designed to be more than a voice behind a screen. A distinct intelligence, built to challenge expectations.</p>
        <p>From conversation today to new forms of interaction tomorrow, NULLXES is building toward a wider world.</p>
        <strong className="landing-tech-close">One intelligence. Different bodies.</strong>
        <a className="landing-text-link" href="https://huggingface.co/MagistrTheOne/NULLXES-KLAREN-4E" target="_blank" rel="noreferrer">Discover KLAREN 4E <span aria-hidden="true">↗</span></a>
      </div>
      <dl className="technology-panel">
        {architecture.map(([label, value]) => (
          <div className="technology-row" key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
    </section>
  );
}
