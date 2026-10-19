import Link from "next/link";
import { CountUp } from "@/components/count-up";
import { getActiveRules } from "@/safety";

export default function Home() {
  const active = getActiveRules();
  return (
    <>
      <section className="hero">
        <p className="eyebrow">For families and carers</p>
        <h1>Meals an older person will enjoy, checked for safety</h1>
        <p className="lead">
          Tell us what they like to eat and which medicines and eating needs they have. SafePlate suggests restaurants,
          home cooking and a weekly plan, and shows exactly why a dish is fine, needs care, or is left out.
        </p>
        <p>
          <Link className="btn primary big" href="/person/tastes">Start <span aria-hidden="true">→</span></Link>
        </p>
        <p className="small muted">It takes about two minutes. Everything uses fictional people.</p>
      </section>

      <section aria-label="Safety at a glance" className="grid three stats">
        <p className="stat"><strong><CountUp to={active.rules.length} /></strong><span>reviewed safety rules in use</span></p>
        <p className="stat"><strong><CountUp to={Object.keys(active.groups).length} /></strong><span>medicine groups covered</span></p>
        <p className="stat"><strong><CountUp to={0} /></strong><span>safety decisions made by AI</span></p>
      </section>

      <section aria-label="How it works" className="grid three">
        <article className="card">
          <p className="icon" aria-hidden="true">👤</p>
          <h2>1. Build a profile</h2>
          <p>Favourite cuisines and dishes, medicine groups, and eating needs such as chewing or swallowing.</p>
        </article>
        <article className="card">
          <p className="icon" aria-hidden="true">🍽️</p>
          <h2>2. See meal ideas</h2>
          <p>Restaurants ranked by taste, dishes to cook at home, and a plan for the week.</p>
        </article>
        <article className="card">
          <p className="icon" aria-hidden="true">🛡️</p>
          <h2>3. Check the reasons</h2>
          <p>Every caution and every excluded dish comes from a written rule you can read.</p>
        </article>
      </section>
    </>
  );
}
