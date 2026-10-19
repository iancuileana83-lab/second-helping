import { NextResponse } from "next/server";
import { runAgent } from "@/agent/run";
import { readPerson } from "@/lib/api-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const r = await readPerson(req);
  if ("error" in r) return r.error;
  try {
    return NextResponse.json(await runAgent(r.person));
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
