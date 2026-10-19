"use client";

import { useMemo, useState } from "react";
import { compareIllustrative } from "@/lib/compare";
import { useProfile } from "./profile-context";
import { StatusChip } from "./verdicts";

/** "Generic AI vs SafePlate": same suggestions, with and without the safety layer. */
export function CompareToggle() {
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const rows = useMemo(() => compareIllustrative(profile), [profile]);
  if (rows.length === 0) return null;

  return (
    <section className="card compare-wrap" aria-label="Generic AI compared with SafePlate">
      <button type="button" className="btn" aria-expanded={open} aria-controls="compare-panel" onClick={() => setOpen((o) => !o)}>
        <span aria-hidden="true">⚖️</span> {open ? "Hide the comparison" : "Compare with a generic AI"}
      </button>
      {open && (
        <div id="compare-panel" className="compare">
          <p className="notice">
            <strong>Illustrative example.</strong> The left side is an invented example of what a generic chatbot might
            suggest. It is not a real chatbot response. The right side is SafePlate’s real checks of the same ideas for
            this person.
          </p>
          <div className="cmp-head" aria-hidden="true">
            <p>Generic AI (illustrative)</p>
            <p>SafePlate</p>
          </div>
          {rows.map((r, i) => (
            <div className="cmp-row" key={r.verdict.dish.name} style={{ animationDelay: `${i * 160}ms` }}>
              <div className="cmp-cell generic">
                <p className="small muted cmp-label">Generic AI says (illustrative)</p>
                <p>“{r.chatbotSays}” <span aria-hidden="true">👍</span></p>
              </div>
              <div className="cmp-cell safeplate">
                <p className="small muted cmp-label">SafePlate says</p>
                <p><StatusChip status={r.verdict.status} /> <strong>{r.verdict.dish.name}</strong></p>
                {r.verdict.findings.map((f) => (
                  <p className="finding" key={f.ruleId}>
                    {f.message}
                    {f.swap && (<><br /><em>Instead: {f.swap}.</em></>)}
                    <br />
                    <span className="small muted">Rule {Number(f.ruleId.slice(1))}</span>
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
