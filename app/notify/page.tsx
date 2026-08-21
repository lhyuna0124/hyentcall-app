"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { DEFAULT_DIAGNOSES, DiagnosisRule, RiskLevel, riskColor, riskLabel } from "@/lib/triage";
import { parseLabText, formatLabSummary, ParsedLab } from "@/lib/labRules";
import { suggestContact } from "@/lib/contactPolicy";

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
  const [professorName, setProfessorName] = useState("");
  const [antiPlan, setAntiPlan] = useState<"double" | "triple" | "">("");
  const [dexa, setDexa] = useState<"" | "-" | "+">("");
  const [dexaFreq, setDexaFreq] = useState("BID");
  const [careLevel, setCareLevel] = useState<string[]>([]);

  const selectedDiagnosis = diagnoses.find((d) => d.id === diagnosisId) ?? diagnoses[0];

  const risk: RiskLevel = useMemo(() => {
    let r = selectedDiagnosis?.baseRisk ?? "LOW";
    if (tvcVisible === "not_visible") r = "HIGH";
    if (epiSwelling === "+" && symptoms.includes("Dyspnea")) r = "HIGH";
    return r;
  }, [selectedDiagnosis, tvcVisible, epiSwelling, symptoms]);

  const [finalText, setFinalText] = useState("");
  const [saved, setSaved] = useState(false);

  function buildText() {
    const lines: string[] = [];
    lines.push("[응급실 환자 노티드립니다.]");
    lines.push("");
    lines.push(`${patientName || "ㅇㅇㅇ"} ${sex}/${age || "-"} ${selectedDiagnosis?.label ?? ""}`);
    lines.push("");

    // 기저질환
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
    if (tonsilFindings.length) lines.push(`Tonsil: ${tonsilFindings.join(", ")}`);
    if (ptBulging) {
      let s = `Peritonsillar bulging (${ptBulging})`;
      if (uvulaDeviation) s += `, uvula deviation ${uvulaDeviation}로 확인`;
      lines.push(s);
    }
    const epiParts: string[] = [];
    if (epiSwelling) epiParts.push(`swelling ${epiSwelling}`);
    if (epiCyst) epiParts.push(`cyst ${epiCyst}`);
    if (epiEdema) epiParts.push(`mucosal edema ${epiEdema}`);
    if (epiParts.length) lines.push(`Epiglottis: ${epiParts.join(", ")}`);
    if (larynxSwelling) lines.push(`Larynx diffuse swelling ${larynxSwelling}`);
    if (lateralWallSwelling) lines.push(`Lateral pharyngeal wall swelling ${lateralWallSwelling}`);

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
    lines.push(`${professorName || "ㅇㅇㅇ"} 교수님 노티드리고 입원장 발부하였습니다.`);

    const planParts: string[] = ["NPO 유지"];
    if (antiPlan === "double") planParts.push("IV double anti (Peratam/Fullgram)");
    if (antiPlan === "triple") planParts.push("IV triple anti");
    if (dexa === "+") planParts.push(`Dexa 사용, 1앰플 ${dexaFreq}`);
    if (careLevel.length) planParts.push(`${careLevel.join(", ")} 하기로 하였습니다`);
    lines.push(`입원하여 ${planParts.join(", ")}.`);

    const text = lines.join("\n");
    setFinalText(text);
    return text;
  }

  async function handleSave(admitted: boolean) {
    const text = buildText();
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
      admitted,
      professorName,
      finalText: text,
    };
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function copyToClipboard() {
    const text = finalText || buildText();
    navigator.clipboard.writeText(text);
  }

  if (loading || !user) return null;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">응급 노티 작성</h1>
        <span className={`chip ${riskColor(risk)}`}>위험도: {riskLabel(risk)}</span>
      </div>

      {(() => {
        const s = suggestContact(risk);
        return (
          <div className="rounded-lg bg-brand-50 border border-brand-100 text-brand-700 text-sm px-4 py-3">
            <span className="font-medium">권장 노티 방식: {s.method}</span>
            <p className="text-brand-700/80 mt-1">{s.detail}</p>
          </div>
        );
      })()}

      {selectedDiagnosis?.immediateAdmit && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
          이 진단은 즉시 입원 대상으로 분류됩니다 (airway trauma / postop bleeding / deep neck infection 등).
        </div>
      )}

      {/* 환자 기본정보 */}
      <section className="card space-y-3">
        <h2 className="font-medium text-slate-700">환자 기본 정보</h2>
        <p className="text-xs text-slate-400 -mt-2">환자 등록번호는 개인정보 이슈로 저장하지 않습니다. 날짜/시간은 자동 기록되어 의무기록 조회로 특정할 수 있습니다.</p>
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
      </section>

      {/* 기저질환 */}
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-slate-700">기저질환</h2>
          <button type="button" onClick={() => setUnderlying((v) => !v)} className={`chip border ${underlying ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}>
            {underlying ? "있음 (+)" : "없음 (-)"}
          </button>
        </div>
        {underlying && (
          <div className="space-y-3">
            <MultiCheck
              options={["HTN", "DM", "Tbc", "Asthma"]}
              values={underlyingItems}
              onChange={setUnderlyingItems}
            />
            <input className="input" placeholder="기타 기저질환" value={underlyingEtc} onChange={(e) => setUnderlyingEtc(e.target.value)} />
            <div>
              <label className="label">항혈소판제 복용</label>
              <MultiCheck options={["Aspirin", "Clopidogrel"]} values={antiplatelet} onChange={setAntiplatelet} />
            </div>
          </div>
        )}
      </section>

      {/* 병력/증상 */}
      <section className="card space-y-3">
        <h2 className="font-medium text-slate-700">병력 및 증상</h2>
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
        <textarea className="input min-h-[70px]" placeholder="증상 경과 및 hx (예: local po medication하였으나 증상 호전 없어 본원 응급실 내원)" value={hx} onChange={(e) => setHx(e.target.value)} />
        <div>
          <label className="label">증상</label>
          <MultiCheck options={["Fever", "Chill", "Odynophagia", "Dyspnea", "Dysphagia", "Sore throat"]} values={symptoms} onChange={setSymptoms} />
        </div>
        <div className="w-40">
          <label className="label">BT (fever 시)</label>
          <input className="input" value={bt} onChange={(e) => setBt(e.target.value)} placeholder="38.5" />
        </div>
      </section>

      {/* 신체진찰 */}
      <section className="card space-y-1">
        <h2 className="font-medium text-slate-700 mb-2">신체진찰</h2>
        <div className="pb-2">
          <label className="label">Tonsil 소견 (복수 선택)</label>
          <MultiCheck
            options={["Enlargement", "Injection", "Whitish patch", "With ulceration", "Mass", "s/p tonsillectomy state"]}
            values={tonsilFindings}
            onChange={setTonsilFindings}
          />
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
      </section>

      {/* Lab / CT */}
      <section className="card space-y-3">
        <h2 className="font-medium text-slate-700">Lab / Neck CT</h2>
        <div>
          <label className="label">Lab 결과 붙여넣기 (자동 인식)</label>
          <textarea
            className="input min-h-[80px] font-mono text-xs"
            placeholder="예: WBC 12200 CRP 26.59 AST 88 ALT 56 eGFR 30"
            value={labText}
            onChange={(e) => setLabText(e.target.value)}
          />
        </div>
        {parsedLabs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {parsedLabs.map((p) => (
              <span
                key={p.key}
                className={`chip border ${
                  p.status === "high"
                    ? "bg-red-50 text-red-600 border-red-200"
                    : p.status === "low"
                    ? "bg-blue-50 text-blue-600 border-blue-200"
                    : "bg-slate-50 text-slate-500 border-slate-200"
                }`}
              >
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
      </section>

      {/* 치료 계획 */}
      <section className="card space-y-3">
        <h2 className="font-medium text-slate-700">치료 계획 / 입원</h2>
        <div>
          <label className="label">입원 사유 (복수 선택)</label>
          <MultiCheck options={["IV anti", "급성기 증상조절", "Nutritional support", "V/S close monitoring"]} values={treatReasons} onChange={setTreatReasons} />
        </div>
        <textarea className="input min-h-[50px]" placeholder="추가 특이사항 (선택)" value={extraNote} onChange={(e) => setExtraNote(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">담당 교수님</label>
            <input className="input" value={professorName} onChange={(e) => setProfessorName(e.target.value)} placeholder="예: 송창면" />
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
                <button
                  type="button"
                  key={v}
                  onClick={() => setDexa(dexa === v ? "" : v)}
                  className={`w-10 h-9 rounded-md text-xs font-semibold border ${dexa === v ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-500"}`}
                >
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
      </section>

      <div className="flex flex-wrap gap-3">
        <button className="btn" onClick={buildText} type="button">
          최종 format 생성/미리보기
        </button>
        <button className="btn-outline" onClick={() => handleSave(true)} type="button">
          입원 처리 후 기록 저장
        </button>
        <button className="btn-outline" onClick={() => handleSave(false)} type="button">
          경과관찰(비입원) 기록 저장
        </button>
        {saved && <span className="text-sm text-emerald-600 self-center">저장되었습니다.</span>}
      </div>

      {finalText && (
        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-slate-700">최종 노티 텍스트 (수정 가능)</h2>
            <button className="btn-outline !px-3 !py-1.5 text-xs" onClick={copyToClipboard} type="button">
              복사하기 (카카오톡 붙여넣기용)
            </button>
          </div>
          <textarea className="input min-h-[280px] font-mono text-sm" value={finalText} onChange={(e) => setFinalText(e.target.value)} />
        </section>
      )}
    </div>
  );
}
