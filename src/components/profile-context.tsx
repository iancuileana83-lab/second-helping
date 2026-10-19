"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { EMPTY_PROFILE, NAME_PATTERN, userProfileSchema, type UserProfile } from "@/lib/profile";

const KEY = "safeplate.profile.v1";

interface Ctx {
  profile: UserProfile;
  update: (patch: Partial<UserProfile>) => void;
  replace: (p: UserProfile) => void;
  reset: () => void;
  /** False until the saved profile has been read, so pages do not flash empty. */
  ready: boolean;
}

const ProfileContext = createContext<Ctx | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [ready, setReady] = useState(false);

  // Saved only in this browser. Reading can fail (private window, blocked storage), so it is optional.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = userProfileSchema.safeParse(JSON.parse(raw));
        if (parsed.success) setProfile(parsed.data);
      }
    } catch {
      /* start empty */
    }
    setReady(true);
  }, []);

  const save = useCallback((p: UserProfile) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      /* not saved; the app still works */
    }
  }, []);

  const replace = useCallback(
    (p: UserProfile) => {
      setProfile(p);
      save(p);
    },
    [save],
  );
  const update = useCallback(
    (patch: Partial<UserProfile>) => {
      setProfile((prev) => {
        const next = { ...prev, ...patch };
        save(next);
        return next;
      });
    },
    [save],
  );
  const reset = useCallback(() => replace(EMPTY_PROFILE), [replace]);

  const value = useMemo(() => ({ profile, update, replace, reset, ready }), [profile, update, replace, reset, ready]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): Ctx {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider");
  return ctx;
}

export function isValidName(name: string): boolean {
  return NAME_PATTERN.test(name.trim());
}

/** Fixed list helper: toggle an id in an array. */
export function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}
