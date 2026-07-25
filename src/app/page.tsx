import Link from "next/link";

const principles = [
  "Your wardrobe before new purchases",
  "Explainable advice, never opaque decisions",
  "Private by default and under your control",
];

export default function HomePage() {
  return (
    <div className="page-frame">
      <section className="hero-panel">
        <div className="eyebrow">Private wardrobe intelligence</div>
        <div className="hero-layout">
          <div>
            <h1>Dress with intention.</h1>
            <p className="hero-copy">
              Sartoria brings your wardrobe, preferences, occasions, and climate into one calm,
              coherent personal style system.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/wardrobe">
                Open your wardrobe
              </Link>
              <a className="button button-secondary" href="#principles">
                How Sartoria works
              </a>
            </div>
          </div>
          <aside aria-label="Wardrobe overview" className="overview-card">
            <div className="overview-heading">
              <span>Wardrobe overview</span>
              <span className="status-pill">Foundation</span>
            </div>
            <dl className="overview-metrics">
              <div>
                <dt>Recorded items</dt>
                <dd>0</dd>
              </div>
              <div>
                <dt>Saved outfits</dt>
                <dd>0</dd>
              </div>
              <div>
                <dt>Ready to explore</dt>
                <dd>Yes</dd>
              </div>
            </dl>
            <p>
              Begin with reliable wardrobe facts. Recommendations arrive only after your wardrobe
              reflects what you actually own.
            </p>
          </aside>
        </div>
      </section>

      <section aria-labelledby="principles-title" className="principles-section" id="principles">
        <div>
          <div className="eyebrow">The Sartoria standard</div>
          <h2 id="principles-title">Less noise. Better decisions.</h2>
        </div>
        <div className="principle-grid">
          {principles.map((principle, index) => (
            <article className="principle-card" key={principle}>
              <span aria-hidden="true">0{index + 1}</span>
              <h3>{principle}</h3>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="next-step-title" className="next-step-panel">
        <div>
          <div className="eyebrow">First step</div>
          <h2 id="next-step-title">Build the wardrobe you already have.</h2>
        </div>
        <p>
          Add garments, footwear, and accessories with the details that matter. Sartoria will use
          those facts later for outfits, planning, insights, and explainable recommendations.
        </p>
        <Link className="text-link" href="/wardrobe">
          Start with a wardrobe item <span aria-hidden="true">→</span>
        </Link>
      </section>
    </div>
  );
}
