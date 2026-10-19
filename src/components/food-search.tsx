"use client";

import { useMemo, useState } from "react";

export interface FoodEntry {
  food: string;
  search: string;
  rules: { number: number; action: "exclude" | "warn" | "swap"; label: string; medicine: string; message: string; swap?: string }[];
}

export function FoodSearch({ entries }: { entries: FoodEntry[] }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? entries.filter((e) => e.search.includes(t)) : entries;
  }, [q, entries]);

  return (
    <>
      <label htmlFor="food-q">Search for a food, for example grapefruit or milk</label>
      <input id="food-q" className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a food" />
      <p className="small muted" aria-live="polite">{shown.length} food{shown.length === 1 ? "" : "s"} shown</p>
      {shown.map((e) => (
        <details className="card" key={e.food}>
          <summary>{e.food}</summary>
          <ul className="rule-list">
            {e.rules.map((r) => (
              <li key={r.number}>
                <strong>Rule {r.number}</strong> <span className={`chip ${r.action === "exclude" ? "blocked" : r.action}`}>{r.label}</span>
                <br />
                <span className="small">With: {r.medicine}</span>
                <br />
                {r.message}
                {r.swap && (<><br /><em>Instead: {r.swap}.</em></>)}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </>
  );
}
