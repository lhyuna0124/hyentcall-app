"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { CLINIC_DAYS, ClinicSchedule, ClinicSite, ConferenceEntry, ConferenceSchedule } from "@/lib/types";

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

export default function SchedulePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  const [tab, setTab] = useState<"clinic" | "conference">("clinic");

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
          {SITES.map((site) => (
            <ClinicSiteTable key={site} site={site} isAdmin={!!user.isAdmin} />
          ))}
        </div>
      ) : (
        <ConferenceScheduleSection isAdmin={!!user.isAdmin} />
      )}
    </div>
  );
}

function ClinicSiteTable({ site, isAdmin }: { site: ClinicSite; isAdmin: boolean }) {
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
    <section className="card space-y-2 overflow-x-auto">
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

function ConferenceScheduleSection({ isAdmin }: { isAdmin: boolean }) {
  const [schedule, setSchedule] = useState<ConferenceSchedule | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ConferenceEntry[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/conference-schedule")
      .then((r) => r.json())
      .then(setSchedule)
      .catch(() => {});
  }, []);

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
    setDraft((d) => [...(d ?? []), { id: crypto.randomUUID(), month, date: "", category: "", topic: "", assignee: "", presenter: "" }]);
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
        {isAdmin && !editing && (
          <button type="button" onClick={startEditing} className="btn-outline !px-3 !py-1 text-xs flex-shrink-0">
            ✏️ 편집
          </button>
        )}
      </div>

      {groups.map((g) => (
        <section key={g.month} className="card space-y-1">
          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-1">{g.month}</h3>
          <div className="divide-y divide-slate-100">
            {g.entries.map((e) =>
              editing ? (
                <div key={e.id} className="flex items-center gap-2 py-1.5 flex-wrap">
                  <input
                    className="input !py-1 !px-1 text-xs w-14"
                    placeholder="월"
                    value={e.month}
                    onChange={(ev) => updateEntry(e.id, { month: ev.target.value })}
                  />
                  <input
                    className="input !py-1 !px-1 text-xs w-20"
                    placeholder="날짜"
                    value={e.date}
                    onChange={(ev) => updateEntry(e.id, { date: ev.target.value })}
                  />
                  <input
                    className="input !py-1 !px-1 text-xs w-24"
                    placeholder="분류"
                    value={e.category}
                    onChange={(ev) => updateEntry(e.id, { category: ev.target.value })}
                  />
                  <input
                    className="input !py-1 !px-1 text-xs flex-1 min-w-[160px]"
                    placeholder="주제 / 내용"
                    value={e.topic}
                    onChange={(ev) => updateEntry(e.id, { topic: ev.target.value })}
                  />
                  <input
                    className="input !py-1 !px-1 text-xs w-16"
                    placeholder="담당"
                    value={e.assignee}
                    onChange={(ev) => updateEntry(e.id, { assignee: ev.target.value })}
                  />
                  <input
                    className="input !py-1 !px-1 text-xs w-16"
                    placeholder="발표"
                    value={e.presenter}
                    onChange={(ev) => updateEntry(e.id, { presenter: ev.target.value })}
                  />
                  <button type="button" onClick={() => deleteEntry(e.id)} className="text-xs text-red-500 hover:text-red-700 px-1 flex-shrink-0">
                    삭제
                  </button>
                </div>
              ) : e.date ? (
                <div key={e.id} className="flex items-center gap-3 py-2">
                  <span className="w-16 text-xs text-slate-400 flex-shrink-0">{e.date}</span>
                  {e.category && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${categoryClass(e.category)}`}>
                      {e.category}
                    </span>
                  )}
                  <span className="flex-1 text-sm text-slate-700">{e.topic}</span>
                  {(e.assignee || e.presenter) && (
                    <span className="text-xs text-slate-400 flex-shrink-0 whitespace-nowrap">
                      {e.assignee}
                      {e.presenter ? ` → ${e.presenter}` : ""}
                    </span>
                  )}
                </div>
              ) : (
                <div key={e.id} className="py-2 px-2 -mx-2 rounded-lg bg-amber-50 text-amber-700 text-sm">
                  📌 {e.category ? `[${e.category}] ` : ""}
                  {e.topic}
                </div>
              )
            )}
          </div>
          {editing && (
            <button type="button" onClick={() => addEntry(g.month)} className="btn-outline !px-3 !py-1 text-xs">
              + {g.month}에 항목 추가
            </button>
          )}
        </section>
      ))}

      {editing && (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => addEntry("")} className="btn-outline !px-3 !py-1 text-xs">
            + 새 달 추가
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
    </div>
  );
}
