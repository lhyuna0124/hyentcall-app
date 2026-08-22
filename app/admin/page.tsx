"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { RESIDENTS } from "@/lib/residents";
import { DEFAULT_DIAGNOSES, DiagnosisRule, RiskLevel } from "@/lib/triage";
import { EvaluationRecord, NotificationRecord, MdtPatient, QuickLink, FeedbackRecord } from "@/lib/types";

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

  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);

  useEffect(() => {
    fetch("/api/evaluations").then((r) => r.json()).then(setEvaluations).catch(() => {});
    fetch("/api/notifications").then((r) => r.json()).then(setNotifications).catch(() => {});
  }, []);

  // --- 알고리즘 편집 (평가 폼보다 먼저 선언 필요) ---
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

  // --- 전공의별 일괄 역량 평가 ---
  const [evalResident, setEvalResident] = useState(residentList[0]?.id ?? "");
  const [bulkScores, setBulkScores] = useState<Record<string, number | "">>({});
  const [bulkNote, setBulkNote] = useState("");
  const [quickScore, setQuickScore] = useState<number>(5);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkSaved, setBulkSaved] = useState(false);

  // 선택한 전공의의 진단명별 "가장 최근" 평가 점수를 불러와 초기값으로 채워줍니다.
  const latestScoresForResident = useMemo(() => {
    const map: Record<string, number> = {};
    const mine = evaluations.filter((e) => e.residentId === evalResident);
    for (const d of diagnoses) {
      const forDx = mine.filter((e) => e.diagnosisId === d.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      if (forDx.length) map[d.id] = forDx[0].competency;
    }
    return map;
  }, [evaluations, evalResident, diagnoses]);

  useEffect(() => {
    const init: Record<string, number | ""> = {};
    diagnoses.forEach((d) => {
      init[d.id] = latestScoresForResident[d.id] ?? "";
    });
    setBulkScores(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evalResident, diagnoses.length]);

  function applyQuickScoreToAll() {
    const next: Record<string, number | ""> = {};
    diagnoses.forEach((d) => (next[d.id] = quickScore));
    setBulkScores(next);
  }

  async function saveBulkEvaluations() {
    if (!user) return;
    const resident = residentList.find((r) => r.id === evalResident);
    if (!resident) return;
    const changed = diagnoses.filter((d) => {
      const val = bulkScores[d.id];
      return val !== "" && val !== (latestScoresForResident[d.id] ?? "");
    });
    if (changed.length === 0) {
      alert("변경된 평가 점수가 없습니다.");
      return;
    }
    setBulkSaving(true);
    const results = await Promise.all(
      changed.map(async (d) => {
        const payload: Omit<EvaluationRecord, "id" | "createdAt"> = {
          residentId: resident.id,
          residentName: resident.name,
          evaluatorId: user.id,
          diagnosisId: d.id,
          diagnosisLabel: d.label,
          competency: bulkScores[d.id] as 1 | 2 | 3 | 4 | 5,
          note: bulkNote || undefined,
        };
        const res = await fetch("/api/evaluations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        return { ...payload, id: data.id, createdAt: new Date().toISOString() } as EvaluationRecord;
      })
    );
    setEvaluations((prev) => [...results, ...prev]);
    setBulkNote("");
    setBulkSaving(false);
    setBulkSaved(true);
    setTimeout(() => setBulkSaved(false), 2000);
  }

  // --- 다학제(MDT) 환자 목록 ---
  const [mdtList, setMdtList] = useState<MdtPatient[]>([]);
  const [mdtExpandedId, setMdtExpandedId] = useState<string | null>(null);
  const [mdtSiteFilter, setMdtSiteFilter] = useState<"전체" | "구리" | "서울">("전체");
  useEffect(() => {
    fetch("/api/mdt").then((r) => r.json()).then(setMdtList).catch(() => {});
  }, []);
  const mdtFiltered = mdtList.filter((p) => mdtSiteFilter === "전체" || p.site === mdtSiteFilter);

  // --- Staff 일정 / 공지 게시판 ---
  const [boardContent, setBoardContent] = useState("");
  const [boardSaving, setBoardSaving] = useState(false);
  const [boardSaved, setBoardSaved] = useState(false);
  useEffect(() => {
    fetch("/api/board").then((r) => r.json()).then((d) => setBoardContent(d.content || "")).catch(() => {});
  }, []);

  async function saveBoard() {
    setBoardSaving(true);
    await fetch("/api/board", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: boardContent }) });
    setBoardSaving(false);
    setBoardSaved(true);
    setTimeout(() => setBoardSaved(false), 2000);
  }

  // --- 바로가기 링크 (우측 하단 위젯) ---
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
  const [quickLinksSaving, setQuickLinksSaving] = useState(false);
  const [quickLinksSaved, setQuickLinksSaved] = useState(false);
  useEffect(() => {
    fetch("/api/quicklinks").then((r) => r.json()).then(setQuickLinks).catch(() => {});
  }, []);

  function addQuickLink() {
    setQuickLinks((prev) => [...prev, { id: crypto.randomUUID(), label: "", url: "" }]);
  }

  function updateQuickLink(id: string, patch: Partial<QuickLink>) {
    setQuickLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeQuickLink(id: string) {
    setQuickLinks((prev) => prev.filter((l) => l.id !== id));
  }

  async function saveQuickLinks() {
    setQuickLinksSaving(true);
    const valid = quickLinks.filter((l) => l.label.trim() && l.url.trim());
    await fetch("/api/quicklinks", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(valid) });
    setQuickLinks(valid);
    setQuickLinksSaving(false);
    setQuickLinksSaved(true);
    setTimeout(() => setQuickLinksSaved(false), 2000);
  }

  // --- 건의사항함 ---
  const [feedbackList, setFeedbackList] = useState<FeedbackRecord[]>([]);
  useEffect(() => {
    fetch("/api/feedback").then((r) => r.json()).then(setFeedbackList).catch(() => {});
  }, []);

  async function handleDeleteFeedback(id: string) {
    await fetch(`/api/feedback?id=${id}`, { method: "DELETE" });
    setFeedbackList((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleDeleteEvaluation(id: string) {
    if (!confirm("이 평가 기록을 삭제할까요?")) return;
    await fetch(`/api/evaluations?id=${id}`, { method: "DELETE" });
    setEvaluations((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleDeleteMdt(id: string) {
    if (!confirm("이 다학제 환자 기록을 삭제할까요? 되돌릴 수 없습니다.")) return;
    await fetch(`/api/mdt?id=${id}`, { method: "DELETE" });
    setMdtList((prev) => prev.filter((p) => p.id !== id));
    if (mdtExpandedId === id) setMdtExpandedId(null);
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
      <h1 className="text-xl font-bold text-brand-700">⚙️ 관리자</h1>

      {/* Staff 일정 / 공지 게시판 */}
      <section className="card space-y-2">
        <h2 className="font-medium text-slate-700">Staff 일정 / 공지 게시판</h2>
        <p className="text-xs text-slate-400">
          여기에 적은 내용이 모든 로그인 사용자 화면 오른쪽 사이드바(넓은 화면에서만)에 표시됩니다. 예: 교수님 해외학회/휴진 안내, 주간 staff 순번 등을 자유 형식으로 적어두세요.
        </p>
        <textarea
          className="input min-h-[140px] font-mono text-sm"
          placeholder={"예)\n8/30-9/5 이현아 교수님 해외학회, 노티 X\n\n[주간 Staff]\n9/5-9/11 곽진혜\n9/12-9/18 이현아\n9/19-9/25 박민규"}
          value={boardContent}
          onChange={(e) => setBoardContent(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <button className="btn" onClick={saveBoard} type="button" disabled={boardSaving}>
            {boardSaving ? "저장 중..." : "게시판 저장"}
          </button>
          {boardSaved && <span className="text-sm text-emerald-600">저장되었습니다.</span>}
        </div>
      </section>

      {/* 바로가기 링크 (우측 하단 위젯) */}
      <section className="card space-y-3">
        <h2 className="font-medium text-slate-700">바로가기 링크 (우측 하단 위젯)</h2>
        <p className="text-xs text-slate-400">
          여기에 추가한 링크는 모든 로그인 사용자 화면의 우측 하단 버튼을 눌렀을 때 나타납니다. 예: 논문 아카이브 시스템 등.
        </p>
        <div className="space-y-2">
          {quickLinks.map((l) => (
            <div key={l.id} className="flex items-center gap-2">
              <input
                className="input flex-1"
                placeholder="이름 (예: 논문 아카이브 시스템)"
                value={l.label}
                onChange={(e) => updateQuickLink(l.id, { label: e.target.value })}
              />
              <input
                className="input flex-1"
                placeholder="https://..."
                value={l.url}
                onChange={(e) => updateQuickLink(l.id, { url: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeQuickLink(l.id)}
                className="text-red-400 hover:text-red-600 text-xs border border-red-200 rounded px-2 py-1.5 flex-shrink-0"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-outline" type="button" onClick={addQuickLink}>
            + 링크 추가
          </button>
          <button className="btn" type="button" onClick={saveQuickLinks} disabled={quickLinksSaving}>
            {quickLinksSaving ? "저장 중..." : "저장"}
          </button>
          {quickLinksSaved && <span className="text-sm text-emerald-600">저장되었습니다.</span>}
        </div>
      </section>

      {/* 건의사항함 */}
      <section className="card space-y-2">
        <h2 className="font-medium text-slate-700">건의사항함 ({feedbackList.length}건)</h2>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {feedbackList.length === 0 && <p className="text-sm text-slate-400">접수된 건의사항이 없습니다.</p>}
          {feedbackList.map((f) => (
            <div key={f.id} className="text-sm border-b border-slate-100 pb-2 last:border-0">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {f.residentName} <span className="text-slate-400 font-normal">· {new Date(f.createdAt).toLocaleString("ko-KR")}</span>
                </span>
                <button
                  onClick={() => handleDeleteFeedback(f.id)}
                  className="text-red-400 hover:text-red-600 text-xs border border-red-200 rounded px-2 py-0.5"
                  type="button"
                >
                  삭제
                </button>
              </div>
              <p className="text-slate-600 whitespace-pre-wrap mt-1">{f.message}</p>
            </div>
          ))}
        </div>
      </section>

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

      {/* 역량 평가 입력 (전공의별 일괄) */}
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-slate-700">전공의별 역량 평가 (일괄 입력)</h2>
          <select className="input w-48" value={evalResident} onChange={(e) => setEvalResident(e.target.value)}>
            {residentList.map((r) => (
              <option key={r.id} value={r.id}>{r.name} ({r.level})</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-3">
          <span className="text-sm text-slate-600">고년차라 대부분 개입이 필요 없다면, 한 번에</span>
          <select className="input !w-auto !py-1" value={quickScore} onChange={(e) => setQuickScore(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((n) => (<option key={n} value={n}>{n}점</option>))}
          </select>
          <button className="btn-outline !py-1" type="button" onClick={applyQuickScoreToAll}>전체 질환에 적용</button>
          <span className="text-xs text-slate-400">→ 아래에서 예외인 질환만 따로 낮춰서 저장하세요.</span>
        </div>

        <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-slate-400 border-b border-slate-200">
                <th className="py-2 px-3">진단명</th>
                <th className="px-3">기존 최근 점수</th>
                <th className="px-3">새 점수</th>
              </tr>
            </thead>
            <tbody>
              {diagnoses.map((d) => (
                <tr key={d.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-1.5 px-3">{d.label}</td>
                  <td className="px-3 text-slate-400">{latestScoresForResident[d.id] ?? "-"}</td>
                  <td className="px-3">
                    <select
                      className="input !py-1 !w-36"
                      value={bulkScores[d.id] ?? ""}
                      onChange={(e) => setBulkScores((prev) => ({ ...prev, [d.id]: e.target.value ? (Number(e.target.value) as any) : "" }))}
                    >
                      <option value="">평가 안함</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{COMPETENCY_LABEL[n]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <textarea className="input min-h-[50px]" placeholder="이번 평가에 공통으로 남길 메모 (선택)" value={bulkNote} onChange={(e) => setBulkNote(e.target.value)} />
        <div className="flex items-center gap-3">
          <button className="btn" onClick={saveBulkEvaluations} type="button" disabled={bulkSaving}>
            {bulkSaving ? "저장 중..." : "변경된 점수 저장"}
          </button>
          {bulkSaved && <span className="text-sm text-emerald-600">저장되었습니다.</span>}
        </div>
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
                    <button
                      onClick={() => handleDeleteMdt(p.id)}
                      className="text-red-400 hover:text-red-600 text-xs border border-red-200 rounded px-2 py-1"
                      type="button"
                    >
                      이 환자 기록 삭제
                    </button>
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
