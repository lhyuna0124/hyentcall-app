import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { ConferenceSchedule } from "@/lib/types";
import { DEFAULT_CONFERENCE_ENTRIES } from "@/lib/conferenceSchedule";

const KEY = "conference_schedule";

export async function GET() {
  const saved = await kvGet<ConferenceSchedule>(KEY);
  const base = saved ?? { entries: DEFAULT_CONFERENCE_ENTRIES, updatedAt: "" };
  // 예전 데이터(assignee 단일 필드, 또는 그 다음 버전의 topicPresenter/journalPresenter)를
  // 새 필드(담당 연차·교수 / 발표자 실명 4분할 + site)로 이관합니다.
  const entries = base.entries.map((e: any) => ({
    id: e.id,
    month: e.month ?? "",
    date: e.date ?? "",
    category: e.category ?? "",
    topic: e.topic ?? "",
    topicAssignee: e.topicAssignee ?? e.topicPresenter ?? e.assignee ?? "",
    topicPresenterName: e.topicPresenterName ?? "",
    journalAssignee: e.journalAssignee ?? e.journalPresenter ?? "",
    journalPresenterName: e.journalPresenterName ?? "",
    site: e.site ?? "공통",
  }));
  return NextResponse.json({ ...base, entries });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as ConferenceSchedule;
  const toSave: ConferenceSchedule = { ...body, updatedAt: new Date().toISOString() };
  await kvSet(KEY, toSave);
  return NextResponse.json({ ok: true });
}
