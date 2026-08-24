"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { NotificationRecord, DISPOSITION_LABEL } from "@/lib/types";
import { riskColor, riskLabel } from "@/lib/triage";

function isLateNight(iso: string) {
  const h = new Date(iso).getHours();
  return h >= 0 && h < 6;
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function StatsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<NotificationRecord[]>([]);
  const [residentFilter, setResidentFilter] = useState("전체");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then(setRecords)
      .catch(() => {});
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("이 기록을 삭제할까요? 되돌릴 수 없습니다.")) return;
    await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }

  const residents = useMemo(() => {
    const set = new Set(records.map((r) => r.residentName));
    return ["전체", ...Array.from(set)];
  }, [records]);

  const filtered = useMemo(
    () => (residentFilter === "전체" ? records : records.filter((r) => r.residentName === residentFilter)),
    [records, residentFilter]
  );

  const byDate = useMemo(() => {
    const map = new Map<string, NotificationRecord[]>();
    for (const r of filtered) {
      const date = r.createdAt.slice(0, 10);
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  const admittedCount = filtered.filter((r) => r.disposition === "admit").length;
  const lateNightCount = filtered.filter((r) => isLateNight(r.createdAt)).length;

  if (loading || !user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-y-2">
        <h1 className="text-xl font-bold text-brand-700 whitespace-nowrap">📊 응급실 입원 통계</h1>
        <select className="input w-48 flex-shrink-0" value={residentFilter} onChange={(e) => setResidentFilter(e.target.value)}>
          {residents.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-semibold text-slate-800">{filtered.length}</p>
          <p className="text-xs text-slate-500 mt-1">전체 노티 건수</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-semibold text-emerald-600">{admittedCount}</p>
          <p className="text-xs text-slate-500 mt-1">입원 결정</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-semibold text-red-600">{filtered.filter((r) => r.risk === "HIGH").length}</p>
          <p className="text-xs text-slate-500 mt-1">고위험 케이스</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-semibold text-indigo-600">{lateNightCount}</p>
          <p className="text-xs text-slate-500 mt-1">새벽(00~06시) 노티</p>
        </div>
      </div>

      <div className="space-y-4">
        {byDate.length === 0 && <p className="text-sm text-slate-400">기록이 없습니다.</p>}
        {byDate.map(([date, items]) => (
          <div key={date} className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-slate-700">{date}</h3>
              <span className="text-xs text-slate-400">{items.length}건</span>
            </div>
            <div className="space-y-2">
              {items.map((r) => {
                const expanded = expandedId === r.id;
                const late = isLateNight(r.createdAt);
                return (
                  <div key={r.id} className="border-b border-slate-100 pb-2 last:border-0">
                    <div className="flex items-center justify-between text-sm">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : r.id)}
                        className="flex items-center gap-2 text-left flex-1"
                      >
                        <span className={`chip ${riskColor(r.risk)}`}>{riskLabel(r.risk)}</span>
                        <span className={`chip ${late ? "bg-indigo-100 text-indigo-700 border border-indigo-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                          {timeLabel(r.createdAt)}
                        </span>
                        <span className="font-medium">{r.patientName || "(이름 미기재)"}</span>
                        <span className="text-slate-400">{r.patientSex}/{r.patientAge}</span>
                        <span className="text-slate-500">{r.diagnosisLabel}</span>
                      </button>
                      <div className="flex items-center gap-3 text-slate-400">
                        <span>{r.residentName} ({r.residentLevel})</span>
                        <span>{DISPOSITION_LABEL[r.disposition] ?? "-"}</span>
                        <button onClick={() => setExpandedId(expanded ? null : r.id)} className="text-slate-400 hover:text-slate-600 text-xs" type="button">
                          {expanded ? "접기" : "상세보기"}
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="text-red-400 hover:text-red-600 text-xs border border-red-200 rounded px-2 py-0.5"
                          type="button"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                    {expanded && (
                      <div className="mt-3 bg-slate-50 rounded-lg p-4 text-sm space-y-2 text-slate-600">
                        <p><span className="text-slate-400">담당 교수:</span> {r.professorName || "-"}</p>
                        {r.detail && (
                          <>
                            <p><span className="text-slate-400">기저질환:</span> {r.detail.underlying}</p>
                            <p><span className="text-slate-400">병력:</span> {r.detail.hx}</p>
                            <p><span className="text-slate-400">증상:</span> {r.detail.symptoms.join(", ") || "-"}{r.detail.bt ? ` (BT ${r.detail.bt}도)` : ""}</p>
                            <p><span className="text-slate-400">신체진찰:</span> {r.detail.physicalExam || "-"}</p>
                            <p><span className="text-slate-400">Lab:</span> {r.detail.labSummary || "-"}</p>
                            <p><span className="text-slate-400">Neck CT:</span> {r.detail.ctFinding || "-"}</p>
                            <p><span className="text-slate-400">치료계획:</span> {r.detail.treatmentPlan || "-"}</p>
                            <p><span className="text-slate-400">당시 권장 노티 방식:</span> {r.detail.contactSuggestion}</p>
                          </>
                        )}
                        <details>
                          <summary className="cursor-pointer text-slate-400 text-xs">전체 노티 텍스트 보기</summary>
                          <pre className="whitespace-pre-wrap font-mono text-xs mt-2 bg-white rounded p-3 border border-slate-200">{r.finalText}</pre>
                        </details>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
