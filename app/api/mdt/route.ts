import { NextRequest, NextResponse } from "next/server";
import { kvListAppend, kvListGet, kvSet } from "@/lib/kv";
import { MdtPatient } from "@/lib/types";

const LIST_KEY = "mdt_patients";

export async function GET() {
  const list = await kvListGet<MdtPatient>(LIST_KEY);
  list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as MdtPatient;
  if (!body.id) body.id = crypto.randomUUID();
  if (!body.createdAt) body.createdAt = new Date().toISOString();
  await kvListAppend(LIST_KEY, body);
  return NextResponse.json({ ok: true, id: body.id });
}

export async function PUT(req: NextRequest) {
  // 기존 환자 요약 수정
  const body = (await req.json()) as MdtPatient;
  body.updatedAt = new Date().toISOString();
  const list = await kvListGet<MdtPatient>(LIST_KEY);
  const next = list.map((p) => (p.id === body.id ? body : p));
  await kvSet(LIST_KEY, next);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id가 필요합니다." }, { status: 400 });
  const list = await kvListGet<MdtPatient>(LIST_KEY);
  const next = list.filter((p) => p.id !== id);
  await kvSet(LIST_KEY, next);
  return NextResponse.json({ ok: true });
}
