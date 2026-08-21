"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { RESIDENTS } from "@/lib/residents";
import { DEFAULT_DIAGNOSES, DiagnosisRule, RiskLevel } from "@/lib/triage";
import { EvaluationRecord, NotificationRecord, MdtPatient } from "@/lib/types";

const COMPETENCY_LABEL: Record<number, string> = {
  1: "1 - 대부분 상급자 개입 필요",
  2: "2 - 부분적 개입 필요",
  3: "3 - 대체로 단독 가능, 확인 권장",
  4: "4 - 단독 가능, 가끔 확인",
  5: "5 - 단독으로 완전히 가능",
};

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) router.replace("/notify");
  }, [loading, user, router]);

  const residentList = RESIDENTS.filter((r) => !r.isAdmin);

  // --- 평가 폼 ---
  const [evalResident, setEvalResident] = useState(residentList[0]?.id ?? "");
  const [evalDiagnosis, setEvalDiagnosis] = useState(DEFAULT_DIAGNOSES[0].id);
  const [competency, setCompetency] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [note, setNote] = useState("");
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);

  useEffect(() => {
    fetch("/api/evaluations").then((r) => r.json()).then(setEvaluations).catch(() => {});
    fetch("/api/notifications").then((r) => r.json()).then(setNotifications).catch(() => {});
  }, []);

  // --- 다학제(MDT) 환자 목록 ---
  const [mdtList, setMdtList] = useState<MdtPatient[]>([]);
  const [mdtExpandedId, setMdtExpandedId] = useState<string | null>(null);
  const [mdtSiteFilter, setMdtSiteFilter] = useState<"전체" | "구리" | "서울">("전체");
  useEffect(() => {
    fetch("/api/mdt").then((r) => r.json()).then(setMdtList).catch(() => {});
  }, []);
  const mdtFiltered = mdtList.filter((p) => mdtSiteFilter === "전체" || p.site === mdtSiteFilter);

  async function submitEvaluation() {
    if (!user) return;
    const resident = residentList.find((r) => r.id === evalResident);
    const diag = diagnoses.find((d) => d.id === evalDiagnosis);
    const payload: Omit<EvaluationRecord, "id" | "createdAt"> = {
      residentId: evalResident,
      residentName: resident?.name ?? "",
      evaluatorId: user.id,
      diagnosisId: evalDiagnosis,
      diagnosisLabel: diag?.label ?? "",
      competency,
      note,
    };
    const res = await fetch("/api/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setEvaluations((prev) => [{ ...payload, id: data.id, createdAt: new Date().toISOString() }, ...prev]);
    setNote("");
  }

  async function handleDeleteEvaluation(id: string) {
    if (!confirm("이 평가 기록을 삭제할까요?")) return;
    await fetch(`/api/evaluations?id=${id}`, { method: "DELETE" });
    setEvaluations((prev) => prev.filter((e) => e.id !== id));
  }

  // --- 알고리즘 편집 ---
  const [diagnoses, setDiagnoses] = useState<DiagnosisRule[]>(DEFAULT_DIAGNOSES);
  const [algoSaved, setAlgoSaved] = useState(false);
  useEffect(() => {
    fetch("/api/algorithm").then((r) => r.json()).then(setDiagnoses).catch(() => {});
  }, []);

  function updateDiagnosis(id: string, patch: Partial<DiagnosisRule>) {
    setDiagnoses((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  async function saveAlgorithm() {
    await fetch("/api/algorithm", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(diagnoses),
    });
    setAlgoSaved(true);
    setTimeout(() => setAlgoSaved(false), 2000);
  }

  // --- 전공의별 요약 ---
  const summaryByResident = useMemo(() => {
    return residentList.map((r) => {
      const notiCount = notifications.filter((n) => n.residentId === r.id).length;
      const admitCount = notifications.filter((n) => n.residentId === r.id && n.disposition === "admit").length;
      const evals = evaluations.filter((e) => e.residentId === r.id);
      const avgCompetency = evals.length
        ? (evals.reduce((sum, e) => sum + e.competency, 0) / evals.length).toFixed(1)
        : "-";
      return { resident: r, notiCount, admitCount, avgCompetency, evalCount: evals.length };
    });
  }, [notifications, evaluations, residentList]);

  if (loading || !user || !user.isAdmin) return null;

  return (
    <div className="space-y-8 pb-20">
      <h1 className="text-xl font-semibold text-slate-800">관리자</h1>

      {/* 전공의 요약 */}
      <section className="card">
        <h2 className="font-medium text-slate-700 mb-3">전공의별 요약</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-200">
              <th className="py-2">이름</th>
              <th>연차</th>
              <th>노티 건수</th>
              <th>입원 처리</th>
              <th>평균 역량점수</th>
            </tr>
          </thead>
          <tbody>
            {summaryByResident.map((s) => (
              <tr key={s.resident.id} className="border-b border-slate-100 last:border-0">
                <td className="py-2 font-medium">{s.resident.name}</td>
                <td>{s.resident.level}</td>
                <td>{s.notiCount}</td>
                <td>{s.admitCount}</td>
                <td>{s.avgCompetency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 역량 평가 입력 */}
      <section className="card space-y-3">
        <h2 className="font-medium text-slate-700">전공의 역량 평가 입력</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">전공의</label>
            <select className="input" value={evalResident} onChange={(e) => setEvalResident(e.target.value)}>
              {residentList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.level})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">질환</label>
            <select className="input" value={evalDiagnosis} onChange={(e) => setEvalDiagnosis(e.target.value)}>
              {diagnoses.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">역량 점수</label>
            <select className="input" value={competency} onChange={(e) => setCompetency(Number(e.target.value) as any)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {COMPETENCY_LABEL[n]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <textarea className="input min-h-[60px]" placeholder="평가 메모 (선택)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn" onClick={submitEvaluation} type="button">
          평가 저장
        </button>
      </section>

      {/* 평가 기록 */}
      <section className="card">
        <h2 className="font-medium text-slate-700 mb-3">평가 기록</h2>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {evaluations.length === 0 && <p className="text-sm text-slate-400">평가 기록이 없습니다.</p>}
          {evaluations.map((e) => (
            <div key={e.id} className="text-sm border-b border-slate-100 pb-2 last:border-0 flex items-center justify-between">
              <div>
                <span className="font-medium">{e.residentName}</span>
                <span className="text-slate-400 mx-1">·</span>
                <span className="text-slate-500">{e.diagnosisLabel}</span>
                {e.note && <span className="text-slate-400 ml-2">- {e.note}</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">{COMPETENCY_LABEL[e.competency]}</span>
                <button
                  onClick={() => handleDeleteEvaluation(e.id)}
                  className="text-red-400 hover:text-red-600 text-xs border border-red-200 rounded px-2 py-0.5"
                  type="button"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 알고리즘 수정 */}
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-slate-700">응급질환 위험도 알고리즘 수정</h2>
          <button className="btn" onClick={saveAlgorithm} type="button">
            저장
          </button>
        </div>
        {algoSaved && <p className="text-sm text-emerald-600">저장되었습니다.</p>}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-200">
              <th className="py-2">진단명</th>
              <th>기본 위험도</th>
              <th>즉시 입원 대상</th>
            </tr>
          </thead>
          <tbody>
            {diagnoses.map((d) => (
              <tr key={d.id} className="border-b border-slate-100 last:border-0">
                <td className="py-2">{d.label}</td>
                <td>
                  <select
                    className="input !py-1 !w-32"
                    value={d.baseRisk}
                    onChange={(e) => updateDiagnosis(d.id, { baseRisk: e.target.value as RiskLevel })}
                  >
                    <option value="LOW">낮음</option>
                    <option value="MEDIUM">중간</option>
                    <option value="HIGH">높음</option>
                  </select>
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={d.immediateAdmit}
                    onChange={(e) => updateDiagnosis(d.id, { immediateAdmit: e.target.checked })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {/* 다학제(MDT) 환자 목록 */}
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-slate-700">다학제(MDT) 환자 목록 ({mdtFiltered.length}명)</h2>
          <select className="input w-40" value={mdtSiteFilter} onChange={(e) => setMdtSiteFilter(e.target.value as any)}>
            <option value="전체">전체 병원</option>
            <option value="구리">구리병원</option>
            <option value="서울">서울병원</option>
          </select>
        </div>
        <div className="space-y-1">
          {mdtFiltered.length === 0 && <p className="text-sm text-slate-400">저장된 환자가 없습니다.</p>}
          {mdtFiltered.map((p) => {
            const expanded = mdtExpandedId === p.id;
            return (
              <div key={p.id} className="border-b border-slate-100 last:border-0 py-1.5">
                <button
                  type="button"
                  onClick={() => setMdtExpandedId(expanded ? null : p.id)}
                  className="w-full flex items-center justify-between text-sm text-left"
                >
                  <span>
                    <span className="font-medium">{p.name}</span>{" "}
                    <span className="text-slate-400">({p.registrationNo})</span>{" "}
                    <span className="text-slate-500">· {p.site}병원 · {p.diagnosis || "진단명 미기재"}</span>
                  </span>
                  <span className="text-slate-400 text-xs">{expanded ? "접기" : "세부사항"}</span>
                </button>
                {expanded && (
                  <div className="mt-2 bg-slate-50 rounded-lg p-3 text-sm text-slate-600 space-y-2">
                    <p>
                      <span className="text-slate-400">성별/나이:</span> {p.sex}/{p.age} ·{" "}
                      <span className="text-slate-400">등록일:</span> {new Date(p.createdAt).toLocaleString("ko-KR")}
                    </p>
                    <pre className="whitespace-pre-wrap font-mono text-xs bg-white rounded p-3 border border-slate-200">
                      {p.summary || "(요약 없음)"}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
