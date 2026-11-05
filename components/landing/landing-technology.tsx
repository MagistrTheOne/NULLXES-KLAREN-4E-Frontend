const architecture = [
  ["Architecture", "Mixture of Experts"],
  ["Intelligence", "KLAREN 4E"],
  ["Research", "Vision / Audio / Physical AI"],
  ["Direction", "Orbital Intelligence"],
] as const;

export function LandingTechnology() {
  return (
    <section className="landing-technology" id="technology" aria-labelledby="technology-title">
      <div className="landing-technology-copy">
        <p className="landing-eyebrow">03 / TECHNOLOGY · THE INTELLIGENCE</p>
        <h2 id="technology-title">ENGINEERED TO EVOLVE.</h2>
        <p>KLAREN 4E is built around a mixture-of-experts language model architecture, with ongoing research into multimodal perception and embodied intelligence.</p>
        <p>Her development spans language, reasoning, vision, audio, and the systems required to bring intelligence into physical environments.</p>
        <strong className="landing-tech-close">The model is only the beginning.</strong>
        <a className="landing-text-link" href="https://huggingface.co/MagistrTheOne/NULLXES-KLAREN-4E" target="_blank" rel="noreferrer">Explore the Model <span aria-hidden="true">↗</span></a>
      </div>
      <dl className="technology-panel">
        {architecture.map(([label, value]) => (
          <div className="technology-row" key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
    </section>
  );
}
