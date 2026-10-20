import Link from "next/link";

export function StepNav({ back, next }: { back?: { href: string; label: string }; next?: { href: string; label: string } }) {
  return (
    <div className="steps">
      {back ? <Link className="btn" href={back.href}>← {back.label}</Link> : <span />}
      {next && <Link className="btn primary" href={next.href}>{next.label} →</Link>}
    </div>
  );
}

/** Says where the taste data on a page came from: Qloo, the labelled stand-in, or the stand-in after a Qloo failure. */
export function SimulatedNote({ simulated, fallback = false }: { simulated: boolean; fallback?: boolean }) {
  if (simulated && fallback) {
    return (
      <p className="notice" role="status">
        Qloo could not be reached just now, so the places and taste scores here are made up (SIMULATED, NOT QLOO).
      </p>
    );
  }
  if (simulated) {
    return <p className="small muted">Taste matching here is SIMULATED, NOT QLOO. The places are made up.</p>;
  }
  return (
    <p className="small muted">
      Places and scores come from Qloo. They are real restaurants, and the scores describe what groups of people with similar tastes tend to enjoy, not what one person will do. Second Helping is not affiliated with these restaurants; dishes are
      typical for the cuisine, not their menu, so always check with the restaurant.
    </p>
  );
}
