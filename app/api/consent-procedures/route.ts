import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { ConsentProcedure } from "@/lib/types";
import { DEFAULT_CONSENT_PROCEDURES } from "@/lib/consentProcedures";

const KEY = "consent_procedures";

export async function GET() {
  const list = (await kvGet<ConsentProcedure[]>(KEY)) ?? DEFAULT_CONSENT_PROCEDURES;
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Pick<ConsentProcedure, "name" | "category">;
  if (!body.name?.trim() || !body.category) {
    return NextResponse.json({ ok: false, error: "name, category가 필요합니다." }, { status: 400 });
  }
  const list = (await kvGet<ConsentProcedure[]>(KEY)) ?? DEFAULT_CONSENT_PROCEDURES;
  const item: ConsentProcedure = { id: crypto.randomUUID(), name: body.name.trim(), category: body.category };
  const next = [...list, item];
  await kvSet(KEY, next);
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as ConsentProcedure[];
  await kvSet(KEY, body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id가 필요합니다." }, { status: 400 });
  const list = (await kvGet<ConsentProcedure[]>(KEY)) ?? DEFAULT_CONSENT_PROCEDURES;
  const next = list.filter((p) => p.id !== id);
  await kvSet(KEY, next);
  return NextResponse.json({ ok: true });
}
