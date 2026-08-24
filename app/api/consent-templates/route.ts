import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { ConsentTemplate } from "@/lib/types";

const keyFor = (procedureId: string) => `consent_template_${procedureId}`;

export async function GET(req: NextRequest) {
  const procedureId = req.nextUrl.searchParams.get("procedureId");
  if (!procedureId) return NextResponse.json({ error: "procedureId required" }, { status: 400 });
  const saved = await kvGet<ConsentTemplate>(keyFor(procedureId));
  return NextResponse.json(saved ?? null);
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as ConsentTemplate;
  if (!body.procedureId) return NextResponse.json({ error: "procedureId required" }, { status: 400 });
  const toSave: ConsentTemplate = { ...body, updatedAt: new Date().toISOString() };
  await kvSet(keyFor(body.procedureId), toSave);
  return NextResponse.json({ ok: true });
}
