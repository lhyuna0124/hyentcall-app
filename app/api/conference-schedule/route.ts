import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { ConferenceSchedule } from "@/lib/types";
import { DEFAULT_CONFERENCE_ENTRIES } from "@/lib/conferenceSchedule";

const KEY = "conference_schedule";

export async function GET() {
  const saved = await kvGet<ConferenceSchedule>(KEY);
  const base = saved ?? { entries: DEFAULT_CONFERENCE_ENTRIES, updatedAt: "" };
  // 예전 데이터(병원 구분 없는 단일 발표자 필드, 또는 그 이전의 assignee/담당연차+실명 버전)를
  // 지금의 병원별 발표자 필드로 이관합니다. 담당연차/실명이 둘 다 있었다면 "R2(이하경)"처럼 합칩니다.
  const fold = (assignee?: string, name?: string, legacy?: string) => {
    if (assignee && name) return `${assignee}(${name})`;
    return assignee || name || legacy || "";
  };
  const entries = base.entries.map((e: any) => {
    const topicLegacy = e.topicPresenter ?? fold(e.topicAssignee, e.topicPresenterName, e.assignee);
    const journalLegacy = e.journalPresenter ?? fold(e.journalAssignee, e.journalPresenterName);
    return {
      id: e.id,
      month: e.month ?? "",
      date: e.date ?? "",
      category: e.category ?? "",
      topic: e.topic ?? "",
      topicPresenterSeoul: e.topicPresenterSeoul ?? topicLegacy,
      topicPresenterGuri: e.topicPresenterGuri ?? topicLegacy,
      journalPresenterSeoul: e.journalPresenterSeoul ?? journalLegacy,
      journalPresenterGuri: e.journalPresenterGuri ?? journalLegacy,
      site: e.site ?? "",
    };
  });
  return NextResponse.json({ ...base, entries });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as ConferenceSchedule;
  const toSave: ConferenceSchedule = { ...body, updatedAt: new Date().toISOString() };
  await kvSet(KEY, toSave);
  return NextResponse.json({ ok: true });
}
