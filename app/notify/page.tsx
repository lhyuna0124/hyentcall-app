"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { DEFAULT_DIAGNOSES, DiagnosisRule, RiskLevel, riskColor, riskLabel } from "@/lib/triage";
import { parseLabText, formatLabSummary, ParsedLab } from "@/lib/labRules";

// --- 헬퍼 컴포넌트 (기존 유지) ---
function Toggle({ label, value, onChange }: { label: string; value: "" | "-" | "+" | "±"; onChange: (v: "" | "-" | "+" | "±") => void; }) {
return (

{label}

{(["-", "±", "+"] as const).map((v) => (
<button type="button" key={v} onClick={() => onChange(value === v ? "" : v)}
className={w-8 h-8 rounded-md text-xs font-semibold border ${value === v ? "bg-brand-600 text-white border-brand-600" : "bg-white text-slate-500 border-slate-300 hover:bg-slate-50"}}>
{v}

))}


);
}

function MultiCheck({ options, values, onChange }: { options: string[]; values: string[]; onChange: (v: string[]) => void; }) {
function toggle(opt: string) {
if (values.includes(opt)) onChange(values.filter((v) => v !== opt));
else onChange([...values, opt]);
}
return (

{options.map((opt) => (
<button type="button" key={opt} onClick={() => toggle(opt)}
className={chip border ${values.includes(opt) ? "bg-brand-600 text-white border-brand-600" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"}}>
{opt}

))}

);
}

// =====================================
// 1. 통계 및 기록 조회 컴포넌트 (신규)
// =====================================
function StatsTab() {
const [records, setRecords] = useState<any[]>([]);
const [expandedId, setExpandedId] = useState<string | null>(null);

useEffect(() => {
fetch("/api/notifications")
.then((r) => r.json())
.then((d) => { if (Array.isArray(d)) setRecords(d); })
.catch(() => {});
}, []);

async function handleDelete(id: string) {
if (confirm("잘못 입력된 이 기록을 정말 삭제하시겠습니까?")) {
await fetch(/api/notifications?id=${id}, { method: "DELETE" }).catch(() => {});
setRecords((prev) => prev.filter((r) => r.id !== id));
}
}

return (


입원 및 처치 통계 기록
총 {records.length}건


  {records.length === 0 && <div className="text-center p-8 text-slate-400 text-sm">저장된 기록이 없습니다.</div>}
  
  {records.map((record) => {
    const dateObj = new Date(record.createdAt || Date.now());
    const isDawn = dateObj.getHours() >= 0 && dateObj.getHours() <= 6; 
    const timeStr = dateObj.toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

    return (
      <div key={record.id} className="card p-0 overflow-hidden shadow-sm border border-slate-200 rounded-lg mb-3">
        <div 
          className={`p-4 flex justify-between items-center cursor-pointer transition-colors ${isDawn ? 'bg-indigo-50/40 hover:bg-indigo-50' : 'bg-white hover:bg-slate-50'}`}
          onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
        >
          <div>
            <div className="font-semibold text-slate-800 flex items-center gap-2">
              {record.patientName || "무명"} ({record.patientSex}/{record.patientAge})
              <span className="text-xs text-brand-600 font-bold bg-brand-50 px-2 py-0.5 rounded">{record.diagnosisLabel}</span>
            </div>
            <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-2 font-medium">
              <span>{timeStr}</span>
              {isDawn && <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">🌙 새벽 노티</span>}
              <span>| {record.residentName} 작성</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`chip border text-xs font-bold px-2 py-1 rounded ${record.disposition?.includes('입원') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
              {record.disposition || "결정 미상"}
            </span>
            <span className="text-xs text-slate-400">{expandedId === record.id ? "접기 ▲" : "상세보기 ▼"}</span>
          </div>
        </div>
        
        {expandedId === record.id && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-3 animate-in fade-in">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">당시 노티장 전문 (보고: {record.professorName} 교수님)</span>
            </div>
            <textarea className="input w-full min-h-[160px] font-mono text-xs leading-relaxed bg-white p-3 border rounded" readOnly value={record.finalText} />
            <div className="flex justify-end gap-2 mt-2">
              <button className="px-3 py-1.5 text-xs border rounded bg-white text-slate-600 hover:bg-slate-50" onClick={() => navigator.clipboard.writeText(record.finalText)}>전체 복사하기</button>
              <button className="px-3 py-1.5 text-xs border rounded bg-red-50 text-red-600 border-red-200 hover:bg-red-100 flex items-center gap-1" onClick={() => handleDelete(record.id)}>
                🗑️ 잘못된 기록 삭제
              </button>
            </div>
          </div>
        )}
      </div>
    );
  })}
</div>


);
}

// =====================================
// 2. 메인 작성 페이지 컴포넌트
// =====================================
export default function NotifyPage() {
const { user, loading } = useAuth();
const router = useRouter();

// 상태 관리: 탭 및 UI 접힘 여부
const [activeTab, setActiveTab] = useState<"write" | "stats">("write");
const [isCollapsed, setIsCollapsed] = useState(false);

useEffect(() => {
if (!loading && !user) router.replace("/");
}, [loading, user, router]);

const [diagnoses, setDiagnoses] = useState<DiagnosisRule[]>(DEFAULT_DIAGNOSES);
useEffect(() => {
fetch("/api/algorithm").then((r) => r.json()).then((d) => setDiagnoses(d)).catch(() => {});
}, []);

// 환자 기본 정보
const [patientName, setPatientName] = useState("");
const [age, setAge] = useState("");
const [sex, setSex] = useState<"M" | "F">("M");
const [diagnosisId, setDiagnosisId] = useState(DEFAULT_DIAGNOSES[0].id);

// 기저질환
const [underlying, setUnderlying] = useState(false);
const [underlyingItems, setUnderlyingItems] = useState<string[]>([]);
const [underlyingEtc, setUnderlyingEtc] = useState("");
const [antiplatelet, setAntiplatelet] = useState<string[]>([]);

// 병력 및 증상 (CC 추가)
const [onsetValue, setOnsetValue] = useState("");
const [onsetUnit, setOnsetUnit] = useState("일");
const [cc, setCc] = useState("");
const [hx, setHx] = useState("");
const [symptoms, setSymptoms] = useState<string[]>([]);
const [bt, setBt] = useState("");

// 신체진찰
const [tonsilFindings, setTonsilFindings] = useState<string[]>([]);
const [ptBulging, setPtBulging] = useState<"" | "-" | "+" | "±">("");
const [uvulaDeviation, setUvulaDeviation] = useState<"" | "Lt" | "Rt">("");
const [epiSwelling, setEpiSwelling] = useState<"" | "-" | "+" | "±">("");
const [epiCyst, setEpiCyst] = useState<"" | "-" | "+" | "±">("");
const [epiEdema, setEpiEdema] = useState<"" | "-" | "+" | "±">("");
const [larynxSwelling, setLarynxSwelling] = useState<"" | "-" | "+" | "±">("");
const [lateralWallSwelling, setLateralWallSwelling] = useState<"" | "-" | "+" | "±">("");
const [tvcVisible, setTvcVisible] = useState<"visible" | "not_visible" | "">("");

// Lab / CT
const [labText, setLabText] = useState("");
const parsedLabs: ParsedLab[] = useMemo(() => parseLabText(labText), [labText]);
const [ctReadType, setCtReadType] = useState<"구두판독" | "정식판독">("구두판독");
const [ctFinding, setCtFinding] = useState("");

// 치료 계획, 교수님, 최종 결정
const PROFESSORS = ["박민규", "이현아", "곽진혜"];
const DISPOSITIONS = ["입원 결정", "OPD f/u (귀가)", "타과 의뢰", "타병원 전원"];
const [professorName, setProfessorName] = useState(PROFESSORS[0]);
const [disposition, setDisposition] = useState(DISPOSITIONS[0]);

const [treatReasons, setTreatReasons] = useState<string[]>([]);
const [extraNote, setExtraNote] = useState("");
const [antiPlan, setAntiPlan] = useState<"double" | "triple" | "">("");
const [dexa, setDexa] = useState<"" | "-" | "+">("");
const [dexaFreq, setDexaFreq] = useState("BID");
const [careLevel, setCareLevel] = useState<string[]>([]);

const selectedDiagnosis = diagnoses.find((d) => d.id === diagnosisId) ?? diagnoses[0];

// 위험도 산정 (triage.ts 기준)
const risk: RiskLevel = useMemo(() => {
let r = selectedDiagnosis?.baseRisk ?? "LOW";
if (tvcVisible === "not_visible") r = "HIGH";
if (epiSwelling === "+" && symptoms.includes("Dyspnea")) r = "HIGH";
return r;
}, [selectedDiagnosis, tvcVisible, epiSwelling, symptoms]);

// 임시 저장 기능 (Local Storage)
useEffect(() => {
const draft = localStorage.getItem("ent_draft");
if (draft) {
try {
const d = JSON.parse(draft);
if (d.patientName) setPatientName(d.patientName);
if (d.age) setAge(d.age);
if (d.sex) setSex(d.sex);
if (d.diagnosisId) setDiagnosisId(d.diagnosisId);
if (d.onsetValue) setOnsetValue(d.onsetValue);
if (d.onsetUnit) setOnsetUnit(d.onsetUnit);
if (d.cc) setCc(d.cc);
if (d.hx) setHx(d.hx);
} catch (e) {}
}
}, []);

function handleTempSave() {
const data = { patientName, age, sex, diagnosisId, onsetValue, onsetUnit, cc, hx };
localStorage.setItem("ent_draft", JSON.stringify(data));
alert("현재 작성 중인 정보가 임시저장 되었습니다.");
}

// 💡 [핵심] 클로드의 위험도(Risk) + 전공의 역량(Level) 종합 가이드 산출
const recommendation = useMemo(() => {
const level = user?.level || "중"; // user 객체에 level(상/중/하)이 있다고 가정

if (risk === "HIGH") {
  return {
    method: "🚨 초응급: 무조건 즉시 전화 보고",
    detail: "Airway compromise 위험이 높은 초응급(HIGH Risk) 상태입니다. 시간대 불문하고 빽콜 필수이며 미응답 시 5분 간격 재발신 하세요.",
    color: "bg-red-50 border-red-500 text-red-800",
  };
}

if (level === "하") {
  return {
    method: "📞 카톡 전송 후 유선 컨펌 필수",
    detail: `[역량: 하] 상태가 안정적이더라도 카톡 노티장 전송 후 반드시 전화로 입원/처치 컨펌을 받으세요.`,
    color: "bg-orange-50 border-orange-500 text-orange-800",
  };
}

if (level === "중") {
  if (risk === "MEDIUM") {
    return {
      method: "💬 주간 전화 / 새벽 카톡 후 대기",
      detail: `[역량: 중 / MEDIUM Risk] 주간엔 전화 노티가 기본입니다. 새벽엔 카톡 노티 후 10~15분 대기하고 회신이 없으면 전화로 전환하세요.`,
      color: "bg-yellow-50 border-yellow-500 text-yellow-800",
    };
  }
  return {
    method: "💬 카톡 노티 후 자율 진행 (악화 시 빽콜)",
    detail: `[역량: 중 / LOW Risk] 노티 후 자체 처치 진행하세요. 애매하거나 상태 악화 시에만 빽콜하세요.`,
    color: "bg-green-50 border-green-500 text-green-800",
  };
}

// level === "상"
return {
  method: "✅ 자율 진행 완료 (아침 정규 보고)",
  detail: `[역량: 상] 단독 결정 가능한 레벨입니다. 카톡 노티만 남기고 자체 진행 후 익일 아침 회진 시 사후 보고하세요.`,
  color: "bg-blue-50 border-blue-500 text-blue-800",
};


}, [risk, user?.level]);

const [finalText, setFinalText] = useState("");
const [saved, setSaved] = useState(false);

// 텍스트 빌드
function buildText() {
const lines: string[] = [];
lines.push("[응급실 환자 노티드립니다.]\n");
lines.push(${patientName || "ㅇㅇㅇ"} ${sex}/${age || "-"} ${selectedDiagnosis?.label ?? ""});

// 기저질환
if (underlying) {
  const items = [...underlyingItems];
  if (underlyingEtc) items.push(underlyingEtc);
  const anti = antiplatelet.length ? ` (${antiplatelet.join(", ")} 복용)` : "";
  lines.push(`기저질환 (+, ${items.join(", ")}${anti})`);
} else {
  lines.push("기저질환 (-)");
}
lines.push("");

// 💡 지정된 HPI 와꾸 자동완성
if (onsetValue || cc) {
  lines.push(`내원 ${onsetValue || "ㅇ"}${onsetUnit} 전부터 지속된 ${cc || "증상"}을(를) 주소로 본원 응급실 내원하여 본과 진료 의뢰된 분입니다.`);
}
if (hx) lines.push(hx);
if (symptoms.length || bt) {
  lines.push(`추가증상: ${symptoms.join(", ")}${bt ? ` (BT ${bt}도)` : ""}`);
}

lines.push("\n[신체진찰 상]");
if (tonsilFindings.length) lines.push(`- Tonsil: ${tonsilFindings.join(", ")}`);
if (ptBulging) {
  let s = `- Peritonsillar bulging (${ptBulging})`;
  if (uvulaDeviation) s += `, uvula deviation ${uvulaDeviation}로 확인됨`;
  lines.push(s);
}

// 💡 단순 진단명 Airway 자동 방어 문구
const hasAirwayFindings = (epiSwelling && epiSwelling !== "-") || (epiCyst && epiCyst !== "-") || (epiEdema && epiEdema !== "-") || (larynxSwelling && larynxSwelling !== "-") || (lateralWallSwelling && lateralWallSwelling !== "-") || tvcVisible === "not_visible";
const isSimpleDx = ["tonsillitis", "ptabscess", "parotitis", "parotid_abscess"].includes(selectedDiagnosis?.id || "");

if (isSimpleDx && !hasAirwayFindings) {
  lines.push(`- Fiberscope 상 airway 특이소견 없습니다.`);
} else {
  const epiParts: string[] = [];
  if (epiSwelling && epiSwelling !== "-") epiParts.push(`swelling ${epiSwelling}`);
  if (epiCyst && epiCyst !== "-") epiParts.push(`cyst ${epiCyst}`);
  if (epiEdema && epiEdema !== "-") epiParts.push(`mucosal edema ${epiEdema}`);
  if (epiParts.length) lines.push(`- Epiglottis: ${epiParts.join(", ")}`);
  if (larynxSwelling && larynxSwelling !== "-") lines.push(`- Larynx diffuse swelling ${larynxSwelling}`);
  if (lateralWallSwelling && lateralWallSwelling !== "-") lines.push(`- Lateral pharyngeal wall swelling ${lateralWallSwelling}`);
}

if (tvcVisible === "not_visible") lines.push(`- 🚨 True Vocal Cord 확인 안됨 (Airway Risk)`);

lines.push("\n[Lab 및 영상 상]");
const labSummary = formatLabSummary(parsedLabs);
lines.push(`Lab 상 ${labSummary || "특이소견 없으며,"}`);
lines.push(`Neck CT (CE) ${ctReadType} 상 ${ctFinding || "특이소견 없습니다."}`);

// 최종 Disposition 반영
lines.push("\n[처치 및 계획]");
if (disposition === "입원 결정") {
  if (treatReasons.length) lines.push(`${treatReasons.join(", ")} 위해 입원 권유드렸으며 환자분 동의하시어${extraNote ? ` (${extraNote})` : ""}`);
  lines.push(`${professorName} 교수님 노티드리고 입원장 발부하였습니다.`);
  
  const planParts: string[] = ["NPO 유지"];
  if (antiPlan === "double") planParts.push("IV double anti (Peratam/Fullgram)");
  if (antiPlan === "triple") planParts.push("IV triple anti");
  if (dexa === "+") planParts.push(`Dexa 사용, 1앰플 ${dexaFreq}`);
  if (careLevel.length) planParts.push(`${careLevel.join(", ")} 하기로 하였습니다.`);
  lines.push(`입원하여 ${planParts.join(", ")}`);
} else if (disposition === "OPD f/u (귀가)") {
  lines.push(`${professorName} 교수님 노티드렸으며, 증상 조절 후 귀가하여 외래 f/u 하기로 하였습니다.`);
} else if (disposition === "타과 의뢰") {
  lines.push(`${professorName} 교수님 노티드렸으며, 이비인후과적 처치보다 타과 소견 중요하여 해당 과로 의뢰하였습니다.`);
} else if (disposition === "타병원 전원") {
  lines.push(`${professorName} 교수님 노티드렸으며, 보호자 면담 후 타병원으로 전원 조치하였습니다.`);
}

setFinalText(lines.join("\n"));
setIsCollapsed(true); // 💡 생성 시 폼 접기 트리거


}

async function handleFinalSave() {
if (!user) return;
const payload = {
residentId: user.id, residentName: user.name, residentLevel: user.level,
patientName, patientAge: age, patientSex: sex, diagnosisId, diagnosisLabel: selectedDiagnosis?.label ?? "",
risk, disposition, professorName, finalText
};
try {
await fetch("/api/notifications", {
method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
});
setSaved(true);
localStorage.removeItem("ent_draft"); // 성공 시 임시저장 비움
setTimeout(() => {
setSaved(false); setActiveTab("stats"); setIsCollapsed(false); setFinalText("");
}, 1500);
} catch (e) { alert("서버 저장 중 오류가 발생했습니다."); }
}

if (loading || !user) return null;

return (

{/* 탭 네비게이션 */}

<button onClick={() => setActiveTab("write")} className={py-3 px-4 font-semibold text-sm ${activeTab === "write" ? "border-b-2 border-brand-600 text-brand-600" : "text-slate-500 hover:text-slate-700"}}>
노티 작성

<button onClick={() => setActiveTab("stats")} className={py-3 px-4 font-semibold text-sm ${activeTab === "stats" ? "border-b-2 border-brand-600 text-brand-600" : "text-slate-500 hover:text-slate-700"}}>
통계 및 조회



  {activeTab === "stats" ? (
    <StatsTab />
  ) : (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">응급 노티 작성</h1>
        <span className={`chip ${riskColor(risk)}`}>위험도: {riskLabel(risk)}</span>
      </div>

      {selectedDiagnosis?.immediateAdmit && !isCollapsed && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
          이 진단은 즉시 입원 대상으로 분류됩니다 (airway trauma / postop bleeding / deep neck 등).
        </div>
      )}

      {/* 💡 폼 축약(접힘) 시 안내 메시지 */}
      {isCollapsed && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between animate-in fade-in">
          <span className="text-sm font-medium text-slate-600">입력창이 간소화되었습니다. 상세 내용을 수정하려면 다시 열어주세요.</span>
          <button className="text-brand-600 text-sm font-semibold underline" onClick={() => setIsCollapsed(false)}>입력창 다시 열기</button>
        </div>
      )}

      {/* 기본 입력 폼 (isCollapsed 시 화면에서 숨김) */}
      <div className={isCollapsed ? "hidden" : "space-y-6 animate-in slide-in-from-top-4 duration-300"}>
        
        <section className="card space-y-3">
          <h2 className="font-medium text-slate-700">1. 환자 기본 정보</h2>
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
                  <button type="button" key={s} onClick={() => setSex(s)} className={`px-4 py-2 rounded-lg text-sm border ${sex === s ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">진단명</label>
              <select className="input font-semibold bg-slate-50" value={diagnosisId} onChange={(e) => setDiagnosisId(e.target.value)}>
                {diagnoses.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="font-medium text-slate-700">2. 병력 및 증상 (HPI)</h2>
          {/* 💡 지정된 CC 와꾸 입력부 */}
          <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
            <span className="text-sm font-semibold text-slate-600">내원</span>
            <input className="input w-16 !py-1 text-center font-bold" value={onsetValue} onChange={(e) => setOnsetValue(e.target.value)} placeholder="3" />
            <select className="input w-20 !py-1 font-semibold" value={onsetUnit} onChange={(e) => setOnsetUnit(e.target.value)}><option value="일">일</option><option value="시간">시간</option><option value="주">주</option></select>
            <span className="text-sm font-semibold text-slate-600">전부터 지속된</span>
          </div>
          <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
            <input className="input flex-1 !py-1" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="주증상(CC) 입력 (예: 인후통)" />
            <span className="text-sm font-semibold text-slate-600 whitespace-nowrap">을(를) 주소로 내원</span>
          </div>
          <textarea className="input min-h-[70px] mt-2" placeholder="추가 증상 경과 및 hx (선택입력)" value={hx} onChange={(e) => setHx(e.target.value)} />
          
          <div>
            <label className="label">동반 증상</label>
            <MultiCheck options={["Fever", "Chill", "Odynophagia", "Dyspnea", "Dysphagia", "Sore throat"]} values={symptoms} onChange={setSymptoms} />
          </div>
          <div className="w-40">
            <label className="label">BT (fever 시)</label>
            <input className="input" value={bt} onChange={(e) => setBt(e.target.value)} placeholder="38.5" />
          </div>
        </section>

        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-slate-700">3. 기저질환</h2>
            <button type="button" onClick={() => setUnderlying((v) => !v)} className={`chip border ${underlying ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}>
              {underlying ? "있음 (+)" : "없음 (-)"}
            </button>
          </div>
          {underlying && (
            <div className="space-y-3 bg-slate-50 p-3 rounded border border-slate-100">
              <MultiCheck options={["HTN", "DM", "Tbc", "Asthma"]} values={underlyingItems} onChange={setUnderlyingItems} />
              <input className="input" placeholder="기타 기저질환" value={underlyingEtc} onChange={(e) => setUnderlyingEtc(e.target.value)} />
              <div>
                <label className="label text-red-600 font-semibold">항혈소판제 복용</label>
                <MultiCheck options={["Aspirin", "Clopidogrel"]} values={antiplatelet} onChange={setAntiplatelet} />
              </div>
            </div>
          )}
        </section>

        <section className="card space-y-1">
          <h2 className="font-medium text-slate-700 mb-2">4. 신체진찰 (Airway)</h2>
          <div className="pb-2">
            <label className="label">Tonsil 소견 (복수 선택)</label>
            <MultiCheck options={["Enlargement", "Injection", "Whitish patch", "With ulceration", "Mass", "s/p tonsillectomy"]} values={tonsilFindings} onChange={setTonsilFindings} />
          </div>
          <Toggle label="Peritonsillar bulging" value={ptBulging} onChange={setPtBulging} />
          {ptBulging && ptBulging !== "-" && (
            <div className="flex items-center gap-2 py-1.5 border-b border-slate-100 bg-slate-50 px-2 rounded">
              <span className="text-sm text-slate-600">Uvula deviation</span>
              {(["Lt", "Rt"] as const).map((s) => (
                <button type="button" key={s} onClick={() => setUvulaDeviation(uvulaDeviation === s ? "" : s)} className={`px-3 py-1 rounded-md text-xs font-bold border ${uvulaDeviation === s ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}>{s}</button>
              ))}
            </div>
          )}
          <Toggle label="Epiglottis swelling" value={epiSwelling} onChange={setEpiSwelling} />
          <Toggle label="Epiglottis cyst" value={epiCyst} onChange={setEpiCyst} />
          <Toggle label="Epiglottis mucosal edema" value={epiEdema} onChange={setEpiEdema} />
          <Toggle label="Larynx diffuse swelling" value={larynxSwelling} onChange={setLarynxSwelling} />
          <Toggle label="Lateral pharyngeal wall swelling" value={lateralWallSwelling} onChange={setLateralWallSwelling} />
          
          <div className="flex items-center justify-between py-2 mt-3 bg-red-50 p-2 rounded border border-red-200">
            <span className="text-sm font-bold text-red-700">🚨 True vocal cord 시야</span>
            <div className="flex gap-1">
              {[{ v: "visible", label: "확인됨 (안전)" }, { v: "not_visible", label: "안보임 (초응급)" }].map((o) => (
                <button type="button" key={o.v} onClick={() => setTvcVisible(tvcVisible === o.v ? "" : (o.v as any))} className={`px-3 py-1.5 rounded-md text-xs font-bold border ${tvcVisible === o.v ? "bg-red-600 text-white border-red-600" : "bg-white border-slate-300 text-slate-600"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="font-medium text-slate-700">5. Lab / CT</h2>
          <textarea className="input min-h-[80px] font-mono text-xs" placeholder="의무기록 Lab 결과 붙여넣기" value={labText} onChange={(e) => setLabText(e.target.value)} />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">CT 판독 구분</label>
              <select className="input" value={ctReadType} onChange={(e) => setCtReadType(e.target.value as any)}>
                <option value="구두판독">구두판독</option><option value="정식판독">정식판독</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Neck CT 소견</label>
              <input className="input" placeholder="예: both AFT, phlegmonous status" value={ctFinding} onChange={(e) => setCtFinding(e.target.value)} />
            </div>
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="font-medium text-slate-700">6. 최종 결정 (Disposition) 및 처치</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">보고 드릴 교수님</label>
              <select className="input font-semibold" value={professorName} onChange={(e) => setProfessorName(e.target.value)}>
                {PROFESSORS.map(p => <option key={p} value={p}>{p} 교수님</option>)}
              </select>
            </div>
            <div>
              <label className="label text-brand-600">환자 처방 결정</label>
              <select className="input font-bold text-brand-700 border-brand-300 bg-brand-50" value={disposition} onChange={(e) => setDisposition(e.target.value)}>
                {DISPOSITIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {disposition === "입원 결정" && (
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-3 mt-2 animate-in fade-in">
              <div>
                <label className="label">입원 사유 (복수 선택)</label>
                <MultiCheck options={["IV anti", "급성기 증상조절", "Nutritional support", "V/S close monitoring"]} values={treatReasons} onChange={setTreatReasons} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Antibiotics plan</label>
                  <select className="input" value={antiPlan} onChange={(e) => setAntiPlan(e.target.value as any)}>
                    <option value="">선택안함</option><option value="double">Double anti</option><option value="triple">Triple anti</option>
                  </select>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="w-1/2">
                    <label className="label">Dexa 사용</label>
                    <select className="input" value={dexa} onChange={(e) => setDexa(e.target.value as any)}><option value="">-</option><option value="+">+</option></select>
                  </div>
                  {dexa === "+" && (
                    <div className="w-1/2">
                      <label className="label">투여 빈도</label>
                      <select className="input" value={dexaFreq} onChange={(e) => setDexaFreq(e.target.value)}><option value="BID">1@ BID</option><option value="QD">1@ QD</option></select>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="label">Care level</label>
                <MultiCheck options={["ICU care", "처치실 care", "일반병실 care"]} values={careLevel} onChange={setCareLevel} />
              </div>
            </div>
          )}
        </section>

        {/* 💡 폼 접기 트리거 버튼 */}
        <div className="pt-2">
          <button className="btn w-full py-4 text-base shadow-md font-bold bg-slate-800 text-white hover:bg-slate-900" onClick={() => buildText()} type="button">
            최종 format 생성 및 가이드라인 확인 ⬇️
          </button>
        </div>
      </div>

      {/* =======================================================
          [결과 영역] 입력 폼이 접히고 나타나는 하단 포커스 화면 
          ======================================================= */}
      {finalText && isCollapsed && (
        <section className="space-y-5 animate-in slide-in-from-bottom-6 duration-300 mt-4">
          
          {/* 💡 AI 가이드라인 박스 (역량 + 중증도 결합) */}
          <div className={`p-5 rounded-xl border-l-4 shadow-sm ${recommendation.color}`}>
            <h3 className="font-bold flex items-center gap-2 text-base">{recommendation.method}</h3>
            <p className="font-medium text-sm mt-1.5 opacity-90 leading-relaxed">{recommendation.detail}</p>
          </div>

          {/* 생성된 텍스트 */}
          <div className="card space-y-3 shadow-md border-slate-200">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="font-semibold text-slate-800 text-sm">최종 노티 텍스트 (직접 수정 가능)</h2>
              <button className="btn-outline !px-3 !py-1.5 text-xs bg-slate-50 font-bold" onClick={() => navigator.clipboard.writeText(finalText)} type="button">
                텍스트 복사 (카톡용)
              </button>
            </div>
            <textarea className="input w-full min-h-[350px] font-mono text-sm leading-relaxed p-4 focus:bg-yellow-50 focus:border-yellow-400 border border-slate-200 rounded" value={finalText} onChange={(e) => setFinalText(e.target.value)} />
          </div>

          {/* 저장 액션 바 */}
          <div className="flex flex-col gap-3 pb-8">
            <button className="btn-outline w-full py-2.5 font-bold bg-white" onClick={handleTempSave} type="button">
              현재까지 작성된 정보 임시저장
            </button>
            <button className="btn w-full py-4 text-lg font-bold shadow-lg" onClick={handleFinalSave} type="button">
              [{disposition}] 상태로 통계에 최종 기록하기
            </button>
            {saved && <span className="text-sm text-emerald-600 block text-center font-bold">✅ 성공적으로 서버에 저장되었습니다.</span>}
          </div>
        </section>
      )}
    </>
  )}
</div>


);
}
