import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { MemoItem } from "@/lib/types";

function key(residentId: string) {
  return `memo_${residentId}`;
}

export async function GET(req: NextRequest) {
  const residentId = req.nextUrl.searchParams.get("residentId");
  if (!residentId) return NextResponse.json({ ok: false, error: "residentId가 필요합니다." }, { status: 400 });
  const items = (await kvGet<MemoItem[]>(key(residentId))) ?? [];
  return NextResponse.json(items);
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as { residentId: string; items: MemoItem[] };
  if (!body.residentId) return NextResponse.json({ ok: false, error: "residentId가 필요합니다." }, { status: 400 });
  await kvSet(key(body.residentId), body.items);
  return NextResponse.json({ ok: true });
}
