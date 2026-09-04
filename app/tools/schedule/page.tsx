"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { CLINIC_DAYS, ClinicSchedule, ClinicSite, CONFERENCE_SITE_OPTIONS, ConferenceEntry, ConferenceSchedule, ConferenceSite } from "@/lib/types";

const SITES: ClinicSite[] = ["서울", "구리"];

function cellClass(value: string) {
  if (value === "●") return "bg-emerald-50 text-emerald-700";
  if (value === "수술") return "bg-amber-50 text-amber-700";
  if (value && value !== "●" && value !== "수술") return "bg-sky-50 text-sky-700";
  return "";
}

function tabClass(active: boolean) {
  return active
    ? "px-3 py-1.5 rounded-full bg-brand-700 text-white text-sm font-semibold"
    : "px-3 py-1.5 rounded-full border border-slate-300 text-sm text-slate-600 hover:bg-slate-50";
}

function categoryClass(category: string) {
  if (category.includes("이과")) return "bg-blue-100 text-blue-700";
  if (category.includes("비과")) return "bg-emerald-100 text-emerald-700";
  if (category.includes("두경부")) return "bg-purple-100 text-purple-700";
  if (category.includes("Staff")) return "bg-amber-100 text-amber-700";
  if (category.includes("시험")) return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

function siteClass(site: ConferenceSite) {
  if (site === "서울") return "bg-cyan-100 text-cyan-700";
  if (site === "구리") return "bg-orange-100 text-orange-700";
  return "bg-slate-100 text-slate-500";
}

function siteLabel(site: ConferenceSite) {
  if (site === "공통") return "🔗 공통(Zoom)";
  return site;
}

// Staff lecture(교수 강의)와 전공의 시험은 발표자 개념이 없어 토픽/저널 발표자 입력을 표시하지 않습니다.
function hasPresenterRole(category: string) {
  return !category.includes("Staff") && !category.includes("시험");
}

export default function SchedulePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  const [tab, setTab] = useState<"clinic" | "conference">("clinic");
  const [mobileViewMode, setMobileViewMode] = useState<"day" | "table">("day");

  if (loading || !user) return null;

  return (
    <div className="space-y-4 pb-20">
      <div>
        <h1 className="text-xl font-bold text-brand-700">📅 스케쥴</h1>
        <p className="text-sm text-slate-500 mt-1">외래 진료 시간표와 컨퍼런스 스케쥴입니다.</p>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setTab("clinic")} className={tabClass(tab === "clinic")}>
          외래 진료 시간표
        </button>
        <button type="button" onClick={() => setTab("conference")} className={tabClass(tab === "conference")}>
          컨퍼런스 스케쥴
        </button>
      </div>

      {tab === "clinic" ? (
        <div className="space-y-4">
          <div className="sm:hidden flex items-center gap-1.5 flex-wrap">
            {(
              [
                { v: "day", label: "📅 요일별 카드" },
                { v: "table", label: "📋 전체 표로 보기" },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setMobileViewMode(o.v)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 ${
                  mobileViewMode === o.v ? "bg-brand-700 text-white" : "border border-slate-300 text-slate-600"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {SITES.map((site) => (
            <ClinicSiteTable key={site} site={site} isAdmin={!!user.isAdmin} mobileFullTable={mobileViewMode === "table"} />
          ))}
        </div>
      ) : (
        <ConferenceScheduleSection isAdmin={!!user.isAdmin} />
      )}
    </div>
  );
}

function ClinicSiteTable({
  site,
  isAdmin,
  mobileFullTable,
}: {
  site: ClinicSite;
  isAdmin: boolean;
  mobileFullTable?: boolean;
}) {
  const [schedule, setSchedule] = useState<ClinicSchedule | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ClinicSchedule | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/clinic-schedule?site=${site}`)
      .then((r) => r.json())
      .then(setSchedule)
      .catch(() => {});
  }, [site]);

  function startEditing() {
    if (!schedule) return;
    setDraft(JSON.parse(JSON.stringify(schedule)));
    setEditing(true);
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    await fetch("/api/clinic-schedule", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setSchedule({ ...draft, updatedAt: new Date().toISOString() });
    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 1500);
  }

  function updateCell(rowId: string, key: string, value: string) {
    setDraft((d) => d && { ...d, rows: d.rows.map((r) => (r.id === rowId ? { ...r, slots: { ...r.slots, [key]: value } } : r)) });
  }
  function updateSaturday(rowId: string, value: string) {
    setDraft((d) => d && { ...d, rows: d.rows.map((r) => (r.id === rowId ? { ...r, saturdayWeek: value } : r)) });
  }
  function updateDoctorName(rowId: string, value: string) {
    setDraft((d) => d && { ...d, rows: d.rows.map((r) => (r.id === rowId ? { ...r, doctorName: value } : r)) });
  }
  function addRow() {
    setDraft((d) => d && { ...d, rows: [...d.rows, { id: crypto.randomUUID(), doctorName: "", slots: {}, saturdayWeek: "" }] });
  }
  function deleteRow(rowId: string) {
    setDraft((d) => d && { ...d, rows: d.rows.filter((r) => r.id !== rowId) });
  }

  const view = editing ? draft : schedule;
  if (!view) return null;

  return (
    <section className="card space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-800">{site} 외래 진료 시간표</h2>
        {isAdmin && !editing && (
          <button type="button" onClick={startEditing} className="btn-outline !px-3 !py-1 text-xs flex-shrink-0">
            ✏️ 편집
          </button>
        )}
      </div>

      {editing ? (
        <input
          className="input !py-1 text-xs"
          placeholder="비고 (예: 1주차 토요일 외래 없음)"
          value={draft?.note ?? ""}
          onChange={(e) => setDraft((d) => d && { ...d, note: e.target.value })}
        />
      ) : (
        view.note && <p className="text-xs text-amber-600">※ {view.note}</p>
      )}

      {!editing && !mobileFullTable && <MobileClinicDayView view={view} />}

      <div className={editing || mobileFullTable ? "overflow-x-auto" : "overflow-x-auto hidden sm:block"}>
      <table className="min-w-[880px] text-xs border-collapse">
        <thead>
          <tr>
            <th className="border border-slate-200 px-2 py-1 bg-slate-50 text-left">이름</th>
            {CLINIC_DAYS.map((d) => (
              <th key={d} colSpan={2} className="border border-slate-200 px-2 py-1 bg-slate-50">
                {d}
              </th>
            ))}
            <th className="border border-slate-200 px-2 py-1 bg-slate-50">토</th>
          </tr>
          <tr>
            <th className="border border-slate-200 bg-slate-50"></th>
            {CLINIC_DAYS.map((d) => (
              <Fragment key={d}>
                <th className="border border-slate-200 px-1 py-0.5 bg-slate-50 font-normal">오전</th>
                <th className="border border-slate-200 px-1 py-0.5 bg-slate-50 font-normal">오후</th>
              </Fragment>
            ))}
            <th className="border border-slate-200 px-1 py-0.5 bg-slate-50 font-normal">주차</th>
          </tr>
        </thead>
        <tbody>
          {view.rows.map((r) => (
            <tr key={r.id}>
              <td className="border border-slate-200 px-2 py-1 font-medium whitespace-nowrap">
                {editing ? (
                  <input
                    className="input !py-0.5 !px-1 text-xs w-20"
                    value={r.doctorName}
                    onChange={(e) => updateDoctorName(r.id, e.target.value)}
                  />
                ) : (
                  r.doctorName
                )}
              </td>
              {CLINIC_DAYS.map((d) => (
                <Fragment key={d}>
                  {(["AM", "PM"] as const).map((slot) => {
                    const key = `${d}-${slot}`;
                    const value = r.slots[key] ?? "";
                    return editing ? (
                      <td key={slot} className="border border-slate-200 p-0.5">
                        <input
                          className="input !py-0.5 !px-1 text-xs w-12 text-center"
                          value={value}
                          onChange={(e) => updateCell(r.id, key, e.target.value)}
                        />
                      </td>
                    ) : (
                      <td key={slot} className={`border border-slate-200 px-2 py-1 text-center ${cellClass(value)}`}>
                        {value || "-"}
                      </td>
                    );
                  })}
                </Fragment>
              ))}
              {editing ? (
                <td className="border border-slate-200 p-0.5">
                  <input
                    className="input !py-0.5 !px-1 text-xs w-16 text-center"
                    value={r.saturdayWeek}
                    onChange={(e) => updateSaturday(r.id, e.target.value)}
                  />
                </td>
              ) : (
                <td className="border border-slate-200 px-2 py-1 text-center">{r.saturdayWeek || "-"}</td>
              )}
              {editing && (
                <td className="pl-1">
                  <button type="button" onClick={() => deleteRow(r.id)} className="text-xs text-red-500 hover:text-red-700">
                    삭제
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {editing && (
        <div className="flex items-center gap-2 pt-1">
          <button type="button" onClick={addRow} className="btn-outline !px-3 !py-1 text-xs">
            + 의료진 추가
          </button>
          <button type="button" onClick={save} className="btn !px-3 !py-1 text-xs" disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="btn-outline !px-3 !py-1 text-xs">
            취소
          </button>
          {saved && <span className="text-xs text-emerald-600">저장됨</span>}
        </div>
      )}
    </section>
  );
}

function MobileClinicDayView({ view }: { view: ClinicSchedule }) {
  const DAY_TABS = [...CLINIC_DAYS, "토"] as const;
  const [day, setDay] = useState<(typeof DAY_TABS)[number]>(DAY_TABS[0]);
  const isSat = day === "토";

  return (
    <div className="sm:hidden space-y-2">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {DAY_TABS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDay(d)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold flex-shrink-0 ${
              day === d ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {d}
          </button>
        ))}
      </div>
      <div className="space-y-1.5">
        {view.rows.map((r) =>
          isSat ? (
            <div key={r.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200">
              <span className="text-sm font-medium text-slate-700">{r.doctorName}</span>
              <span className="text-sm text-slate-600">{r.saturdayWeek || "휴진"}</span>
            </div>
          ) : (
            <div key={r.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200">
              <span className="text-sm font-medium text-slate-700 w-16 flex-shrink-0 truncate">{r.doctorName}</span>
              <div className="flex-1 grid grid-cols-2 gap-2">
                {(["AM", "PM"] as const).map((slot) => {
                  const value = r.slots[`${day}-${slot}`] ?? "";
                  return (
                    <div
                      key={slot}
                      className={`rounded-md px-2 py-1.5 text-center text-sm ${cellClass(value) || "bg-slate-50 text-slate-400"}`}
                    >
                      <span className="block text-[10px] text-slate-400">{slot === "AM" ? "오전" : "오후"}</span>
                      {value || "-"}
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function groupByMonth(entries: ConferenceEntry[]): { month: string; entries: ConferenceEntry[] }[] {
  const groups: { month: string; entries: ConferenceEntry[] }[] = [];
  for (const e of entries) {
    const month = e.month || "기타";
    let group = groups.find((g) => g.month === month);
    if (!group) {
      group = { month, entries: [] };
      groups.push(group);
    }
    group.entries.push(e);
  }
  return groups;
}

const SITE_PREF_KEY = "entcall_conf_site_pref";
type SitePref = "all" | "서울" | "구리";

function ConferenceScheduleSection({ isAdmin }: { isAdmin: boolean }) {
  const [schedule, setSchedule] = useState<ConferenceSchedule | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ConferenceEntry[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sitePref, setSitePref] = useState<SitePref>("all");

  useEffect(() => {
    fetch("/api/conference-schedule")
      .then((r) => r.json())
      .then(setSchedule)
      .catch(() => {});
    const savedPref = localStorage.getItem(SITE_PREF_KEY) as SitePref | null;
    if (savedPref) setSitePref(savedPref);
  }, []);

  function changeSitePref(p: SitePref) {
    setSitePref(p);
    localStorage.setItem(SITE_PREF_KEY, p);
  }

  function startEditing() {
    if (!schedule) return;
    setDraft(schedule.entries.map((e) => ({ ...e })));
    setEditing(true);
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    await fetch("/api/conference-schedule", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: draft }),
    });
    setSchedule({ entries: draft, updatedAt: new Date().toISOString() });
    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 1500);
  }

  function updateEntry(id: string, patch: Partial<ConferenceEntry>) {
    setDraft((d) => d && d.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }
  function addEntry(month: string) {
    setDraft((d) => [
      ...(d ?? []),
      {
        id: crypto.randomUUID(),
        month,
        date: "",
        category: "",
        topic: "",
        topicPresenter: "",
        journalPresenter: "",
        site: "",
      },
    ]);
  }
  function deleteEntry(id: string) {
    setDraft((d) => d && d.filter((e) => e.id !== id));
  }

  const entries = editing ? draft ?? [] : schedule?.entries ?? [];
  const groups = groupByMonth(entries);
  if (!schedule) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-800">컨퍼런스 스케쥴</h2>
        {!editing && (
          <button type="button" onClick={startEditing} className="btn-outline !px-3 !py-1 text-xs flex-shrink-0">
            ✏️ 편집
          </button>
        )}
      </div>

      {!editing && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-400">🏥 보기</span>
          {(["all", "서울", "구리"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => changeSitePref(p)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                sitePref === p ? "bg-brand-700 text-white" : "border border-slate-300 text-slate-600"
              }`}
            >
              {p === "all" ? "전체" : `${p} 스케쥴`}
            </button>
          ))}
        </div>
      )}

      {editing && (
        <p className="text-xs text-slate-400">
          {isAdmin
            ? "모든 항목을 수정할 수 있습니다. (공통 = Zoom으로 양 병원 동시 진행·발표자 1명, 서울/구리 = 그 날만 한쪽 병원 주제가 다름)"
            : "날짜 / 발표자 이름만 수정할 수 있습니다. (월·분류·병원·주제는 관리자만 수정 가능)"}
        </p>
      )}

      {groups.map((g) => (
        <section key={g.month} className="card space-y-1">
          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-1">{g.month}</h3>
          <div className="divide-y divide-slate-100">
            {g.entries.map((e) => {
              const dimmed = !editing && sitePref !== "all" && (e.site === "서울" || e.site === "구리") && e.site !== sitePref;
              return editing ? (
                <div key={e.id} className="flex items-center gap-2 py-1.5 flex-wrap border-b border-slate-100 last:border-0">
                  {isAdmin ? (
                    <input
                      className="input !py-1 !px-1 text-xs w-14"
                      placeholder="월"
                      value={e.month}
                      onChange={(ev) => updateEntry(e.id, { month: ev.target.value })}
                    />
                  ) : (
                    <span className="text-xs text-slate-400 w-14 flex-shrink-0">{e.month}</span>
                  )}
                  <input
                    className="input !py-1 !px-1 text-xs w-20"
                    placeholder="날짜"
                    value={e.date}
                    onChange={(ev) => updateEntry(e.id, { date: ev.target.value })}
                  />
                  {isAdmin ? (
                    <input
                      className="input !py-1 !px-1 text-xs w-24"
                      placeholder="분류"
                      value={e.category}
                      onChange={(ev) => updateEntry(e.id, { category: ev.target.value })}
                    />
                  ) : (
                    e.category && <span className="text-xs text-slate-400 flex-shrink-0">{e.category}</span>
                  )}
                  {isAdmin ? (
                    <div className="flex gap-1 flex-shrink-0">
                      {CONFERENCE_SITE_OPTIONS.map((s) => (
                        <button
                          key={s || "default"}
                          type="button"
                          onClick={() => updateEntry(e.id, { site: s })}
                          className={`chip border !px-2 !py-0.5 text-[11px] ${
                            e.site === s ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"
                          }`}
                        >
                          {s === "" ? "기본" : s}
                        </button>
                      ))}
                    </div>
                  ) : (
                    e.site && <span className="text-xs text-slate-400 flex-shrink-0">{siteLabel(e.site)}</span>
                  )}
                  {isAdmin ? (
                    <input
                      className="input !py-1 !px-1 text-xs flex-1 min-w-[140px]"
                      placeholder="주제 / 내용"
                      value={e.topic}
                      onChange={(ev) => updateEntry(e.id, { topic: ev.target.value })}
                    />
                  ) : (
                    <span className="flex-1 text-xs text-slate-600 min-w-[140px]">{e.topic}</span>
                  )}
                  {hasPresenterRole(e.category) && (
                    <>
                      <input
                        className="input !py-1 !px-1 text-xs w-20"
                        placeholder="토픽 발표자"
                        value={e.topicPresenter}
                        onChange={(ev) => updateEntry(e.id, { topicPresenter: ev.target.value })}
                      />
                      <input
                        className="input !py-1 !px-1 text-xs w-20"
                        placeholder="저널 발표자"
                        value={e.journalPresenter}
                        onChange={(ev) => updateEntry(e.id, { journalPresenter: ev.target.value })}
                      />
                    </>
                  )}
                  {isAdmin && (
                    <button type="button" onClick={() => deleteEntry(e.id)} className="text-xs text-red-500 hover:text-red-700 px-1 flex-shrink-0">
                      삭제
                    </button>
                  )}
                </div>
              ) : e.date ? (
                <div key={e.id} className={`flex items-center gap-3 py-2 ${dimmed ? "opacity-40 grayscale" : ""}`}>
                  <span className="w-16 text-xs text-slate-400 flex-shrink-0">{e.date}</span>
                  {e.category && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${categoryClass(e.category)}`}>
                      {e.category}
                    </span>
                  )}
                  {e.site && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${siteClass(e.site)}`}>{siteLabel(e.site)}</span>
                  )}
                  <span className="flex-1 text-sm text-slate-700">{e.topic}</span>
                  {hasPresenterRole(e.category) && (e.topicPresenter || e.journalPresenter) && (
                    <span className="text-xs text-slate-400 flex-shrink-0 whitespace-nowrap text-right">
                      {[e.topicPresenter && `발표 ${e.topicPresenter}`, e.journalPresenter && `저널 ${e.journalPresenter}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  )}
                </div>
              ) : (
                <div key={e.id} className={`py-2 px-2 -mx-2 rounded-lg bg-amber-50 text-amber-700 text-sm ${dimmed ? "opacity-40 grayscale" : ""}`}>
                  📌 {e.category ? `[${e.category}] ` : ""}
                  {e.topic}
                </div>
              );
            })}
          </div>
          {editing && isAdmin && (
            <button type="button" onClick={() => addEntry(g.month)} className="btn-outline !px-3 !py-1 text-xs">
              + {g.month}에 항목 추가
            </button>
          )}
        </section>
      ))}

      {editing && (
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button type="button" onClick={() => addEntry("")} className="btn-outline !px-3 !py-1 text-xs">
              + 새 달 추가
            </button>
          )}
          <button type="button" onClick={save} className="btn !px-3 !py-1 text-xs" disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="btn-outline !px-3 !py-1 text-xs">
            취소
          </button>
          {saved && <span className="text-xs text-emerald-600">저장됨</span>}
        </div>
      )}
    </div>
  );
}
