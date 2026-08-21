"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { DEFAULT_DIAGNOSES, DiagnosisRule, RiskLevel, riskColor, riskLabel } from "@/lib/triage";
import { parseLabText, formatLabSummary, ParsedLab } from "@/lib/labRules";
import { EvaluationRecord, Disposition, DISPOSITION_LABEL, PROFESSORS } from "@/lib/types";
import { suggestContact, ContactSuggestion } from "@/lib/contactPolicy";

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: "" | "-" | "+" | "±";
  onChange: (v: "" | "-" | "+" | "±") => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-700">{label}</span>
      <div className="flex gap-1">
        {(["-", "±", "+"] as const).map((v) => (
          <button
            type="button"
            key={v}
            onClick={() => onChange(value === v ? "" : v)}
            className={`w-8 h-8 rounded-md text-xs font-semibold border ${
              value === v
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white text-slate-500 border-slate-300 hover:bg-slate-50"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

function MultiCheck({
  options,
  values,
  onChange,
}: {
  options: string[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(opt: string) {
    if (values.includes(opt)) onChange(values.filter((v) => v !== opt));
    else onChange([...values, opt]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          type="button"
          key={opt}
          onClick={() => toggle(opt)}
          className={`chip border ${
            values.includes(opt)
              ? "bg-brand-600 text-white border-brand-600"
              : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

interface FormSnapshot {
  patientName: string;
  age: string;
  sex: "M" | "F";
  diagnosisId: string;
  underlying: boolean;
  underlyingItems: string[];
  underlyingEtc: string;
  antiplatelet: string[];
  onsetValue: string;
  onsetUnit: string;
  hx: string;
  symptoms: string[];
  bt: string;
  tonsilFindings: string[];
  ptBulging: "" | "-" | "+" | "±";
  uvulaDeviation: "" | "Lt" | "Rt";
  epiSwelling: "" | "-" | "+" | "±";
  epiCyst: "" | "-" | "+" | "±";
  epiEdema: "" | "-" | "+" | "±";
  larynxSwelling: "" | "-" | "+" | "±";
  lateralWallSwelling: "" | "-" | "+" | "±";
  tvcVisible: "visible" | "not_visible" | "";
  labText: string;
  ctReadType: "구두판독" | "정식판독";
  ctFinding: string;
  treatReasons: string[];
  extraNote: string;
  professorName: string;
  antiPlan: "double" | "triple" | "";
  dexa: "" | "-" | "+";
  dexaFreq: string;
  careLevel: string[];
}

export default function NotifyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  const [diagnoses, setDiagnoses] = useState<DiagnosisRule[]>(DEFAULT_DIAGNOSES);
  useEffect(() => {
    fetch("/api/algorithm")
      .then((r) => r.json())
      .then((d) => setDiagnoses(d))
      .catch(() => {});
  }, []);

  // 본인의 질환별 역량 평가 기록 (노티 방식 산출에 사용)
  const [myEvaluations, setMyEvaluations] = useState<EvaluationRecord[]>([]);
  useEffect(() => {
    if (!user) return;
    fetch("/api/evaluations")
      .then((r) => r.json())
      .then((all: EvaluationRecord[]) => setMyEvaluations(all.filter((e) => e.residentId === user.id)))
      .catch(() => {});
  }, [user]);

  // --- 환자 기본 정보 ---
  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"M" | "F">("M");
  const [diagnosisId, setDiagnosisId] = useState(DEFAULT_DIAGNOSES[0].id);

  // --- 기저질환 ---
  const [underlying, setUnderlying] = useState(false);
  const [underlyingItems, setUnderlyingItems] = useState<string[]>([]);
  const [underlyingEtc, setUnderlyingEtc] = useState("");
  const [antiplatelet, setAntiplatelet] = useState<string[]>([]);

  // --- 병력 ---
  const [onsetValue, setOnsetValue] = useState("");
  const [onsetUnit, setOnsetUnit] = useState("일");
  const [hx, setHx] = useState("");

  // --- 증상 ---
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [bt, setBt] = useState("");

  // --- 신체진찰 ---
  const [tonsilFindings, setTonsilFindings] = useState<string[]>([]);
  const [ptBulging, setPtBulging] = useState<"" | "-" | "+" | "±">("");
  const [uvulaDeviation, setUvulaDeviation] = useState<"" | "Lt" | "Rt">("");
  const [epiSwelling, setEpiSwelling] = useState<"" | "-" | "+" | "±">("");
  const [epiCyst, setEpiCyst] = useState<"" | "-" | "+" | "±">("");
  const [epiEdema, setEpiEdema] = useState<"" | "-" | "+" | "±">("");
  const [larynxSwelling, setLarynxSwelling] = useState<"" | "-" | "+" | "±">("");
  const [lateralWallSwelling, setLateralWallSwelling] = useState<"" | "-" | "+" | "±">("");
  const [tvcVisible, setTvcVisible] = useState<"visible" | "not_visible" | "">("");

  // --- Lab / CT ---
  const [labText, setLabText] = useState("");
  const parsedLabs: ParsedLab[] = useMemo(() => parseLabText(labText), [labText]);
  const [ctReadType, setCtReadType] = useState<"구두판독" | "정식판독">("구두판독");
  const [ctFinding, setCtFinding] = useState("");

  // --- 치료 계획 ---
  const [treatReasons, setTreatReasons] = useState<string[]>([]);
  const [extraNote, setExtraNote] = useState("");
  const [professorName, setProfessorName] = useState<string>(PROFESSORS[0]);
  const [antiPlan, setAntiPlan] = useState<"double" | "triple" | "">("");
  const [dexa, setDexa] = useState<"" | "-" | "+">("");
  const [dexaFreq, setDexaFreq] = useState("BID");
  const [careLevel, setCareLevel] = useState<string[]>([]);

  // --- 아코디언 열림 상태 (생성 후 자동으로 접기 위함) ---
  const [openSections, setOpenSections] = useState({
    underlying: true,
    hxSymptoms: true,
    exam: true,
    labCt: true,
    plan: true,
  });

  const selectedDiagnosis = diagnoses.find((d) => d.id === diagnosisId) ?? diagnoses[0];

  const risk: RiskLevel = useMemo(() => {
    let r = selectedDiagnosis?.baseRisk ?? "LOW";
    if (tvcVisible === "not_visible") r = "HIGH";
    if (epiSwelling === "+" && symptoms.includes("Dyspnea")) r = "HIGH";
    return r;
  }, [selectedDiagnosis, tvcVisible, epiSwelling, symptoms]);

  // 현재 진단명에 대한 본인의 평균 역량 점수 (평가 기록 없으면 null)
  const myCompetency = useMemo(() => {
    const relevant = myEvaluations.filter((e) => e.diagnosisId === diagnosisId);
    if (!relevant.length) return null;
    return relevant.reduce((sum, e) => sum + e.competency, 0) / relevant.length;
  }, [myEvaluations, diagnosisId]);

  const [finalText, setFinalText] = useState("");
  const [contactSuggestion, setContactSuggestion] = useState<ContactSuggestion | null>(null);
  const [saved, setSaved] = useState(false);
  const [disposition, setDisposition] = useState<Disposition>("admit");

  // --- 임시저장 ---
  const draftKey = user ? `entcall_draft_${user.id}` : null;
  const [draftOffered, setDraftOffered] = useState(false);

  function currentSnapshot(): FormSnapshot {
    return {
      patientName, age, sex, diagnosisId,
      underlying, underlyingItems, underlyingEtc, antiplatelet,
      onsetValue, onsetUnit, hx,
      symptoms, bt,
      tonsilFindings, ptBulging, uvulaDeviation, epiSwelling, epiCyst, epiEdema,
      larynxSwelling, lateralWallSwelling, tvcVisible,
      labText, ctReadType, ctFinding,
      treatReasons, extraNote, professorName, antiPlan, dexa, dexaFreq, careLevel,
    };
  }

  function applySnapshot(s: FormSnapshot) {
    setPatientName(s.patientName); setAge(s.age); setSex(s.sex); setDiagnosisId(s.diagnosisId);
    setUnderlying(s.underlying); setUnderlyingItems(s.underlyingItems); setUnderlyingEtc(s.underlyingEtc); setAntiplatelet(s.antiplatelet);
    setOnsetValue(s.onsetValue); setOnsetUnit(s.onsetUnit); setHx(s.hx);
    setSymptoms(s.symptoms); setBt(s.bt);
    setTonsilFindings(s.tonsilFindings); setPtBulging(s.ptBulging); setUvulaDeviation(s.uvulaDeviation);
    setEpiSwelling(s.epiSwelling); setEpiCyst(s.epiCyst); setEpiEdema(s.epiEdema);
    setLarynxSwelling(s.larynxSwelling); setLateralWallSwelling(s.lateralWallSwelling); setTvcVisible(s.tvcVisible);
    setLabText(s.labText); setCtReadType(s.ctReadType); setCtFinding(s.ctFinding);
    setTreatReasons(s.treatReasons); setExtraNote(s.extraNote); setProfessorName(s.professorName || PROFESSORS[0]);
    setAntiPlan(s.antiPlan); setDexa(s.dexa); setDexaFreq(s.dexaFreq); setCareLevel(s.careLevel);
  }

  // 최초 진입 시 임시저장본이 있으면 복원 여부 확인
  useEffect(() => {
    if (!draftKey || draftOffered) return;
    const raw = localStorage.getItem(draftKey);
    if (raw) {
      try {
        const snap = JSON.parse(raw) as FormSnapshot;
        if (confirm("임시저장된 작성 중인 노티가 있습니다. 이어서 작성하시겠습니까?")) {
          applySnapshot(snap);
        }
      } catch {}
    }
    setDraftOffered(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  const [draftSaved, setDraftSaved] = useState(false);
  function saveDraft() {
    if (!draftKey) return;
    localStorage.setItem(draftKey, JSON.stringify(currentSnapshot()));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 1500);
  }
  function clearDraft() {
    if (!draftKey) return;
    localStorage.removeItem(draftKey);
  }

  function buildPhysicalExamText() {
    const parts: string[] = [];
    if (tonsilFindings.length) parts.push(`Tonsil: ${tonsilFindings.join(", ")}`);
    if (ptBulging) parts.push(`Peritonsillar bulging (${ptBulging})${uvulaDeviation ? `, uvula deviation ${uvulaDeviation}` : ""}`);
    const epiParts: string[] = [];
    if (epiSwelling) epiParts.push(`swelling ${epiSwelling}`);
    if (epiCyst) epiParts.push(`cyst ${epiCyst}`);
    if (epiEdema) epiParts.push(`mucosal edema ${epiEdema}`);
    if (epiParts.length) parts.push(`Epiglottis: ${epiParts.join(", ")}`);
    if (larynxSwelling) parts.push(`Larynx diffuse swelling ${larynxSwelling}`);
    if (lateralWallSwelling) parts.push(`Lateral pharyngeal wall swelling ${lateralWallSwelling}`);
    return parts.join(" / ");
  }

  function buildText() {
    const lines: string[] = [];
    lines.push("[응급실 환자 노티드립니다.]");
    lines.push("");
    lines.push(`${patientName || "ㅇㅇㅇ"} ${sex}/${age || "-"} ${selectedDiagnosis?.label ?? ""}`);
    lines.push("");

    if (underlying) {
      const items = [...underlyingItems];
      if (underlyingEtc) items.push(underlyingEtc);
      const anti = antiplatelet.length ? ` (${antiplatelet.join(", ")} 복용)` : "";
      lines.push(`기저질환 (+, ${items.join(", ")}${anti})`);
    } else {
      lines.push("기저질환 (-)");
    }

    if (onsetValue || hx) {
      lines.push(`내원 ${onsetValue}${onsetUnit} 전부터 ${hx}`);
    }

    if (symptoms.length || bt) {
      lines.push(`증상: ${symptoms.join(" ")}${bt ? ` (BT ${bt}도)` : ""}`);
    }

    lines.push("");
    lines.push("신체진찰 상");
    const examText = buildPhysicalExamText();
    if (examText) lines.push(examText.split(" / ").join("\n"));

    lines.push("");
    const labSummary = formatLabSummary(parsedLabs);
    let labLine = "Lab 상";
    if (labSummary) labLine += ` ${labSummary} 확인되며,`;
    if (ctFinding) labLine += ` Neck CT (CE) ${ctReadType} 상 ${ctFinding} 확인됩니다.`;
    lines.push(labLine);

    lines.push("");
    if (treatReasons.length) {
      lines.push(`${treatReasons.join(", ")} 위해 입원 권유드렸으며 환자분 동의하시어${extraNote ? ` (${extraNote})` : ""}`);
    }
    lines.push(`${professorName} 교수님 노티드리고 입원장 발부하였습니다.`);

    const planParts: string[] = ["NPO 유지"];
    if (antiPlan === "double") planParts.push("IV double anti (Peratam/Fullgram)");
    if (antiPlan === "triple") planParts.push("IV triple anti");
    if (dexa === "+") planParts.push(`Dexa 사용, 1앰플 ${dexaFreq}`);
    if (careLevel.length) planParts.push(`${careLevel.join(", ")} 하기로 하였습니다`);
    lines.push(`입원하여 ${planParts.join(", ")}.`);

    const text = lines.join("\n");
    setFinalText(text);

    const s = suggestContact(risk, myCompetency);
    setContactSuggestion(s);

    // 미리보기 생성 시 입력 섹션들을 자동으로 접어서 결과가 잘 보이게 함
    setOpenSections({ underlying: false, hxSymptoms: false, exam: false, labCt: false, plan: false });

    return { text, s };
  }

  async function handleFinalSave() {
    const { text, s } = buildText();
    if (!user) return;
    const payload = {
      residentId: user.id,
      residentName: user.name,
      residentLevel: user.level,
      patientName,
      patientAge: age,
      patientSex: sex,
      diagnosisId,
      diagnosisLabel: selectedDiagnosis?.label ?? "",
      risk,
      disposition,
      professorName,
      finalText: text,
      detail: {
        underlying: underlying ? [...underlyingItems, underlyingEtc].filter(Boolean).join(", ") : "없음",
        hx: `${onsetValue}${onsetUnit} 전부터 ${hx}`,
        symptoms,
        bt,
        tonsilFindings,
        physicalExam: buildPhysicalExamText(),
        labSummary: formatLabSummary(parsedLabs),
        ctFinding,
        treatmentPlan: [
          antiPlan === "double" ? "Double anti" : antiPlan === "triple" ? "Triple anti" : "",
          dexa === "+" ? `Dexa ${dexaFreq}` : "",
          careLevel.join(", "),
        ].filter(Boolean).join(" / "),
        contactSuggestion: `${s.method} - ${s.detail}`,
      },
    };
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    clearDraft();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function copyToClipboard() {
    const text = finalText || buildText().text;
    navigator.clipboard.writeText(text);
  }

  if (loading || !user) return null;

  const suggestionColor =
    risk === "HIGH"
      ? "bg-red-50 border-red-200 text-red-700"
      : risk === "MEDIUM"
      ? "bg-amber-50 border-amber-200 text-amber-700"
      : "bg-emerald-50 border-emerald-200 text-emerald-700";

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">응급 노티 작성</h1>
        <div className="flex items-center gap-2">
          <span className={`chip ${riskColor(risk)}`}>위험도: {riskLabel(risk)}</span>
          <button type="button" onClick={saveDraft} className="btn-outline !px-3 !py-1.5 text-xs">
            임시저장
          </button>
          {draftSaved && <span className="text-xs text-emerald-600">저장됨</span>}
        </div>
      </div>

      {selectedDiagnosis?.immediateAdmit && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
          이 진단은 즉시 입원 대상으로 분류됩니다 (airway trauma / postop bleeding / deep neck infection 등).
        </div>
      )}

      {/* 환자 기본정보 */}
      <section className="card space-y-3">
        <h2 className="font-medium text-slate-700">환자 기본 정보</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="label">환자 이름</label>
            <input className="input" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="예: 김상민" />
          </div>
          <div>
            <label className="label">나이</label>
            <input className="input" value={age} onChange={(e) => setAge(e.target.value)} placeholder="36" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">성별</label>
            <div className="flex gap-2">
              {(["M", "F"] as const).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setSex(s)}
                  className={`px-4 py-2 rounded-lg text-sm border ${sex === s ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">진단명</label>
            <select className="input" value={diagnosisId} onChange={(e) => setDiagnosisId(e.target.value)}>
              {diagnoses.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-slate-400">환자 등록번호는 개인정보 이슈로 저장하지 않습니다. 날짜/시간은 자동 기록되어 의무기록 조회로 특정할 수 있습니다.</p>
      </section>

      {/* 기저질환 */}
      <details className="acc" open={openSections.underlying} onToggle={(e) => setOpenSections((p) => ({ ...p, underlying: (e.target as HTMLDetailsElement).open }))}>
        <summary>
          기저질환 {underlying && <span className="chip bg-brand-50 text-brand-700 border border-brand-200 ml-2">입력됨</span>}
        </summary>
        <div className="acc-body">
          <button type="button" onClick={() => setUnderlying((v) => !v)} className={`chip border ${underlying ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}>
            {underlying ? "있음 (+)" : "없음 (-)"}
          </button>
          {underlying && (
            <div className="space-y-3">
              <MultiCheck options={["HTN", "DM", "Tbc", "Asthma"]} values={underlyingItems} onChange={setUnderlyingItems} />
              <input className="input" placeholder="기타 기저질환" value={underlyingEtc} onChange={(e) => setUnderlyingEtc(e.target.value)} />
              <div>
                <label className="label">항혈소판제 복용</label>
                <MultiCheck options={["Aspirin", "Clopidogrel"]} values={antiplatelet} onChange={setAntiplatelet} />
              </div>
            </div>
          )}
        </div>
      </details>

      {/* 병력/증상 */}
      <details className="acc" open={openSections.hxSymptoms} onToggle={(e) => setOpenSections((p) => ({ ...p, hxSymptoms: (e.target as HTMLDetailsElement).open }))}>
        <summary>병력 및 증상</summary>
        <div className="acc-body">
          <div className="flex gap-2 items-center">
            <span className="text-sm text-slate-600">내원</span>
            <input className="input w-20" value={onsetValue} onChange={(e) => setOnsetValue(e.target.value)} placeholder="5" />
            <select className="input w-20" value={onsetUnit} onChange={(e) => setOnsetUnit(e.target.value)}>
              <option value="일">일</option>
              <option value="시간">시간</option>
              <option value="주">주</option>
            </select>
            <span className="text-sm text-slate-600">전부터</span>
          </div>
          <textarea className="input min-h-[70px]" placeholder="증상 경과 및 hx" value={hx} onChange={(e) => setHx(e.target.value)} />
          <div>
            <label className="label">증상</label>
            <MultiCheck options={["Fever", "Chill", "Odynophagia", "Dyspnea", "Dysphagia", "Sore throat"]} values={symptoms} onChange={setSymptoms} />
          </div>
          <div className="w-40">
            <label className="label">BT (fever 시)</label>
            <input className="input" value={bt} onChange={(e) => setBt(e.target.value)} placeholder="38.5" />
          </div>
        </div>
      </details>

      {/* 신체진찰 */}
      <details className="acc" open={openSections.exam} onToggle={(e) => setOpenSections((p) => ({ ...p, exam: (e.target as HTMLDetailsElement).open }))}>
        <summary>신체진찰</summary>
        <div className="acc-body">
          <div className="pb-2">
            <label className="label">Tonsil 소견 (복수 선택)</label>
            <MultiCheck options={["Enlargement", "Injection", "Whitish patch", "With ulceration", "Mass", "s/p tonsillectomy state"]} values={tonsilFindings} onChange={setTonsilFindings} />
          </div>
          <Toggle label="Peritonsillar bulging" value={ptBulging} onChange={setPtBulging} />
          {ptBulging && ptBulging !== "-" && (
            <div className="flex items-center gap-2 py-1.5 border-b border-slate-100">
              <span className="text-sm text-slate-600">Uvula deviation</span>
              {(["Lt", "Rt"] as const).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setUvulaDeviation(uvulaDeviation === s ? "" : s)}
                  className={`px-3 py-1 rounded-md text-xs border ${uvulaDeviation === s ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <Toggle label="Epiglottis swelling" value={epiSwelling} onChange={setEpiSwelling} />
          <Toggle label="Epiglottis cyst" value={epiCyst} onChange={setEpiCyst} />
          <Toggle label="Epiglottis mucosal edema" value={epiEdema} onChange={setEpiEdema} />
          <Toggle label="Larynx diffuse swelling" value={larynxSwelling} onChange={setLarynxSwelling} />
          <Toggle label="Lateral pharyngeal wall swelling" value={lateralWallSwelling} onChange={setLateralWallSwelling} />
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-slate-700">True vocal cord 확인</span>
            <div className="flex gap-1">
              {[
                { v: "visible", label: "확인됨" },
                { v: "not_visible", label: "확인 안됨" },
              ].map((o) => (
                <button
                  type="button"
                  key={o.v}
                  onClick={() => setTvcVisible(tvcVisible === o.v ? "" : (o.v as any))}
                  className={`px-3 py-1.5 rounded-md text-xs border ${tvcVisible === o.v ? "bg-red-600 text-white border-red-600" : "border-slate-300 text-slate-600"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-400 pt-1">* TVC 확인 여부는 노티장 문구에는 포함되지 않고, 위험도 산정에만 사용됩니다.</p>
        </div>
      </details>

      {/* Lab / CT */}
      <details className="acc" open={openSections.labCt} onToggle={(e) => setOpenSections((p) => ({ ...p, labCt: (e.target as HTMLDetailsElement).open }))}>
        <summary>Lab / Neck CT</summary>
        <div className="acc-body">
          <div>
            <label className="label">Lab 결과 붙여넣기 (자동 인식)</label>
            <textarea className="input min-h-[80px] font-mono text-xs" placeholder="예: WBC 12200 CRP 26.59 AST 88 ALT 56 eGFR 30" value={labText} onChange={(e) => setLabText(e.target.value)} />
          </div>
          {parsedLabs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {parsedLabs.map((p) => (
                <span key={p.key} className={`chip border ${p.status === "high" ? "bg-red-50 text-red-600 border-red-200" : p.status === "low" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                  {p.label} {p.value} {p.arrow}
                </span>
              ))}
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">CT 판독 구분</label>
              <select className="input" value={ctReadType} onChange={(e) => setCtReadType(e.target.value as any)}>
                <option value="구두판독">구두판독</option>
                <option value="정식판독">정식판독</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Neck CT 소견</label>
              <input className="input" placeholder="예: both AFT, phlegmonous status" value={ctFinding} onChange={(e) => setCtFinding(e.target.value)} />
            </div>
          </div>
        </div>
      </details>

      {/* 치료 계획 */}
      <details className="acc" open={openSections.plan} onToggle={(e) => setOpenSections((p) => ({ ...p, plan: (e.target as HTMLDetailsElement).open }))}>
        <summary>치료 계획 / 입원</summary>
        <div className="acc-body">
          <div>
            <label className="label">입원 사유 (복수 선택)</label>
            <MultiCheck options={["IV anti", "급성기 증상조절", "Nutritional support", "V/S close monitoring"]} values={treatReasons} onChange={setTreatReasons} />
          </div>
          <textarea className="input min-h-[50px]" placeholder="추가 특이사항 (선택)" value={extraNote} onChange={(e) => setExtraNote(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">담당 교수님</label>
              <select className="input" value={professorName} onChange={(e) => setProfessorName(e.target.value)}>
                {PROFESSORS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Antibiotics plan</label>
              <select className="input" value={antiPlan} onChange={(e) => setAntiPlan(e.target.value as any)}>
                <option value="">선택</option>
                <option value="double">Double anti (Peratam/Fullgram)</option>
                <option value="triple">Triple anti</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="label">Dexa 사용</label>
              <div className="flex gap-2">
                {(["-", "+"] as const).map((v) => (
                  <button type="button" key={v} onClick={() => setDexa(dexa === v ? "" : v)} className={`w-10 h-9 rounded-md text-xs font-semibold border ${dexa === v ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-500"}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            {dexa === "+" && (
              <div>
                <label className="label">투여 빈도</label>
                <select className="input" value={dexaFreq} onChange={(e) => setDexaFreq(e.target.value)}>
                  <option value="BID">1앰플 BID</option>
                  <option value="QD">1앰플 QD</option>
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="label">Care level</label>
            <MultiCheck options={["ICU care", "처치실 care", "일반병실 care"]} values={careLevel} onChange={setCareLevel} />
          </div>
        </div>
      </details>

      <div className="flex flex-wrap gap-3">
        <button className="btn" onClick={() => buildText()} type="button">
          최종 format 생성/미리보기
        </button>
      </div>

      {finalText && (
        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-slate-700">최종 노티 텍스트 (수정 가능)</h2>
            <button className="btn-outline !px-3 !py-1.5 text-xs" onClick={copyToClipboard} type="button">
              복사하기 (카카오톡 붙여넣기용)
            </button>
          </div>
          <textarea className="input min-h-[260px] font-mono text-sm" value={finalText} onChange={(e) => setFinalText(e.target.value)} />

          {contactSuggestion && (
            <div className={`rounded-lg border text-sm px-4 py-3 ${suggestionColor}`}>
              <span className="font-medium">권장 노티 방식: {contactSuggestion.method}</span>
              <p className="opacity-80 mt-1">{contactSuggestion.detail}</p>
              <p className="opacity-60 text-xs mt-1">
                (기준: {selectedDiagnosis?.label} · 위험도 {riskLabel(risk)} · 본인 역량 {myCompetency !== null ? `${myCompetency.toFixed(1)}점` : "평가 없음"})
              </p>
            </div>
          )}

          <div className="border-t border-slate-100 pt-3 space-y-3">
            <div>
              <label className="label">최종 처리 결과</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(DISPOSITION_LABEL) as Disposition[]).map((d) => (
                  <button
                    type="button"
                    key={d}
                    onClick={() => setDisposition(d)}
                    className={`chip border ${disposition === d ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}
                  >
                    {DISPOSITION_LABEL[d]}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn" onClick={handleFinalSave} type="button">
              최종 저장
            </button>
            {saved && <span className="text-sm text-emerald-600 ml-3">저장되었습니다.</span>}
          </div>
        </section>
      )}
    </div>
  );
}
