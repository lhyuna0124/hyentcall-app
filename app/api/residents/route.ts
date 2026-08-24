import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { DEFAULT_RESIDENTS, Resident } from "@/lib/residents";

const KEY = "residents";

export async function GET() {
  const list = (await kvGet<Resident[]>(KEY)) ?? DEFAULT_RESIDENTS;
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Pick<Resident, "name" | "level" | "phoneLast4" | "isAdmin">;
  if (!body.name?.trim() || !body.level || !body.phoneLast4?.trim()) {
    return NextResponse.json({ ok: false, error: "name, level, phoneLast4가 필요합니다." }, { status: 400 });
  }
  const list = (await kvGet<Resident[]>(KEY)) ?? DEFAULT_RESIDENTS;
  const item: Resident = {
    id: crypto.randomUUID(),
    name: body.name.trim(),
    level: body.level,
    phoneLast4: body.phoneLast4.trim(),
    isAdmin: !!body.isAdmin,
  };
  const next = [...list, item];
  await kvSet(KEY, next);
  return NextResponse.json(item);
}

// 전체 목록 교체 (수정/삭제 모두 클라이언트에서 배열을 고쳐 보냅니다)
export async function PUT(req: NextRequest) {
  const body = (await req.json()) as Resident[];
  await kvSet(KEY, body);
  return NextResponse.json({ ok: true });
}
