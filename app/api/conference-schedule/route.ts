import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { ConferenceSchedule } from "@/lib/types";
import { DEFAULT_CONFERENCE_ENTRIES } from "@/lib/conferenceSchedule";

const KEY = "conference_schedule";

export async function GET() {
  const saved = await kvGet<ConferenceSchedule>(KEY);
  return NextResponse.json(saved ?? { entries: DEFAULT_CONFERENCE_ENTRIES, updatedAt: "" });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as ConferenceSchedule;
  const toSave: ConferenceSchedule = { ...body, updatedAt: new Date().toISOString() };
  await kvSet(KEY, toSave);
  return NextResponse.json({ ok: true });
}
