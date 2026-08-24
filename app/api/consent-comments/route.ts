import { NextRequest, NextResponse } from "next/server";
import { kvListAppend, kvListGet, kvSet } from "@/lib/kv";
import { ConsentComment } from "@/lib/types";

const keyFor = (procedureId: string) => `consent_comments_${procedureId}`;

export async function GET(req: NextRequest) {
  const procedureId = req.nextUrl.searchParams.get("procedureId");
  if (!procedureId) return NextResponse.json({ error: "procedureId required" }, { status: 400 });
  const list = await kvListGet<ConsentComment>(keyFor(procedureId));
  list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ConsentComment;
  if (!body.procedureId) return NextResponse.json({ error: "procedureId required" }, { status: 400 });
  if (!body.id) body.id = crypto.randomUUID();
  if (!body.createdAt) body.createdAt = new Date().toISOString();
  await kvListAppend(keyFor(body.procedureId), body);
  return NextResponse.json({ ok: true, id: body.id });
}

export async function DELETE(req: NextRequest) {
  const procedureId = req.nextUrl.searchParams.get("procedureId");
  const id = req.nextUrl.searchParams.get("id");
  if (!procedureId || !id) {
    return NextResponse.json({ ok: false, error: "procedureId, id가 필요합니다." }, { status: 400 });
  }
  const list = await kvListGet<ConsentComment>(keyFor(procedureId));
  const next = list.filter((c) => c.id !== id);
  await kvSet(keyFor(procedureId), next);
  return NextResponse.json({ ok: true });
}
