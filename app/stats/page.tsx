"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { NotificationRecord } from "@/lib/types";
import { riskColor, riskLabel } from "@/lib/triage";

export default function StatsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<NotificationRecord[]>([]);
  const [residentFilter, setResidentFilter] = useState("전체");

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then(setRecords)
      .catch(() => {});
  }, []);

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

  const admittedCount = filtered.filter((r) => r.admitted).length;

  if (loading || !user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">응급실 입원 통계</h1>
        <select className="input w-48" value={residentFilter} onChange={(e) => setResidentFilter(e.target.value)}>
          {residents.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-semibold text-slate-800">{filtered.length}</p>
          <p className="text-xs text-slate-500 mt-1">전체 노티 건수</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-semibold text-emerald-600">{admittedCount}</p>
          <p className="text-xs text-slate-500 mt-1">입원 처리</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-semibold text-red-600">{filtered.filter((r) => r.risk === "HIGH").length}</p>
          <p className="text-xs text-slate-500 mt-1">고위험 케이스</p>
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
              {items.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`chip ${riskColor(r.risk)}`}>{riskLabel(r.risk)}</span>
                    <span className="font-medium">{r.patientName || "(이름 미기재)"}</span>
                    <span className="text-slate-400">{r.patientSex}/{r.patientAge}</span>
                    <span className="text-slate-500">{r.diagnosisLabel}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <span>{r.residentName} ({r.residentLevel})</span>
                    <span>{r.admitted ? "입원" : "경과관찰"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
