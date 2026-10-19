"use client";

import { useEffect, useState } from "react";

/** Counts up to a number once, unless the visitor prefers reduced motion. Screen readers get the final number at once. */
export function CountUp({ to, ms = 1100 }: { to: number; ms?: number }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || to === 0) {
      setN(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setN(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);

  return (
    <>
      <span aria-hidden="true">{n}</span>
      <span className="sr-only">{to}</span>
    </>
  );
}
