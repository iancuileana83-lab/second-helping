"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useProfile } from "./profile-context";
import { EXAMPLES } from "@/lib/profile";

const KEY = "safeplate.tour.v1";
export const TOUR_EVENT = "safeplate:tour";

const STEPS = [
  {
    icon: "👵",
    title: "Meet Margaret",
    body: "Margaret is a fictional older woman. She loves Italian and Greek food. She takes a statin (simvastatin), a blood-pressure tablet and warfarin.",
  },
  {
    icon: "🍊",
    title: "A generic AI might not know",
    body: "Ask a generic chatbot for a nice breakfast and it may suggest grapefruit juice. For someone on simvastatin, grapefruit can raise the medicine level in the blood.",
  },
  {
    icon: "🛡️",
    title: "Second Helping checks every dish",
    body: "A shield scans each dish against written rules reviewed by a pharmacy assistant. Green means no concerns, amber means caution, red means left out. Press any dish card to see the rule behind its badge.",
  },
];

/** First-visit guided tour. Skippable, remembered in this browser only. */
export function Tour() {
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(0);
  const router = useRouter();
  const path = usePathname();
  const { replace } = useProfile();

  function open() {
    setStep(0);
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }

  // Opens by itself once, on the home page only, so deep links are never interrupted.
  useEffect(() => {
    let seen = false;
    try {
      seen = window.localStorage.getItem(KEY) === "1";
    } catch {
      /* treat as not seen */
    }
    if (!seen && path === "/") open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const h = () => open();
    window.addEventListener(TOUR_EVENT, h);
    return () => window.removeEventListener(TOUR_EVENT, h);
  }, []);

  function remember() {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* not remembered; fine */
    }
  }
  function close() {
    remember();
    ref.current?.close();
  }
  function startWithMargaret() {
    replace(EXAMPLES[0].profile);
    close();
    router.push("/meals/restaurants");
  }

  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <dialog ref={ref} className="tour" aria-labelledby="tour-title" onClose={remember}>
      <div className="tour-body" key={step}>
        <p className="tour-count small muted">Step {step + 1} of {STEPS.length}</p>
        <p className="tour-icon" aria-hidden="true">{s.icon}</p>
        <h2 id="tour-title">{s.title}</h2>
        <p>{s.body}</p>
      </div>
      <div className="tour-dots" aria-hidden="true">
        {STEPS.map((_, i) => <span key={i} className={i === step ? "dot on" : "dot"} />)}
      </div>
      <div className="tour-actions">
        <button type="button" className="linklike" onClick={close}>Skip the tour</button>
        <span className="spacer" />
        {step > 0 && <button type="button" className="btn" onClick={() => setStep(step - 1)}>Back</button>}
        {!last && <button type="button" className="btn primary" onClick={() => setStep(step + 1)}>Next</button>}
        {last && <button type="button" className="btn primary" onClick={startWithMargaret}>Try it with Margaret</button>}
      </div>
    </dialog>
  );
}

export function ReplayTourButton() {
  return (
    <button type="button" className="linklike" onClick={() => window.dispatchEvent(new Event(TOUR_EVENT))}>
      Replay the “Meet Margaret” tour
    </button>
  );
}
