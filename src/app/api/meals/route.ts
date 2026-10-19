import { NextResponse } from "next/server";
import { readPerson } from "@/lib/api-guard";
import { homeIdeas, tasteAffinity, weeklyPlan } from "@/lib/meals";

export const runtime = "nodejs";

/** Deterministic: no AI is used here. POST { profile, kind: "home" | "week" | "taste" }. */
export async function POST(req: Request) {
  const r = await readPerson(req);
  if ("error" in r) return r.error;
  try {
    if (r.body.kind === "home") return NextResponse.json(await homeIdeas(r.person));
    if (r.body.kind === "week") return NextResponse.json(await weeklyPlan(r.person));
    if (r.body.kind === "taste") return NextResponse.json(await tasteAffinity(r.person));
    return NextResponse.json({ error: "Unknown request." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
