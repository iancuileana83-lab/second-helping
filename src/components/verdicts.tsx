"use client";

import { useState, type CSSProperties } from "react";
import { dishEmoji } from "@/lib/dish-icons";
import { previewFor } from "@/lib/rule-preview";
import type { Verdict } from "@/safety/types";

export const STATUS_LABEL: Record<Verdict["status"], string> = {
  ok: "No concerns found",
  warn: "Caution",
  swap: "Swap suggested",
  blocked: "Excluded",
};
const STATUS_ICON: Record<Verdict["status"], string> = { ok: "✓", warn: "!", swap: "↔", blocked: "✕" };

export function StatusChip({ status, stamp = false }: { status: Verdict["status"]; stamp?: boolean }) {
  return (
    <span className={`chip ${status}${stamp ? " stamp" : ""}`}>
      <span aria-hidden="true">{STATUS_ICON[status]} </span>
      {STATUS_LABEL[status]}
    </span>
  );
}

/**
 * A dish card. The safety scan sweeps over it and stamps the badge (CSS animation, one after another).
 * The "Why?" button flips the card to show the rule behind the badge. `hint` makes it wiggle once.
 */
export function VerdictItem({ v, index = 0, hint = false }: { v: Verdict; index?: number; hint?: boolean }) {
  const [flipped, setFlipped] = useState(false);
  const style = { "--i": Math.min(index, 8) } as CSSProperties;
  const emoji = dishEmoji(v.dish.name, v.dish.tags);
  const preview = previewFor(v.findings);

  return (
    <li className={`dish ${v.status}${hint ? " hint-wiggle" : ""}`} style={style}>
      <button type="button" className="flip" aria-pressed={flipped} onClick={() => setFlipped((f) => !f)}>
        <span className="face front" aria-hidden={flipped} data-face="front">
          <span className="sweep" aria-hidden="true"><span className="shield">🛡️</span></span>
          <span className="top">
            <span className="emoji" aria-hidden="true">{emoji}</span>
            <span className="titles">
              <StatusChip status={v.status} stamp />
              <strong className="dish-name">{v.dish.name}</strong>
            </span>
          </span>
          <span className="preview">{preview || "Nothing to flag for this profile"}</span>
          <span className="why-btn">Why?<span aria-hidden="true"> ↻</span></span>
        </span>
        <span className="face back" aria-hidden={!flipped} data-face="back">
          <span className="top">
            <span className="emoji" aria-hidden="true">{emoji}</span>
            <strong className="dish-name">{v.dish.name}</strong>
          </span>
          {v.findings.length === 0 ? (
            <span className="rule-text">No rule applied to this dish for this profile.</span>
          ) : (
            v.findings.map((f) => (
              <span className="rule-text" key={f.ruleId}>
                <span className="small muted">Rule {Number(f.ruleId.slice(1))}</span>
                <span>{f.message}</span>
                {f.swap && <em>Instead: {f.swap}.</em>}
              </span>
            ))
          )}
          <span className="why-btn">Back<span aria-hidden="true"> ↻</span></span>
        </span>
      </button>
    </li>
  );
}

export function VerdictList({ items, replay = false, hint = false }: { items: Verdict[]; replay?: boolean; hint?: boolean }) {
  const [run, setRun] = useState(0);
  return (
    <>
      {replay && items.length > 0 && (
        <p>
          <button type="button" className="linklike" onClick={() => setRun((r) => r + 1)}>
            <span aria-hidden="true">🛡️</span> Replay the safety scan
          </button>
        </p>
      )}
      <ul className="dishes" key={run}>
        {items.map((v, i) => (
          <VerdictItem key={v.dish.name} v={v} index={i} hint={hint && i === 0} />
        ))}
      </ul>
    </>
  );
}

export function ExcludedBox({ items, where }: { items: Verdict[]; where: string }) {
  return (
    <details>
      <summary>Why some dishes were left out ({items.length})</summary>
      {items.length === 0 ? <p>Nothing was left out for this person {where}.</p> : <VerdictList items={items} />}
    </details>
  );
}
