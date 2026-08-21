import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";

const KEY = "staff_board";

interface BoardData {
  content: string;
  updatedAt: string;
}

export async function GET() {
  const data = await kvGet<BoardData>(KEY);
  return NextResponse.json(data ?? { content: "", updatedAt: "" });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as { content: string };
  const data: BoardData = { content: body.content, updatedAt: new Date().toISOString() };
  await kvSet(KEY, data);
  return NextResponse.json({ ok: true });
}
