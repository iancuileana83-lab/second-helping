"use client";

import { useRef, useState, type FormEvent } from "react";
import type { AskGroup, AskResult } from "@/agent/ask-types";
import { useProfile } from "@/components/profile-context";
import { ProfileGate } from "@/components/meal-tools";
import { PlaceInfo } from "@/components/place-info";
import { SimulatedNote } from "@/components/step-nav";
import { ExcludedBox, VerdictList } from "@/components/verdicts";
import { WeekGrid } from "@/components/week-grid";

interface Turn {
  id: number;
  question: string;
  result?: AskResult;
  error?: string;
}

function Chain({ result }: { result: AskResult }) {
  return (
    <div className="steps-box">
      <p className="small muted"><strong>How I worked this out</strong> (every step is a tool the app ran)</p>
      <ol className="chain" aria-label="Steps taken">
        {result.steps.map((s, i) => (
          <li key={i}>
            {i > 0 && <span className="arrow" aria-hidden="true">→</span>}
            <span className="step-pill">{s.short}</span>
          </li>
        ))}
      </ol>
      <details>
        <summary>Details of each step</summary>
        <ol>
          {result.steps.map((s, i) => (
            <li key={i}><strong>{s.short}.</strong> {s.detail}</li>
          ))}
        </ol>
        <p className="small muted">
          Taste ranking: {result.tasteSource.name}{result.tasteSource.simulated ? " (SIMULATED, NOT QLOO)" : ""}. Safety checks:
          fixed reviewed rules ({result.activeRules} active). Wording: {result.wording === "gemini" ? "written by an AI model" : "plain template"}
          {result.wordingNote ? `. ${result.wordingNote}` : ""}. The AI can choose tools and explain, but it cannot change a safety result.
        </p>
      </details>
    </div>
  );
}

function Group({ g, first }: { g: AskGroup; first: boolean }) {
  return (
    <section className="card" aria-label={g.title}>
      <h3><span aria-hidden="true">{g.place ? "📍" : "🍽️"}</span> {g.title}</h3>
      {g.place && <PlaceInfo place={g.place} />}
      {g.shown.length > 0 ? <VerdictList items={g.shown} replay={false} hint={first} /> : <p>No dishes here passed the checks.</p>}
      <ExcludedBox items={g.excluded} where="here" />
    </section>
  );
}

function Answer({ turn }: { turn: Turn }) {
  const r = turn.result;
  if (turn.error) return <p className="notice" role="alert">{turn.error}</p>;
  if (!r) return <p aria-busy="true" className="thinking"><span aria-hidden="true">🛡️</span> Checking the tools…</p>;
  return (
    <article className={`a-card${r.refused ? " refused" : ""}`} aria-label="Answer">
      {r.refused && <p className="a-head"><span aria-hidden="true">🚫</span> I can’t help with that one</p>}
      <p className="a-text">{r.answer}</p>
      <Chain result={r} />
      {r.groups.some((g) => g.place) && <SimulatedNote simulated={r.tasteSource.simulated} fallback={r.tasteSource.fallback} />}
      {r.groups.map((g, i) => <Group key={g.title} g={g} first={i === 0} />)}
      {r.plan && (
        <>
          {r.plan.notes.map((n) => <p className="notice" key={n}>{n}</p>)}
          <WeekGrid plan={r.plan} />
        </>
      )}
    </article>
  );
}

export default function AskPage() {
  const { profile } = useProfile();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  const name = profile.name.trim() || "Margaret";
  const examples = [
    `${name} wants fish tonight, which restaurant?`,
    `Plan a soft dinner for ${name}`,
    `Plan the week for ${name}`,
  ];

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const id = nextId.current++;
    setTurns((t) => [...t, { id, question: q }]);
    setText("");
    setBusy(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: { ...profile, name: profile.name.trim() || "Guest" }, message: q }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, result: json as AskResult } : x)));
    } catch (e) {
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, error: e instanceof Error ? e.message : "Something went wrong." } : x)));
    } finally {
      setBusy(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(text);
  }

  return (
    <>
      <h1><span aria-hidden="true">💬</span> Ask SafePlate</h1>
      <p className="lead">
        Ask in plain English. An AI agent picks tools to check taste and the safety rules, and shows every step.
        It only suggests meals and checks foods. It never gives medicine doses.
      </p>
      <ProfileGate>
        <section className="card warm" aria-label="Example questions">
          <h2>Try an example</h2>
          <div className="chips">
            {examples.map((q) => (
              <button key={q} type="button" className="pill" onClick={() => ask(q)} disabled={busy}>{q}</button>
            ))}
          </div>
        </section>

        <div aria-live="polite" className="chat">
          {turns.map((t) => (
            <div key={t.id} className="turn">
              <p className="q-bubble"><span className="sr-only">You asked: </span>{t.question}</p>
              <Answer turn={t} />
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form onSubmit={onSubmit} className="ask-form">
          <label htmlFor="q">Your question</label>
          <div className="ask-row">
            <input
              id="q"
              className="input"
              value={text}
              maxLength={300}
              autoComplete="off"
              placeholder={`For example: ${examples[0]}`}
              onChange={(e) => setText(e.target.value)}
            />
            <button className="btn primary" type="submit" disabled={busy || !text.trim()}>
              {busy ? "Working…" : "Ask"}
            </button>
          </div>
          <p className="small muted">Fictional profiles only. Not medical advice. Ask your pharmacist or doctor.</p>
        </form>
      </ProfileGate>
    </>
  );
}
