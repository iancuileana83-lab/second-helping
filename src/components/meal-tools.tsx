"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useProfile } from "./profile-context";
import { profileSummary, type UserProfile } from "@/lib/profile";

/** Posts the profile and returns the result. Shows plain errors. */
export function useMealRequest<T>(url: string, extra: Record<string, unknown> = {}) {
  const { profile } = useProfile();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: toPayload(profile), ...extra }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      setData(json as T);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }
  return { data, loading, error, run };
}

function toPayload(p: UserProfile) {
  return { ...p, name: p.name.trim() || "Guest" };
}

/** Shows who the ideas are for, or asks the user to build a profile first. */
export function ProfileGate({ children }: { children: ReactNode }) {
  const { profile, ready } = useProfile();
  if (!ready) return <p aria-busy="true">Loading…</p>;
  if (profile.cuisines.length === 0) {
    return (
      <div className="card warm">
        <h2><span aria-hidden="true">👤</span> Tell us about the person first</h2>
        <p>Choose at least one favourite cuisine, then come back for meal ideas. You can also load a fictional example.</p>
        <p>
          <Link className="btn primary" href="/person/tastes">Go to Tastes</Link>
        </p>
      </div>
    );
  }
  return (
    <>
      <div className="card who">
        <p className="who-line">
          <strong>Ideas for {profile.name.trim() || "Guest"} (fictional)</strong>{" "}
          <Link href="/person/tastes">Change profile</Link>
        </p>
        <ul className="tight">
          {profileSummary(profile).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
      {children}
    </>
  );
}

export function RunButton({ loading, onClick, children }: { loading: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <p>
      <button className="btn primary" onClick={onClick} disabled={loading}>
        {loading ? "Working on it…" : children}
      </button>
    </p>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  return message ? (
    <p className="notice" role="alert">
      {message}
    </p>
  ) : null;
}
