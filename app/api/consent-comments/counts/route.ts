import { NextResponse } from "next/server";
import { kvGet } from "@/lib/kv";
import { ConsentComment, ConsentProcedure } from "@/lib/types";
import { DEFAULT_CONSENT_PROCEDURES } from "@/lib/consentProcedures";

// 실험실 > 수술동의서 양식의 항목별 댓글 개수를 한 번에 반환합니다.
// (NavBar 배지, 목록 배지에서 항목마다 따로 요청하지 않도록 모아서 계산합니다.)
export async function GET() {
  const procedures = (await kvGet<ConsentProcedure[]>("consent_procedures")) ?? DEFAULT_CONSENT_PROCEDURES;
  const counts: Record<string, number> = {};
  await Promise.all(
    procedures.map(async (p) => {
      const list = (await kvGet<ConsentComment[]>(`consent_comments_${p.id}`)) ?? [];
      counts[p.id] = list.length;
    })
  );
  return NextResponse.json(counts);
}
