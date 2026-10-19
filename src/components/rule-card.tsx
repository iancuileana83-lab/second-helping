import { ACTION_ICON, ACTION_LABEL, ruleNumber } from "@/lib/rule-view";
import type { Rule } from "@/safety/types";

export function RuleBadge({ action }: { action: Rule["action"] }) {
  return (
    <span className={`chip ${action === "exclude" ? "blocked" : action}`}>
      <span aria-hidden="true">{ACTION_ICON[action]} </span>
      {ACTION_LABEL[action]}
    </span>
  );
}

export function RuleCard({ r, showReview = false }: { r: Rule; showReview?: boolean }) {
  return (
    <section className="card" aria-label={`Rule ${ruleNumber(r)}`}>
      <h3>Rule {ruleNumber(r)}</h3>
      <p><RuleBadge action={r.action} /></p>
      <p><strong>Food:</strong> {r.food.join("; ")}</p>
      <p><strong>Medicine or need:</strong> {r.medicine_group}</p>
      <p><strong>What the app says:</strong> {r.message}</p>
      {r.swap && <p><strong>Swap:</strong> {r.swap}</p>}
      <p className="small muted">Source: {r.source}</p>
      {showReview && (
        <p className="small muted">
          Reviewed {r.reviewed_on} by {r.reviewed_by}.{r.review_note ? ` Note: ${r.review_note}` : ""}
        </p>
      )}
    </section>
  );
}
