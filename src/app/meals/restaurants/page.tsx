"use client";

import type { PlaceResult, PlanResult } from "@/agent/types";
import { CompareToggle } from "@/components/compare";
import { ErrorNote, ProfileGate, RunButton, useMealRequest } from "@/components/meal-tools";
import { SimulatedNote } from "@/components/step-nav";
import { ExcludedBox, VerdictList } from "@/components/verdicts";

function PlaceCard({ r, first = false }: { r: PlaceResult; first?: boolean }) {
  return (
    <section className="card" aria-label={r.place.name}>
      <h3><span aria-hidden="true">📍</span> {r.place.name}</h3>
      <p><strong>Why this suits them:</strong> {r.why}</p>
      <p className="small muted">
        Taste match {Math.round(r.place.score * 100)} out of 100 ({r.place.source === "SIMULATED" ? "simulated, not Qloo" : "Qloo"}).
        Typical {r.place.cuisine[0].toUpperCase() + r.place.cuisine.slice(1)} dishes. Check the menu.
      </p>
      {r.shown.length > 0 ? <VerdictList items={r.shown} replay hint={first} /> : <p>No typical dishes here passed the checks.</p>}
      <ExcludedBox items={r.excluded} where="at this place" />
    </section>
  );
}

export default function RestaurantsPage() {
  const { data, loading, error, run } = useMealRequest<PlanResult>("/api/plan");

  return (
    <>
      <h1><span aria-hidden="true">🍽️</span> Meal ideas: Restaurants</h1>
      <p className="lead">Places ranked by taste, with each typical dish checked against the safety rules.</p>
      <ProfileGate>
        <RunButton loading={loading} onClick={run}>Find restaurants</RunButton>
        <div aria-live="polite">
          <ErrorNote message={error} />
          {data && (
            <>
              <p>{data.intro}</p>
              <SimulatedNote simulated={data.tasteSource.simulated} />
              <CompareToggle />
              {data.places.map((r, i) => (
                <PlaceCard key={r.place.id} r={r} first={i === 0} />
              ))}
              <details>
                <summary>How this was worked out</summary>
                <ol>{data.trace.map((t, i) => <li key={i}>{t}</li>)}</ol>
                <p className="small">
                  Taste ranking: {data.tasteSource.name}{data.tasteSource.simulated ? " (SIMULATED, NOT QLOO)" : ""}. Safety checks: fixed
                  rules, {data.activeRules} active. Friendly wording: {data.wording === "gemini" ? "written by an AI model" : "plain templates"}
                  {data.wordingNote ? `. ${data.wordingNote}` : ""}. The AI never decides what is excluded or cautioned.
                </p>
              </details>
            </>
          )}
        </div>
      </ProfileGate>
    </>
  );
}
