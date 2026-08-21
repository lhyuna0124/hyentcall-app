import { NextRequest, NextResponse } from "next/server";
import { kvListAppend, kvListGet } from "@/lib/kv";
import { EvaluationRecord } from "@/lib/types";

const LIST_KEY = "evaluations";

export async function GET() {
  const list = await kvListGet<EvaluationRecord>(LIST_KEY);
  list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as EvaluationRecord;
  if (!body.id) body.id = crypto.randomUUID();
  if (!body.createdAt) body.createdAt = new Date().toISOString();
  await kvListAppend(LIST_KEY, body);
  return NextResponse.json({ ok: true, id: body.id });
}
