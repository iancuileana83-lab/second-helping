import type { ReactNode } from "react";

/** A template remounts on every navigation, so this soft fade-and-rise plays on each page change. */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
