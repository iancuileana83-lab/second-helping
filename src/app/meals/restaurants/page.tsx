"use client";

import type { PlaceResult, PlanResult } from "@/agent/types";
import { CompareToggle } from "@/components/compare";
import { ErrorNote, ProfileGate, RunButton, useMealRequest } from "@/components/meal-tools";
import { SimulatedNote } from "@/components/step-nav";
import { PlaceInfo } from "@/components/place-info";
import { ExcludedBox, VerdictList } from "@/components/verdicts";

function PlaceCard({ r, first = false }: { r: PlaceResult; first?: boolean }) {
  return (
    <section className="card" aria-label={r.place.name}>
      <h3><span aria-hidden="true">📍</span> {r.place.name}</h3>
      <p><strong>Why it may suit them:</strong> {r.why}</p>
      <PlaceInfo place={r.place} />
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
      <p className="lead">Places that people with similar tastes tend to enjoy, with each typical dish checked against the safety rules.</p>
      <ProfileGate>
        <RunButton loading={loading} onClick={run}>Find restaurants</RunButton>
        <div aria-live="polite">
          <ErrorNote message={error} />
          {data && (
            <>
              <p>{data.intro}</p>
              <SimulatedNote simulated={data.tasteSource.simulated} fallback={data.tasteSource.fallback} />
              {data.places.length === 0 && <p className="notice">No restaurants for these cuisines were found near the chosen city. Try another city or add more favourite cuisines.</p>}
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
