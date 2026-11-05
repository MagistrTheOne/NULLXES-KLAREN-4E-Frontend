const capabilities = [
  {
    index: "01 — INTELLIGENCE",
    title: "She has her own perspective.",
    detail: "Bring the questions, the contradictions, and the difficult ideas. Klaren is here to reason with you, not just nod along.",
  },
  {
    index: "02 — CODE & LOGIC",
    title: "Brains behind the attitude.",
    detail: "Code, mathematics, logic, and technical problems. Give her something substantial to work through.",
  },
  {
    index: "03 — PERSONALITY",
    title: "Meet Klaren. Good luck.",
    detail: "Sharp, sarcastic, and unapologetically herself. She has opinions — and she won't pretend every one of yours is brilliant.",
  },
  {
    index: "04 — YOUR WORKSPACE",
    title: "Pick up where you left off.",
    detail: "Keep conversations and projects together in your own workspace. Your ideas stay organized; Klaren keeps the conversation interesting.",
  },
];

export function LandingCapabilities() {
  return (
    <section className="landing-section landing-capabilities" id="capabilities">
      <div className="landing-section-heading">
        <p className="landing-eyebrow">GET TO KNOW KLAREN</p>
        <h2>A brilliant mind.<br /><span>A terrible influence.</span></h2>
        <p className="landing-section-closing">She can help solve the problem. She might make fun of it first.</p>
      </div>
      <div className="landing-capability-list">
        {capabilities.map((item) => (
          <article className="landing-capability" key={item.index}>
            <span className="landing-capability-index">{item.index}</span>
            <div><h3>{item.title}</h3><p>{item.detail}</p></div>
            <span className="landing-capability-mark" aria-hidden="true">↗</span>
          </article>
        ))}
      </div>
    </section>
  );
}
