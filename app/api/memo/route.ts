import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { PersonalMemo } from "@/lib/types";

function key(residentId: string) {
  return `memo_${residentId}`;
}

export async function GET(req: NextRequest) {
  const residentId = req.nextUrl.searchParams.get("residentId");
  if (!residentId) return NextResponse.json({ ok: false, error: "residentId가 필요합니다." }, { status: 400 });
  const data = await kvGet<PersonalMemo>(key(residentId));
  return NextResponse.json(data ?? { content: "", updatedAt: "" });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as { residentId: string; content: string };
  if (!body.residentId) return NextResponse.json({ ok: false, error: "residentId가 필요합니다." }, { status: 400 });
  const data: PersonalMemo = { content: body.content, updatedAt: new Date().toISOString() };
  await kvSet(key(body.residentId), data);
  return NextResponse.json({ ok: true });
}
