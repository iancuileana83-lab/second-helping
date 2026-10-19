"use client";

import { useEffect, useState, type CSSProperties } from "react";

const PIECES = ["🍃", "🌼", "✨", "🍋", "🌿"];

/** A gentle burst of petals that rises and fades. Hidden for reduced motion; purely decorative. */
export function Celebrate() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 3200);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div className="celebrate" aria-hidden="true">
      {Array.from({ length: 18 }, (_, i) => {
        const style = {
          left: `${5 + ((i * 53) % 90)}%`,
          animationDelay: `${(i % 6) * 120}ms`,
          animationDuration: `${2200 + (i % 5) * 220}ms`,
          fontSize: `${22 + (i % 4) * 6}px`,
        } as CSSProperties;
        return <span key={i} style={style}>{PIECES[i % PIECES.length]}</span>;
      })}
    </div>
  );
}
