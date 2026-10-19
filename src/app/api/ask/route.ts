import { NextResponse } from "next/server";
import { runAsk } from "@/agent/ask";
import { MAX_MESSAGE, cleanMessage } from "@/agent/scope";
import { readPerson } from "@/lib/api-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST { profile, message }. Fictional profiles only; same rate limit as the other AI route. */
export async function POST(req: Request) {
  const r = await readPerson(req);
  if ("error" in r) return r.error;
  const raw = r.body.message;
  if (typeof raw !== "string" || cleanMessage(raw).length === 0) {
    return NextResponse.json({ error: "Please type a question." }, { status: 400 });
  }
  if (raw.length > MAX_MESSAGE) {
    return NextResponse.json({ error: `Please keep it under ${MAX_MESSAGE} characters.` }, { status: 400 });
  }
  try {
    return NextResponse.json(await runAsk(r.person, raw));
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
