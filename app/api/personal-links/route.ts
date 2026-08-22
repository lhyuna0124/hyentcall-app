import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { PersonalLink } from "@/lib/types";

function key(residentId: string) {
  return `personal_links_${residentId}`;
}

export async function GET(req: NextRequest) {
  const residentId = req.nextUrl.searchParams.get("residentId");
  if (!residentId) return NextResponse.json({ ok: false, error: "residentId가 필요합니다." }, { status: 400 });
  const list = (await kvGet<PersonalLink[]>(key(residentId))) ?? [];
  return NextResponse.json(list);
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as { residentId: string; links: PersonalLink[] };
  if (!body.residentId) return NextResponse.json({ ok: false, error: "residentId가 필요합니다." }, { status: 400 });
  await kvSet(key(body.residentId), body.links);
  return NextResponse.json({ ok: true });
}
