"use client";

import { useEffect, useState } from "react";
import { Celebrate } from "@/components/celebrate";
import type { WeeklyPlan } from "@/lib/meals";
import { ErrorNote, ProfileGate, RunButton, useMealRequest } from "@/components/meal-tools";
import { SimulatedNote } from "@/components/step-nav";
import { WeekGrid } from "@/components/week-grid";

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
              <WeekGrid plan={data} />
              <p className="small muted">{data.excludedCount} dishes were left out by the rules and never appear in the plan. Typical dishes only, so check the ingredients.</p>
            </>
          )}
        </div>
      </ProfileGate>
    </>
  );
}
