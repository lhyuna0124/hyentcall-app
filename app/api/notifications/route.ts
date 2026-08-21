import { NextRequest, NextResponse } from "next/server";
import { kvListAppend, kvListGet, kvSet } from "@/lib/kv";
import { NotificationRecord } from "@/lib/types";

const LIST_KEY = "notifications";

export async function GET() {
  const list = await kvListGet<NotificationRecord>(LIST_KEY);
  // 최신순
  list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as NotificationRecord;
  if (!body.id) {
    body.id = crypto.randomUUID();
  }
  if (!body.createdAt) {
    body.createdAt = new Date().toISOString();
  }
  await kvListAppend(LIST_KEY, body);
  return NextResponse.json({ ok: true, id: body.id });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "id가 필요합니다." }, { status: 400 });
  }
  const list = await kvListGet<NotificationRecord>(LIST_KEY);
  const next = list.filter((r) => r.id !== id);
  await kvSet(LIST_KEY, next);
  return NextResponse.json({ ok: true });
}
