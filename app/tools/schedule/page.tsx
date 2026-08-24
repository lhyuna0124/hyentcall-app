"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { CLINIC_DAYS, ClinicSchedule, ClinicSite, ConferenceEntry, ConferenceSchedule } from "@/lib/types";

const SITES: ClinicSite[] = ["구리", "서울"];

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

      {tab === "clinic" ? <ClinicScheduleSection isAdmin={!!user.isAdmin} /> : <ConferenceScheduleSection isAdmin={!!user.isAdmin} />}
    </div>
  );
}

function ClinicScheduleSection({ isAdmin }: { isAdmin: boolean }) {
  const [site, setSite] = useState<ClinicSite>("구리");
  const [schedule, setSchedule] = useState<ClinicSchedule | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ClinicSchedule | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function load() {
    fetch(`/api/clinic-schedule?site=${site}`)
      .then((r) => r.json())
      .then(setSchedule)
      .catch(() => {});
  }
  useEffect(() => {
    setEditing(false);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {SITES.map((s) => (
          <button key={s} type="button" onClick={() => setSite(s)} className={tabClass(site === s)}>
            {s}
          </button>
        ))}
      </div>

      {view && (
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
      )}
    </div>
  );
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
  function addEntry() {
    setDraft((d) => [...(d ?? []), { id: crypto.randomUUID(), date: "", category: "", topic: "", assignee: "", presenter: "" }]);
  }
  function deleteEntry(id: string) {
    setDraft((d) => d && d.filter((e) => e.id !== id));
  }

  const entries = editing ? draft ?? [] : schedule?.entries ?? [];
  if (!schedule) return null;

  return (
    <section className="card space-y-2 overflow-x-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-800">컨퍼런스 스케쥴</h2>
        {isAdmin && !editing && (
          <button type="button" onClick={startEditing} className="btn-outline !px-3 !py-1 text-xs flex-shrink-0">
            ✏️ 편집
          </button>
        )}
      </div>

      <table className="min-w-[700px] text-sm border-collapse">
        <thead>
          <tr className="text-left text-slate-400 border-b border-slate-200">
            <th className="py-1.5 px-2">날짜</th>
            <th className="px-2">분류</th>
            <th className="px-2">주제</th>
            <th className="px-2">담당</th>
            <th className="px-2">발표</th>
            {editing && <th></th>}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) =>
            editing || e.date ? (
              <tr key={e.id} className="border-b border-slate-100 last:border-0">
                <td className="py-1.5 px-2 whitespace-nowrap">
                  {editing ? (
                    <input className="input !py-1 !px-1 text-xs w-24" value={e.date} onChange={(ev) => updateEntry(e.id, { date: ev.target.value })} />
                  ) : (
                    e.date
                  )}
                </td>
                <td className="px-2">
                  {editing ? (
                    <input className="input !py-1 !px-1 text-xs w-24" value={e.category} onChange={(ev) => updateEntry(e.id, { category: ev.target.value })} />
                  ) : (
                    e.category
                  )}
                </td>
                <td className="px-2">
                  {editing ? (
                    <input className="input !py-1 !px-1 text-xs w-64" value={e.topic} onChange={(ev) => updateEntry(e.id, { topic: ev.target.value })} />
                  ) : (
                    e.topic
                  )}
                </td>
                <td className="px-2">
                  {editing ? (
                    <input className="input !py-1 !px-1 text-xs w-16" value={e.assignee} onChange={(ev) => updateEntry(e.id, { assignee: ev.target.value })} />
                  ) : (
                    e.assignee
                  )}
                </td>
                <td className="px-2">
                  {editing ? (
                    <input className="input !py-1 !px-1 text-xs w-16" value={e.presenter} onChange={(ev) => updateEntry(e.id, { presenter: ev.target.value })} />
                  ) : (
                    e.presenter
                  )}
                </td>
                {editing && (
                  <td>
                    <button type="button" onClick={() => deleteEntry(e.id)} className="text-xs text-red-500 hover:text-red-700 px-1">
                      삭제
                    </button>
                  </td>
                )}
              </tr>
            ) : (
              <tr key={e.id} className="bg-amber-50">
                <td colSpan={editing ? 6 : 5} className="px-2 py-1.5 text-amber-700">
                  {editing ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="input !py-1 !px-1 text-xs w-24"
                        placeholder="분류"
                        value={e.category}
                        onChange={(ev) => updateEntry(e.id, { category: ev.target.value })}
                      />
                      <input
                        className="input !py-1 !px-1 text-xs flex-1"
                        placeholder="내용"
                        value={e.topic}
                        onChange={(ev) => updateEntry(e.id, { topic: ev.target.value })}
                      />
                      <button type="button" onClick={() => deleteEntry(e.id)} className="text-xs text-red-500 hover:text-red-700 px-1 flex-shrink-0">
                        삭제
                      </button>
                    </div>
                  ) : (
                    <span>
                      📌 {e.category ? `[${e.category}] ` : ""}
                      {e.topic}
                    </span>
                  )}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>

      {editing && (
        <div className="flex items-center gap-2 pt-1">
          <button type="button" onClick={addEntry} className="btn-outline !px-3 !py-1 text-xs">
            + 항목 추가
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
