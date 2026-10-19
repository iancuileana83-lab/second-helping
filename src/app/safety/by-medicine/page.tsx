import { RuleBadge } from "@/components/rule-card";
import { ruleNumber } from "@/lib/rule-view";
import { getActiveRules } from "@/safety";
import type { Rule } from "@/safety/types";

export const metadata = { title: "Safety by medicine · SafePlate" };

function RuleLine({ r }: { r: Rule }) {
  return (
    <li>
      <strong>Rule {ruleNumber(r)}</strong> <RuleBadge action={r.action} />
      <br />
      <span className="small">Food: {r.food.join("; ")}</span>
      <br />
      {r.message}
    </li>
  );
}

export default function ByMedicinePage() {
  const active = getActiveRules();
  const forGroup = (id: string) => active.rules.filter((r) => r.applies_when.any_of.some((c) => "group" in c && c.group === id));
  const forClause = (key: "condition" | "need", id: string) =>
    active.rules.filter((r) => r.applies_when.any_of.some((c) => key in c && (c as Record<string, string>)[key] === id));

  const others = [
    { key: "condition" as const, id: "hypertension", label: "High blood pressure" },
    { key: "condition" as const, id: "heart_failure", label: "Heart failure" },
    { key: "condition" as const, id: "kidney_disease", label: "Kidney disease" },
    { key: "condition" as const, id: "diabetes", label: "Diabetes" },
    { key: "need" as const, id: "easy_to_chew", label: "Chewing problems" },
    { key: "need" as const, id: "dysphagia", label: "Swallowing difficulty" },
    { key: "need" as const, id: "dry_mouth", label: "Dry mouth" },
  ];

  return (
    <>
      <h1><span aria-hidden="true">💊</span> Safety: By medicine</h1>
      <p className="lead">Pick a medicine group to see which foods the rules look at.</p>
      <p className="notice">Not medical advice. Fictional demo. Ask your pharmacist or doctor about any real medicine.</p>

      {Object.entries(active.groups).map(([id, g]) => {
        const rules = forGroup(id);
        return (
          <details className="card" key={id}>
            <summary>{g.label} <span className="small muted">({rules.length} rule{rules.length === 1 ? "" : "s"})</span></summary>
            <p className="small muted">Includes: {g.members.join(", ")}</p>
            <ul className="rule-list">{rules.map((r) => <RuleLine key={r.id} r={r} />)}</ul>
          </details>
        );
      })}

      <h2>By condition or eating need</h2>
      {others.map((o) => {
        const rules = forClause(o.key, o.id);
        return (
          <details className="card" key={o.id}>
            <summary>{o.label} <span className="small muted">({rules.length} rule{rules.length === 1 ? "" : "s"})</span></summary>
            <ul className="rule-list">{rules.map((r) => <RuleLine key={r.id} r={r} />)}</ul>
          </details>
        );
      })}
    </>
  );
}
