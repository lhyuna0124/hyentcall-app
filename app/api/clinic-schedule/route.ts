import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { ClinicSchedule, ClinicSite } from "@/lib/types";
import { DEFAULT_CLINIC_SCHEDULES } from "@/lib/clinicSchedule";

const keyFor = (site: ClinicSite) => `clinic_schedule_${site}`;

export async function GET(req: NextRequest) {
  const site = req.nextUrl.searchParams.get("site") as ClinicSite | null;
  if (!site) return NextResponse.json({ error: "site required" }, { status: 400 });
  const saved = await kvGet<ClinicSchedule>(keyFor(site));
  const fallback = DEFAULT_CLINIC_SCHEDULES.find((s) => s.site === site) ?? null;
  return NextResponse.json(saved ?? fallback);
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as ClinicSchedule;
  if (!body.site) return NextResponse.json({ error: "site required" }, { status: 400 });
  const toSave: ClinicSchedule = { ...body, updatedAt: new Date().toISOString() };
  await kvSet(keyFor(body.site), toSave);
  return NextResponse.json({ ok: true });
}
