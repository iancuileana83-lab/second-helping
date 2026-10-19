import Link from "next/link";

export function StepNav({ back, next }: { back?: { href: string; label: string }; next?: { href: string; label: string } }) {
  return (
    <div className="steps">
      {back ? <Link className="btn" href={back.href}>← {back.label}</Link> : <span />}
      {next && <Link className="btn primary" href={next.href}>{next.label} →</Link>}
    </div>
  );
}

export function SimulatedNote({ simulated }: { simulated: boolean }) {
  return simulated ? (
    <p className="small muted">Taste matching here is SIMULATED, NOT QLOO. The places are made up.</p>
  ) : null;
}
