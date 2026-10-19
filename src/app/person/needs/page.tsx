"use client";

import { useProfile, toggle } from "@/components/profile-context";
import { StepNav } from "@/components/step-nav";
import { CONDITION_OPTIONS, NEED_OPTIONS } from "@/lib/profile";

export default function NeedsPage() {
  const { profile, update } = useProfile();

  return (
    <>
      <h1><span aria-hidden="true">🥄</span> Person: Needs</h1>
      <p className="lead">Health conditions and eating difficulties that change what is a good meal.</p>

      <h2>Eating difficulties</h2>
      <fieldset className="plain">
        <legend className="sr-only">Eating difficulties</legend>
        <div className="grid two">
          {NEED_OPTIONS.map((n) => {
            const on = profile.needs.includes(n.id);
            return (
              <label key={n.id} className={`check card${on ? " on" : ""}`}>
                <input type="checkbox" checked={on} onChange={() => update({ needs: toggle(profile.needs, n.id) })} />
                <span>
                  <span aria-hidden="true">{n.icon} </span><strong>{n.label}</strong>
                  <br />
                  <span className="small muted">{n.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <h2>Health conditions</h2>
      <fieldset className="plain">
        <legend className="sr-only">Health conditions</legend>
        <div className="grid two">
          {CONDITION_OPTIONS.map((c) => {
            const on = profile.conditions.includes(c.id);
            return (
              <label key={c.id} className={`check card${on ? " on" : ""}`}>
                <input type="checkbox" checked={on} onChange={() => update({ conditions: toggle(profile.conditions, c.id) })} />
                <span>
                  <span aria-hidden="true">{c.icon} </span><strong>{c.label}</strong>
                  <br />
                  <span className="small muted">{c.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <p className="notice">Swallowing difficulty needs advice from a speech and language therapist. SafePlate only points out food textures that are often hard.</p>
      <StepNav back={{ href: "/person/medicines", label: "Medicines" }} next={{ href: "/meals/restaurants", label: "See meal ideas" }} />
    </>
  );
}
