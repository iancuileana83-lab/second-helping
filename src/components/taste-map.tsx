"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { TasteAffinity } from "@/lib/meals";
import { CUISINE_OPTIONS } from "@/lib/profile";
import { useProfile } from "./profile-context";

/** Bubbles for favourite cuisines, sized by affinity. Simulated now; real Qloo affinity later. */
export function TasteMap() {
  const { profile, ready } = useProfile();
  const [data, setData] = useState<TasteAffinity | null>(null);
  const [failed, setFailed] = useState(false);
  const key = `${profile.cuisines.join(",")}|${profile.dishes.join(",")}`;

  useEffect(() => {
    if (!ready) return;
    if (profile.cuisines.length === 0) {
      setData(null);
      return;
    }
    const ctrl = new AbortController();
    // Wait a moment so quick taps on several tiles make one request.
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/meals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "taste", profile: { ...profile, name: profile.name.trim() || "Guest" } }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error("bad");
        setData((await res.json()) as TasteAffinity);
        setFailed(false);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setFailed(true);
      }
    }, 450);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // The key covers the fields that change the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  if (!ready || profile.cuisines.length === 0) {
    return (
      <section className="card" aria-label="Taste map">
        <h2><span aria-hidden="true">🫧</span> Taste map</h2>
        <p className="muted">Choose a favourite cuisine above and its bubble will appear here.</p>
      </section>
    );
  }

  return (
    <section className="card taste-map" aria-label="Taste map">
      <h2><span aria-hidden="true">🫧</span> Taste map</h2>
      <p className="muted">Bigger bubbles mean a stronger taste match. Adding favourite dishes makes them grow.</p>
      {failed && <p className="notice" role="alert">The taste map could not load. Please try again.</p>}
      {data && (
        <>
          <ul className="bubbles" aria-label="Favourite cuisines by affinity">
            {data.cuisines.map((c, i) => {
              const opt = CUISINE_OPTIONS.find((o) => o.id === c.cuisine);
              const size = Math.round(84 + c.score * 96);
              const style = { "--size": `${size}px`, "--d": `${i * 120}ms`, "--f": `${5 + (i % 3)}s` } as CSSProperties;
              return (
                <li key={c.cuisine} className="bubble" style={style}>
                  <span className="b-icon" aria-hidden="true">{opt?.icon}</span>
                  <span className="b-label">{opt?.label ?? c.cuisine}</span>
                  <span className="b-score small">{Math.round(c.score * 100)}%</span>
                </li>
              );
            })}
          </ul>
          <p className={data.tasteSource.simulated ? "banner inline" : "small muted"}>
            {data.tasteSource.simulated
              ? "SIMULATED affinity, NOT QLOO. With the real Qloo API these sizes will show true taste affinity."
              : "Affinity from Qloo."}
          </p>
        </>
      )}
    </section>
  );
}
