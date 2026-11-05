const capabilities = [
  { index: "01 — REASONING", title: "Think deeper.", detail: "Explore complex questions, test assumptions, and work through problems with clarity." },
  { index: "02 — CODE & LOGIC", title: "Built for the difficult stuff.", detail: "Analyze code, examine logic, identify mistakes, and work through technical challenges." },
  { index: "03 — PERSONALITY", title: "No generic answers.", detail: "A distinct conversational identity. Direct when necessary. Playful when appropriate. Never deliberately bland." },
  { index: "04 — YOUR WORKSPACE", title: "Keep the conversation going.", detail: "Organize conversations, manage projects, and return to your work in one connected environment." },
];

export function LandingCapabilities() {
  return (
    <section className="landing-section landing-capabilities" id="capabilities">
      <div className="landing-section-heading"><p className="landing-eyebrow">WHAT KLAREN DOES</p><h2>More than<br /><span>conversation.</span></h2><p className="landing-section-closing">Intelligence should have substance. Personality makes it memorable.</p></div>
      <div className="landing-capability-list">{capabilities.map((item) => <article className="landing-capability" key={item.index}><span className="landing-capability-index">{item.index}</span><div><h3>{item.title}</h3><p>{item.detail}</p></div><span className="landing-capability-mark" aria-hidden="true">↗</span></article>)}</div>
    </section>
  );
}
