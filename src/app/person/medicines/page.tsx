"use client";

import { useProfile, toggle } from "@/components/profile-context";
import { StepNav } from "@/components/step-nav";
import { MEDICINE_GROUP_OPTIONS } from "@/lib/profile";

export default function MedicinesPage() {
  const { profile, update } = useProfile();

  return (
    <>
      <h1><span aria-hidden="true">💊</span> Person: Medicines</h1>
      <p className="lead">
        Tick the groups of medicines this person takes. These are the only groups Second Helping has reviewed rules for.
      </p>
      <p className="notice">
        If a medicine is not in a group below, Second Helping has no rules for it. That does not mean it is free of food
        interactions. Ask your pharmacist or doctor.
      </p>

      <fieldset className="plain">
        <legend className="sr-only">Medicine groups</legend>
        <div className="grid two">
          {MEDICINE_GROUP_OPTIONS.map((g) => {
            const on = profile.medicineGroups.includes(g.id);
            return (
              <label key={g.id} className={`check card${on ? " on" : ""}`}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => update({ medicineGroups: toggle(profile.medicineGroups, g.id) })}
                />
                <span>
                  <strong>{g.label}</strong>
                  <br />
                  <span className="small muted">Includes: {g.members.join(", ")}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <p className="small muted">
        Selected: {profile.medicineGroups.length === 0 ? "none (no regular medicines from these groups)" : profile.medicineGroups.length}
      </p>
      <StepNav back={{ href: "/person/tastes", label: "Tastes" }} next={{ href: "/person/needs", label: "Next: Needs" }} />
    </>
  );
}
