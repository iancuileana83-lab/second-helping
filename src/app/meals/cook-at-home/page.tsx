"use client";

import type { HomeIdeas } from "@/lib/meals";
import { CUISINE_OPTIONS } from "@/lib/profile";
import { ErrorNote, ProfileGate, RunButton, useMealRequest } from "@/components/meal-tools";
import { SimulatedNote } from "@/components/step-nav";
import { ExcludedBox, VerdictList } from "@/components/verdicts";

export default function CookAtHomePage() {
  const { data, loading, error, run } = useMealRequest<HomeIdeas>("/api/meals", { kind: "home" });

  return (
    <>
      <h1><span aria-hidden="true">🍳</span> Meal ideas: Cook at home</h1>
      <p className="lead">Dish ideas by cuisine, best taste match first. Dishes with no concerns are listed first.</p>
      <ProfileGate>
        <RunButton loading={loading} onClick={run}>Show dishes to cook</RunButton>
        <div aria-live="polite">
          <ErrorNote message={error} />
          {data && (
            <>
              <SimulatedNote simulated={data.tasteSource.simulated} />
              {data.cuisines.map((c, ci) => {
                const opt = CUISINE_OPTIONS.find((o) => o.id === c.cuisine);
                return (
                  <section className="card" key={c.cuisine} aria-label={`${opt?.label ?? c.cuisine} dishes`}>
                    <h3><span aria-hidden="true">{opt?.icon}</span> {opt?.label ?? c.cuisine} dishes</h3>
                    <p className="small muted">Taste match {Math.round(c.match * 100)} out of 100 (simulated, not Qloo).</p>
                    {c.shown.length > 0 ? <VerdictList items={c.shown} replay hint={ci === 0} /> : <p>No dishes here passed the checks.</p>}
                    <ExcludedBox items={c.excluded} where="for this cuisine" />
                  </section>
                );
              })}
              <p className="small muted">These are dish ideas, not recipes. Check the ingredients you use.</p>
            </>
          )}
        </div>
      </ProfileGate>
    </>
  );
}
