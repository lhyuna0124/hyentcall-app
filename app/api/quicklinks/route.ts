import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { QuickLink } from "@/lib/types";

const KEY = "quick_links";

const DEFAULT_LINKS: QuickLink[] = [
  { id: "hy-net", label: "논문 아카이브 시스템", url: "https://hy-net.vercel.app/" },
];

export async function GET() {
  const list = (await kvGet<QuickLink[]>(KEY)) ?? DEFAULT_LINKS;
  return NextResponse.json(list);
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as QuickLink[];
  await kvSet(KEY, body);
  return NextResponse.json({ ok: true });
}
