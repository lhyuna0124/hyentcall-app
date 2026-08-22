import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";

function key(residentId: string) {
  return `competency_scores_${residentId}`;
}

// 진단명별 "현재" 역량 점수 스냅샷입니다. 평가 기록(evaluations, 메모가 있을 때만 남음)과는
// 별개로, 일괄 적용 등으로 점수를 바꿀 때마다 항상 최신값을 유지해서 전공의를 바꿨다가
// 돌아와도 마지막으로 설정한 점수가 그대로 보이도록 합니다.
export async function GET(req: NextRequest) {
  const residentId = req.nextUrl.searchParams.get("residentId");
  if (!residentId) return NextResponse.json({ ok: false, error: "residentId가 필요합니다." }, { status: 400 });
  const scores = await kvGet<Record<string, number>>(key(residentId));
  return NextResponse.json(scores ?? {});
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as { residentId: string; scores: Record<string, number> };
  if (!body.residentId) return NextResponse.json({ ok: false, error: "residentId가 필요합니다." }, { status: 400 });
  const existing = (await kvGet<Record<string, number>>(key(body.residentId))) ?? {};
  const merged = { ...existing, ...body.scores };
  await kvSet(key(body.residentId), merged);
  return NextResponse.json({ ok: true });
}
