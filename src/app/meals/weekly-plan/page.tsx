"use client";

import { useEffect, useState } from "react";
import { Celebrate } from "@/components/celebrate";
import { DAYS } from "@/lib/days";
import type { WeeklyPlan } from "@/lib/meals";
import { ErrorNote, ProfileGate, RunButton, useMealRequest } from "@/components/meal-tools";
import { SimulatedNote } from "@/components/step-nav";
import { StatusChip } from "@/components/verdicts";

export default function WeeklyPlanPage() {
  const { data, loading, error, run } = useMealRequest<WeeklyPlan>("/api/meals", { kind: "week" });

  const [burst, setBurst] = useState(0);
  useEffect(() => {
    if (data) setBurst((b) => b + 1);
  }, [data]);

  return (
    <>
      <h1><span aria-hidden="true">📅</span> Meal ideas: Weekly plan</h1>
      <p className="lead">A lunch and a dinner for every day, with no repeats and nothing the rules exclude.</p>
      <ProfileGate>
        <RunButton loading={loading} onClick={run}>Make a weekly plan</RunButton>
        <div aria-live="polite">
          <ErrorNote message={error} />
          {data && (
            <>
              <Celebrate key={burst} />
              <p className="notice ready" role="status"><span aria-hidden="true">🎉</span> Your week is ready.</p>
              <SimulatedNote simulated={data.tasteSource.simulated} />
              {data.notes.map((n) => <p className="notice" key={n}>{n}</p>)}
              <div className="grid two">
                {DAYS.map((day) => (
                  <section className="card" key={day} aria-label={day}>
                    <h3><span aria-hidden="true">🗓️</span> {day}</h3>
                    {data.slots.filter((s) => s.day === day).map((s) => (
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
              <p className="small muted">{data.excludedCount} dishes were left out by the rules and never appear in the plan. Typical dishes only, so check the ingredients.</p>
            </>
          )}
        </div>
      </ProfileGate>
    </>
  );
}
