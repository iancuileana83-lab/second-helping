import { DAYS } from "@/lib/days";
import type { WeeklyPlan } from "@/lib/meals";
import { StatusChip } from "./verdicts";

/** The seven day cards of a weekly plan, with each dish's verdict and reason. */
export function WeekGrid({ plan }: { plan: WeeklyPlan }) {
  return (
    <div className="grid two">
      {DAYS.map((day) => (
        <section className="card" key={day} aria-label={day}>
          <h3><span aria-hidden="true">🗓️</span> {day}</h3>
          {plan.slots.filter((s) => s.day === day).map((s) => (
            <div key={s.meal} className="slot">
              <p className="small muted">{s.meal}</p>
              <p><StatusChip status={s.verdict.status} /> <strong>{s.verdict.dish.name}</strong></p>
              {s.verdict.findings.map((f) => (
                <p className="finding" key={f.ruleId}>
                  {f.message}
                  {f.swap && (<><br /><em>Instead: {f.swap}.</em></>)}
                </p>
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
