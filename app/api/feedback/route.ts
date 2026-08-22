import { NextRequest, NextResponse } from "next/server";
import { kvListAppend, kvListGet, kvSet } from "@/lib/kv";
import { FeedbackRecord } from "@/lib/types";

const LIST_KEY = "feedback_messages";

export async function GET() {
  const list = await kvListGet<FeedbackRecord>(LIST_KEY);
  list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Omit<FeedbackRecord, "id" | "createdAt">;
  const record: FeedbackRecord = {
    ...body,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await kvListAppend(LIST_KEY, record);
  return NextResponse.json({ ok: true, id: record.id });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id가 필요합니다." }, { status: 400 });
  const list = await kvListGet<FeedbackRecord>(LIST_KEY);
  const next = list.filter((f) => f.id !== id);
  await kvSet(LIST_KEY, next);
  return NextResponse.json({ ok: true });
}
