import { NextResponse } from "next/server";
import { toDemoPerson, userProfileSchema } from "@/lib/profile";
import type { DemoPerson } from "@/data/demo-profiles";

// Best-effort limits per server instance, to protect the free AI quota on a public demo.
// Light, non-AI requests (the taste map) get a higher limit than the others.
const LIMITS = { main: 12, taste: 60 } as const;
const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

function limited(ip: string, bucket: keyof typeof LIMITS): boolean {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > LIMITS[bucket];
}

type Guarded = { person: DemoPerson; body: Record<string, unknown> } | { error: NextResponse };

/** Validates the posted profile against fixed choices, then rate-limits. Returns the person or an error response. */
export async function readPerson(req: Request): Promise<Guarded> {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return { error: NextResponse.json({ error: "Invalid request." }, { status: 400 }) };
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip, body?.kind === "taste" ? "taste" : "main")) {
    return { error: NextResponse.json({ error: "Too many requests. Please wait a minute and try again." }, { status: 429 }) };
  }
  const parsed = userProfileSchema.safeParse(body?.profile);
  if (!parsed.success) {
    return { error: NextResponse.json({ error: "The profile has choices that are not allowed." }, { status: 400 }) };
  }
  if (parsed.data.cuisines.length === 0) {
    return { error: NextResponse.json({ error: "Choose at least one favourite cuisine first." }, { status: 400 }) };
  }
  return { person: toDemoPerson(parsed.data), body };
}
