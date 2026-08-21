"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { DEFAULT_DIAGNOSES, DiagnosisRule, RiskLevel, riskColor, riskLabel } from "@/lib/triage";
import { parseLabText, formatLabSummary, ParsedLab } from "@/lib/labRules";
import { EvaluationRecord, Disposition, DISPOSITION_LABEL, PROFESSORS } from "@/lib/types";
import { suggestContact, ContactSuggestion } from "@/lib/contactPolicy";

type PM = "" | "-" | "+" | "±";
type Side = "" | "Rt" | "Lt";

function Toggle({
  label,
  value,
  onChange,
  options = ["-", "±", "+"],
}: {
  label: string;
  value: PM;
  onChange: (v: PM) => void;
  options?: PM[];
}) {
  return (
    <div className="field-row">
      <span className="text-sm text-slate-700">{label}</span>
      <div className="flex gap-1">
        {options.map((v) => (
          <button
            type="button"
            key={v}
            onClick={() => onChange(value === v ? "" : v)}
            className={`w-8 h-7 rounded-md text-xs font-semibold border ${
              value === v ? "bg-brand-600 text-white border-brand-600" : "bg-white text-slate-500 border-slate-300 hover:bg-slate-50"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

function SideChips({ value, onChange }: { value: Side; onChange: (v: Side) => void }) {
  return (
    <div className="flex gap-1">
      {(["Rt", "Lt"] as const).map((s) => (
        <button
          type="button"
          key={s}
          onClick={() => onChange(value === s ? "" : s)}
          className={`px-2.5 py-1 rounded-md text-xs border ${value === s ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

function MultiCheck({ options, values, onChange }: { options: string[]; values: string[]; onChange: (v: string[]) => void }) {
  function toggle(opt: string) {
    if (values.includes(opt)) onChange(values.filter((v) => v !== opt));
    else onChange([...values, opt]);
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          type="button"
          key={opt}
          onClick={() => toggle(opt)}
          className={`chip border ${values.includes(opt) ? "bg-brand-600 text-white border-brand-600" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

const BASE_SYMPTOMS = ["General weakness", "Fever", "Chill", "Sore throat", "Odynophagia", "Hoarseness", "Dysphagia", "Dyspnea"];
const PAROTID_SYMPTOMS = ["Facial palsy", "Facial swelling"];
const PAROTID_DX = ["parotitis", "parotid_abscess"];
const ABSCESS_DX = ["ptabscess", "parotid_abscess", "deep_neck"];
const AIRWAY_FREE_TEXT_DX = ["airway_trauma", "epiglottitis", "acute_laryngitis"];

function isRelevantGroup(group: "pharynx" | "lymphNode" | "inflammatory" | "salivary" | "oralFocus", diagnosisId: string) {
  switch (diagnosisId) {
    case "tonsillitis":
    case "ptabscess":
    case "epiglottitis":
    case "acute_laryngitis":
      return group === "pharynx";
    case "cervical_lad":
      return group === "lymphNode" || group === "inflammatory";
    case "parotitis":
    case "parotid_abscess":
      return group === "salivary" || group === "inflammatory";
    case "deep_neck":
      return group === "lymphNode" || group === "inflammatory" || group === "oralFocus";
    default:
      return false;
  }
}

interface FormSnapshot {
  patientName: string; age: string; sex: "M" | "F"; diagnosisId: string; customDiagnosisText: string;
  prevSurgDate: string; prevSurgName: string;
  underlyingItems: string[]; underlyingEtc: string; antiplatelet: string[];
  dentalHx: PM; dentalDetails: string[]; dentalEtc: string;
  onsetValue: string; onsetUnit: string; hx: string;
  symptoms: string[]; bt: string;
  tonsilFindings: string[]; ptBulging: PM; ptBulgingSide: Side; uvulaDeviation: "" | "Lt" | "Rt";
  lateralWallSwelling: PM; lateralWallSide: Side;
  larynxSwelling: PM; epiglottisSwelling: PM; airwayExtraFindings: string;
  tvcVisible: "visible" | "not_visible" | ""; vocalCordMovement: "" | "intact" | "paresis" | "palsy"; vocalCordSide: "" | "Rt" | "Lt" | "Bilateral";
  lnSide: "" | "Rt" | "Lt" | "Bilateral"; lnLevel: string[]; lnSizeText: string;
  tenderness: PM; erythema: PM; heating: PM; pus: PM;
  parotidSide: string; parotidStatus: string[]; parotidDuct: string;
  smgSide: string; smgStatus: string[]; smgDuct: string;
  oralFocus: string[]; dentalCariesTeeth: string;
  aspirationDone: PM; idDone: PM; pusAmount: string;
  labText: string; ctReadType: "구두판독" | "정식판독" | "추후 판독확인 필요"; ctFinding: string;
  treatReasons: string[]; extraNote: string;
  dietType: "" | "NPO" | "SIPS" | "일반식이"; tpn: PM;
  professorName: string;
  antiPlanType: "" | "double1" | "double2" | "triple" | "other" | "continue_previous" | "none"; antiPlanOther: string;
  dexa: PM; dexaFreq: string; careLevel: string[];
  explainDeathRisk: PM; explainProcedure: PM; consentStatus: "" | "temp" | "signed";
}

export default function NotifyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  const [diagnoses, setDiagnoses] = useState<DiagnosisRule[]>(DEFAULT_DIAGNOSES);
  useEffect(() => {
    fetch("/api/algorithm").then((r) => r.json()).then((d) => setDiagnoses(d)).catch(() => {});
  }, []);

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
  const [customDiagnosisText, setCustomDiagnosisText] = useState("");
  const [prevSurgDate, setPrevSurgDate] = useState("");
  const [prevSurgName, setPrevSurgName] = useState("");

  // --- 기저질환 ---
  const [underlyingItems, setUnderlyingItems] = useState<string[]>([]);
  const [underlyingEtc, setUnderlyingEtc] = useState("");
  const [antiplatelet, setAntiplatelet] = useState<string[]>([]);

  // --- 치과 치료력 ---
  const [dentalHx, setDentalHx] = useState<PM>("");
  const [dentalDetails, setDentalDetails] = useState<string[]>([]);
  const [dentalEtc, setDentalEtc] = useState("");

  // --- 병력/증상 ---
  const [onsetValue, setOnsetValue] = useState("");
  const [onsetUnit, setOnsetUnit] = useState("일");
  const [hx, setHx] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [bt, setBt] = useState("");

  // --- Airway 평가 ---
  const [larynxSwelling, setLarynxSwelling] = useState<PM>("");
  const [epiglottisSwelling, setEpiglottisSwelling] = useState<PM>("");
  const [airwayExtraFindings, setAirwayExtraFindings] = useState("");
  const [tvcVisible, setTvcVisible] = useState<"visible" | "not_visible" | "">("");
  const [vocalCordMovement, setVocalCordMovement] = useState<"" | "intact" | "paresis" | "palsy">("");
  const [vocalCordSide, setVocalCordSide] = useState<"" | "Rt" | "Lt" | "Bilateral">("");

  // --- Pharynx/Tonsil ---
  const [tonsilFindings, setTonsilFindings] = useState<string[]>([]);
  const [ptBulging, setPtBulging] = useState<PM>("");
  const [ptBulgingSide, setPtBulgingSide] = useState<Side>("");
  const [uvulaDeviation, setUvulaDeviation] = useState<"" | "Lt" | "Rt">("");
  const [lateralWallSwelling, setLateralWallSwelling] = useState<PM>("");
  const [lateralWallSide, setLateralWallSide] = useState<Side>("");

  // --- Lymph node ---
  const [lnSide, setLnSide] = useState<"" | "Rt" | "Lt" | "Bilateral">("");
  const [lnLevel, setLnLevel] = useState<string[]>([]);
  const [lnSizeText, setLnSizeText] = useState("");

  // --- 염증 징후 ---
  const [tenderness, setTenderness] = useState<PM>("");
  const [erythema, setErythema] = useState<PM>("");
  const [heating, setHeating] = useState<PM>("");
  const [pus, setPus] = useState<PM>("");

  // --- 타액선 ---
  const [parotidSide, setParotidSide] = useState("");
  const [parotidStatus, setParotidStatus] = useState<string[]>([]);
  const [parotidDuct, setParotidDuct] = useState("");
  const [smgSide, setSmgSide] = useState("");
  const [smgStatus, setSmgStatus] = useState<string[]>([]);
  const [smgDuct, setSmgDuct] = useState("");

  // --- 구강저 ---
  const [oralFocus, setOralFocus] = useState<string[]>([]);
  const [dentalCariesTeeth, setDentalCariesTeeth] = useState("");

  // --- Abscess 처치 ---
  const [aspirationDone, setAspirationDone] = useState<PM>("");
  const [idDone, setIdDone] = useState<PM>("");
  const [pusAmount, setPusAmount] = useState("");

  // --- Lab / CT ---
  const [labText, setLabText] = useState("");
  const parsedLabs: ParsedLab[] = useMemo(() => parseLabText(labText), [labText]);
  const [ctReadType, setCtReadType] = useState<"구두판독" | "정식판독" | "추후 판독확인 필요">("구두판독");
  const [ctFinding, setCtFinding] = useState("");

  // --- 치료 계획 ---
  const [treatReasons, setTreatReasons] = useState<string[]>([]);
  const [extraNote, setExtraNote] = useState("");
  const [dietType, setDietType] = useState<"" | "NPO" | "SIPS" | "일반식이">("");
  const [tpn, setTpn] = useState<PM>("");
  const [professorName, setProfessorName] = useState<string>(PROFESSORS[0]);
  const [antiPlanType, setAntiPlanType] = useState<FormSnapshot["antiPlanType"]>("");
  const [antiPlanOther, setAntiPlanOther] = useState("");
  const [dexa, setDexa] = useState<PM>("");
  const [dexaFreq, setDexaFreq] = useState("BID");
  const [careLevel, setCareLevel] = useState<string[]>([]);

  // --- 환자/보호자 설명 ---
  const [explainDeathRisk, setExplainDeathRisk] = useState<PM>("");
  const [explainProcedure, setExplainProcedure] = useState<PM>("");
  const [consentStatus, setConsentStatus] = useState<"" | "temp" | "signed">("");

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    underlying: true, hxSymptoms: true, pharynx: true, lymphNode: true, inflammatory: true,
    salivary: true, oralFocus: true, abscess: true, labCt: true, plan: true,
  });

  const selectedDiagnosis = diagnoses.find((d) => d.id === diagnosisId) ?? diagnoses[0];
  const diagnosisDisplayLabel = diagnosisId === "other" && customDiagnosisText ? customDiagnosisText : selectedDiagnosis?.label ?? "";
  const isParotidDx = PAROTID_DX.includes(diagnosisId);
  const isAbscessDx = ABSCESS_DX.includes(diagnosisId);
  const isPostopBleeding = diagnosisId === "postop_bleeding";
  const showAirwayFreeText = AIRWAY_FREE_TEXT_DX.includes(diagnosisId);
  const symptomOptions = isParotidDx ? [...BASE_SYMPTOMS, ...PAROTID_SYMPTOMS] : BASE_SYMPTOMS;

  const showPharynx = isRelevantGroup("pharynx", diagnosisId);
  const showLymphNode = isRelevantGroup("lymphNode", diagnosisId);
  const showInflammatory = isRelevantGroup("inflammatory", diagnosisId);
  const showSalivary = isRelevantGroup("salivary", diagnosisId);
  const showOralFocus = isRelevantGroup("oralFocus", diagnosisId);

  const risk: RiskLevel = useMemo(() => {
    let r = selectedDiagnosis?.baseRisk ?? "LOW";
    if (tvcVisible === "not_visible") r = "HIGH";
    if (epiglottisSwelling === "+" && symptoms.includes("Dyspnea")) r = "HIGH";
    if (vocalCordMovement === "paresis" || vocalCordMovement === "palsy") r = "HIGH";
    return r;
  }, [selectedDiagnosis, tvcVisible, epiglottisSwelling, symptoms, vocalCordMovement]);

  const myCompetency = useMemo(() => {
    const relevant = myEvaluations.filter((e) => e.diagnosisId === diagnosisId);
    if (!relevant.length) return null;
    return relevant.reduce((sum, e) => sum + e.competency, 0) / relevant.length;
  }, [myEvaluations, diagnosisId]);

  const [finalText, setFinalText] = useState("");
  const [contactSuggestion, setContactSuggestion] = useState<ContactSuggestion | null>(null);
  const [saved, setSaved] = useState(false);
  const [disposition, setDisposition] = useState<Disposition>("admit");

  const draftKey = user ? `entcall_draft_${user.id}` : null;
  const [draftOffered, setDraftOffered] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  function currentSnapshot(): FormSnapshot {
    return {
      patientName, age, sex, diagnosisId, customDiagnosisText, prevSurgDate, prevSurgName,
      underlyingItems, underlyingEtc, antiplatelet,
      dentalHx, dentalDetails, dentalEtc,
      onsetValue, onsetUnit, hx,
      symptoms, bt,
      tonsilFindings, ptBulging, ptBulgingSide, uvulaDeviation, lateralWallSwelling, lateralWallSide,
      larynxSwelling, epiglottisSwelling, airwayExtraFindings,
      tvcVisible, vocalCordMovement, vocalCordSide,
      lnSide, lnLevel, lnSizeText,
      tenderness, erythema, heating, pus,
      parotidSide, parotidStatus, parotidDuct, smgSide, smgStatus, smgDuct,
      oralFocus, dentalCariesTeeth,
      aspirationDone, idDone, pusAmount,
      labText, ctReadType, ctFinding,
      treatReasons, extraNote, dietType, tpn,
      professorName, antiPlanType, antiPlanOther, dexa, dexaFreq, careLevel,
      explainDeathRisk, explainProcedure, consentStatus,
    };
  }

  function applySnapshot(s: FormSnapshot) {
    setPatientName(s.patientName); setAge(s.age); setSex(s.sex); setDiagnosisId(s.diagnosisId);
    setCustomDiagnosisText(s.customDiagnosisText || ""); setPrevSurgDate(s.prevSurgDate || ""); setPrevSurgName(s.prevSurgName || "");
    setUnderlyingItems(s.underlyingItems); setUnderlyingEtc(s.underlyingEtc); setAntiplatelet(s.antiplatelet);
    setDentalHx(s.dentalHx || ""); setDentalDetails(s.dentalDetails || []); setDentalEtc(s.dentalEtc || "");
    setOnsetValue(s.onsetValue); setOnsetUnit(s.onsetUnit); setHx(s.hx);
    setSymptoms(s.symptoms); setBt(s.bt);
    setTonsilFindings(s.tonsilFindings); setPtBulging(s.ptBulging); setPtBulgingSide(s.ptBulgingSide || "");
    setUvulaDeviation(s.uvulaDeviation); setLateralWallSwelling(s.lateralWallSwelling); setLateralWallSide(s.lateralWallSide || "");
    setLarynxSwelling(s.larynxSwelling); setEpiglottisSwelling(s.epiglottisSwelling); setAirwayExtraFindings(s.airwayExtraFindings || "");
    setTvcVisible(s.tvcVisible); setVocalCordMovement(s.vocalCordMovement || ""); setVocalCordSide(s.vocalCordSide || "");
    setLnSide(s.lnSide || ""); setLnLevel(s.lnLevel || []); setLnSizeText(s.lnSizeText || "");
    setTenderness(s.tenderness || ""); setErythema(s.erythema || ""); setHeating(s.heating || ""); setPus(s.pus || "");
    setParotidSide(s.parotidSide || ""); setParotidStatus(s.parotidStatus || []); setParotidDuct(s.parotidDuct || "");
    setSmgSide(s.smgSide || ""); setSmgStatus(s.smgStatus || []); setSmgDuct(s.smgDuct || "");
    setOralFocus(s.oralFocus || []); setDentalCariesTeeth(s.dentalCariesTeeth || "");
    setAspirationDone(s.aspirationDone || ""); setIdDone(s.idDone || ""); setPusAmount(s.pusAmount || "");
    setLabText(s.labText); setCtReadType(s.ctReadType || "구두판독"); setCtFinding(s.ctFinding);
    setTreatReasons(s.treatReasons); setExtraNote(s.extraNote);
    setDietType(s.dietType || ""); setTpn(s.tpn || "");
    setProfessorName(s.professorName || PROFESSORS[0]);
    setAntiPlanType(s.antiPlanType || ""); setAntiPlanOther(s.antiPlanOther || "");
    setDexa(s.dexa); setDexaFreq(s.dexaFreq); setCareLevel(s.careLevel);
    setExplainDeathRisk(s.explainDeathRisk || ""); setExplainProcedure(s.explainProcedure || ""); setConsentStatus(s.consentStatus || "");
  }

  useEffect(() => {
    if (!draftKey || draftOffered) return;
    const raw = localStorage.getItem(draftKey);
    if (raw) {
      try {
        const snap = JSON.parse(raw) as FormSnapshot;
        if (confirm("임시저장된 작성 중인 노티가 있습니다. 이어서 작성하시겠습니까?")) applySnapshot(snap);
      } catch {}
    }
    setDraftOffered(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

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

  function autoGenerateHx() {
    if (!onsetValue && symptoms.length === 0) {
      alert("Onset 값이나 증상을 먼저 입력/선택해주세요!");
      return;
    }
    const symptomText = symptoms.length ? symptoms.join(", ") : diagnosisDisplayLabel || "증상";
    setHx(`${symptomText} 증상 있어 local 치료하였으나 호전 없어 본원 응급실 내원하여 본과 진료 의뢰되신분입니다.`);
  }

  // 신체진찰 소견 전체를 한 줄로 이어지는 문장으로 생성합니다.
  function buildPhysicalExamText(): string {
    const parts: string[] = [];

    if (showPharynx) {
      if (tonsilFindings.length) parts.push(`Tonsil: ${tonsilFindings.join(", ")}`);
      if (ptBulging) {
        let s = `Peritonsillar bulging (${ptBulging})${ptBulgingSide ? ` ${ptBulgingSide}` : ""}`;
        if (uvulaDeviation) s += `, uvula deviation ${uvulaDeviation}`;
        parts.push(s);
      }
      if (lateralWallSwelling) {
        parts.push(`Lateral pharyngeal wall swelling ${lateralWallSwelling}${lateralWallSide ? ` ${lateralWallSide}` : ""}`);
      }
    }

    if (showLymphNode) {
      const lnParts: string[] = [];
      if (lnSide) lnParts.push(lnSide);
      if (lnLevel.length) lnParts.push(`level ${lnLevel.join("/")}`);
      if (lnSizeText) lnParts.push(lnSizeText);
      if (lnParts.length) parts.push(`Lymph node: ${lnParts.join(", ")}`);
    }

    if (showInflammatory) {
      const inflam: string[] = [];
      if (tenderness) inflam.push(`Tenderness ${tenderness}`);
      if (erythema) inflam.push(`Erythema ${erythema}`);
      if (heating) inflam.push(`Heating sensation ${heating}`);
      if (pus) inflam.push(`Pus ${pus}`);
      if (inflam.length) parts.push(inflam.join(", "));
    }

    if (showSalivary) {
      if (parotidSide || parotidStatus.length) {
        parts.push(`Parotid gland: ${[parotidSide, parotidStatus.join("/"), parotidDuct ? `Stensen's duct orifice ${parotidDuct}` : ""].filter(Boolean).join(", ")}`);
      }
      if (smgSide || smgStatus.length) {
        parts.push(`SMG: ${[smgSide, smgStatus.join("/"), smgDuct ? `Wharton's duct orifice ${smgDuct}` : ""].filter(Boolean).join(", ")}`);
      }
    }

    if (showOralFocus && oralFocus.length) {
      const oralText = oralFocus
        .map((o) => (o === "Dental caries" && dentalCariesTeeth ? `Dental caries (치아 #${dentalCariesTeeth})` : o))
        .join(", ");
      parts.push(`Oral cavity/FOM: ${oralText}`);
    }

    if (showAirwayFreeText && airwayExtraFindings) parts.push(airwayExtraFindings);

    // Airway 평가: 이상 소견이 있으면 구체적으로, 전부 정상이면 요약 문구 하나로
    const airwayAbnormal: string[] = [];
    if (larynxSwelling && larynxSwelling !== "-") airwayAbnormal.push(`Larynx swelling ${larynxSwelling}`);
    if (epiglottisSwelling && epiglottisSwelling !== "-") airwayAbnormal.push(`Epiglottis swelling ${epiglottisSwelling}`);
    if (vocalCordMovement && vocalCordMovement !== "intact") {
      const sideText = vocalCordSide ? `${vocalCordSide} ` : "";
      airwayAbnormal.push(`Vocal cord movement: ${sideText}${vocalCordMovement}`);
    }
    if (tvcVisible === "not_visible") airwayAbnormal.push("TVC 확인 안됨");

    if (airwayAbnormal.length) {
      parts.push(...airwayAbnormal);
    } else if (larynxSwelling || epiglottisSwelling || tvcVisible || vocalCordMovement) {
      // 하나라도 입력이 있었고, 모두 정상이었던 경우에만 요약 문구 추가
      parts.push("그 외 airway intact 하였습니다");
    }

    return parts.join(", ");
  }

  function buildAspirationLine(): string {
    if (aspirationDone !== "+") return "";
    const amt = pusAmount ? `${pusAmount} ` : "";
    if (idDone === "+") return `Aspiration 시도하였고 ${amt}drain되어 I&D 시행하였습니다.`;
    return `Aspiration 시도하였고 ${amt}pus like discharge drain 되어 culture 시행하였습니다 (I&D는 시행하지 않음).`;
  }

  function buildExplanationLine(): string {
    const parts: string[] = [];
    if (explainDeathRisk === "+") parts.push("sepsis 및 airway obstruction 진행 시 사망 가능성");
    if (explainProcedure === "+") parts.push("필요시 tracheostomy/I&D 시행 가능성");
    let line = parts.length ? `환자/보호자에게 ${parts.join(", ")}에 대해 설명드렸습니다.` : "";
    if (consentStatus === "temp") line += `${line ? " " : ""}동의서 임시 저장하였습니다.`;
    if (consentStatus === "signed") line += `${line ? " " : ""}동의서 서명 완료하였습니다.`;
    return line;
  }

  function buildAntibioticsText(): string {
    switch (antiPlanType) {
      case "double1": return "IV double anti (Cefoperazone/Sulbactam + Clindamycin)";
      case "double2": return "IV double anti (Ampicillin/Sulbactam + Clindamycin)";
      case "triple": return "IV triple anti (Ampicillin/Sulbactam + Clindamycin + Ceftriaxone)";
      case "other": return antiPlanOther ? `IV anti (${antiPlanOther})` : "";
      case "continue_previous": return "이전 처방력과 동일하게 Abx 유지";
      case "none": return "Abx 사용하지 않음";
      default: return "";
    }
  }

  function buildDietText(): string {
    const parts: string[] = [];
    if (dietType) parts.push(`${dietType} 유지`);
    if (tpn === "+") parts.push("TPN 사용");
    return parts.join(", ");
  }

  function buildCtLine(): string {
    const labSummary = formatLabSummary(parsedLabs);
    let line = "Lab 상";
    if (labSummary) line += ` ${labSummary} 확인되며,`;
    if (!ctFinding) return line;
    if (ctReadType === "추후 판독확인 필요") return `${line} Neck CT (CE) 상 ${ctFinding} 소견 보입니다 (추후 판독 확인 필요).`;
    return `${line} Neck CT (CE) ${ctReadType} 상 ${ctFinding} 확인됩니다.`;
  }

  function buildText() {
    const lines: string[] = [];
    lines.push("[응급실 환자 노티드립니다.]");
    lines.push("");
    lines.push(`${patientName || "ㅇㅇㅇ"} ${sex}/${age || "-"} ${diagnosisDisplayLabel}`);
    if (isPostopBleeding && (prevSurgDate || prevSurgName)) {
      lines.push(`이전 수술: ${prevSurgName || "-"} (${prevSurgDate || "날짜 미상"})`);
    }
    lines.push("");

    const underlyingAll = [...underlyingItems];
    if (underlyingEtc) underlyingAll.push(underlyingEtc);
    if (underlyingAll.length) {
      const anti = antiplatelet.length ? ` (${antiplatelet.join(", ")} 복용)` : "";
      lines.push(`기저질환 (+, ${underlyingAll.join(", ")}${anti})`);
    } else {
      lines.push("기저질환 (-)");
    }

    if (dentalHx === "+") {
      const details = [...dentalDetails];
      if (dentalEtc) details.push(dentalEtc);
      lines.push(`최근 치과 치료력 (+${details.length ? `, ${details.join(", ")}` : ""})`);
    } else if (dentalHx === "-") {
      lines.push("최근 치과 치료력 (-)");
    }

    if (onsetValue || hx) lines.push(`내원 ${onsetValue}${onsetUnit} 전부터 ${hx}`);

    const examText = buildPhysicalExamText();
    if (examText) {
      lines.push("");
      lines.push(`신체진찰 상 ${examText}.`);
    }

    const aspirationLine = buildAspirationLine();
    if (aspirationLine) {
      lines.push("");
      lines.push(aspirationLine);
    }

    lines.push("");
    lines.push(buildCtLine());

    lines.push("");
    if (treatReasons.length) {
      lines.push(`${treatReasons.join(", ")} 위해 입원 권유드렸으며 환자분 동의하시어${extraNote ? ` (${extraNote})` : ""}`);
    }
    lines.push(`${professorName} 교수님 노티드리고 입원장 발부하였습니다.`);

    const explanationLine = buildExplanationLine();
    if (explanationLine) lines.push(explanationLine);

    const planParts: string[] = [];
    const dietText = buildDietText();
    if (dietText) planParts.push(dietText);
    const antibioticsText = buildAntibioticsText();
    if (antibioticsText) planParts.push(antibioticsText);
    if (dexa === "+") planParts.push(`Dexa 사용, 1앰플 ${dexaFreq}`);
    if (careLevel.length) planParts.push(`${careLevel.join(", ")} 하기로 하였습니다`);
    if (planParts.length) lines.push(`입원하여 ${planParts.join(", ")}.`);

    const text = lines.join("\n");
    setFinalText(text);

    const s = suggestContact(risk, myCompetency);
    setContactSuggestion(s);

    setOpenSections((prev) => {
      const next: Record<string, boolean> = {};
      Object.keys(prev).forEach((k) => (next[k] = false));
      return next;
    });

    return { text, s };
  }

  async function handleFinalSave() {
    const { text, s } = buildText();
    if (!user) return;
    const payload = {
      residentId: user.id, residentName: user.name, residentLevel: user.level,
      patientName, patientAge: age, patientSex: sex,
      diagnosisId, diagnosisLabel: diagnosisDisplayLabel,
      risk, disposition, professorName, finalText: text,
      detail: {
        underlying: [...underlyingItems, underlyingEtc].filter(Boolean).join(", ") || "없음",
        hx: `${onsetValue}${onsetUnit} 전부터 ${hx}`,
        symptoms, bt, tonsilFindings,
        physicalExam: buildPhysicalExamText(),
        labSummary: formatLabSummary(parsedLabs),
        ctFinding,
        treatmentPlan: [buildDietText(), buildAntibioticsText(), dexa === "+" ? `Dexa ${dexaFreq}` : "", careLevel.join(", ")].filter(Boolean).join(" / "),
        contactSuggestion: `${s.method} - ${s.detail}`,
      },
    };
    await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
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
    risk === "HIGH" ? "bg-red-50 border-red-200 text-red-700" : risk === "MEDIUM" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-emerald-50 border-emerald-200 text-emerald-700";

  return (
    <div className="space-y-3 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">응급 노티 작성</h1>
        <div className="flex items-center gap-2">
          <span className={`chip ${riskColor(risk)}`}>위험도: {riskLabel(risk)}</span>
          <button type="button" onClick={saveDraft} className="btn-outline !px-3 !py-1.5 text-xs">임시저장</button>
          {draftSaved && <span className="text-xs text-emerald-600">저장됨</span>}
        </div>
      </div>

      {selectedDiagnosis?.immediateAdmit && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
          이 진단은 즉시 입원 대상으로 분류됩니다 (airway trauma / postop bleeding / deep neck infection 등).
        </div>
      )}

      {/* 환자 기본정보 */}
      <section className="card space-y-2">
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
                <button type="button" key={s} onClick={() => setSex(s)} className={`px-4 py-2 rounded-lg text-sm border ${sex === s ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">진단명</label>
            <select className="input" value={diagnosisId} onChange={(e) => setDiagnosisId(e.target.value)}>
              {diagnoses.map((d) => (<option key={d.id} value={d.id}>{d.label}</option>))}
            </select>
          </div>
        </div>
        {diagnosisId === "other" && (
          <input className="input" placeholder="진단명을 직접 입력하세요" value={customDiagnosisText} onChange={(e) => setCustomDiagnosisText(e.target.value)} />
        )}
        {isPostopBleeding && (
          <div className="grid grid-cols-2 gap-3 bg-red-50 border border-red-100 rounded-lg p-3">
            <div>
              <label className="label">이전 수술 날짜</label>
              <input className="input" placeholder="예: 2026.08.10" value={prevSurgDate} onChange={(e) => setPrevSurgDate(e.target.value)} />
            </div>
            <div>
              <label className="label">이전 수술명</label>
              <input className="input" placeholder="예: Tonsillectomy" value={prevSurgName} onChange={(e) => setPrevSurgName(e.target.value)} />
            </div>
          </div>
        )}
        <p className="text-xs text-slate-400">환자 등록번호는 개인정보 이슈로 저장하지 않습니다.</p>
      </section>

      {/* 기저질환 + 치과력 */}
      <details className="acc" open={openSections.underlying} onToggle={(e) => setOpenSections((p) => ({ ...p, underlying: (e.target as HTMLDetailsElement).open }))}>
        <summary>기저질환 / 치과 치료력</summary>
        <div className="acc-body">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">기저질환</label>
              <MultiCheck options={["HTN", "DM", "Tbc", "Asthma"]} values={underlyingItems} onChange={setUnderlyingItems} />
            </div>
            <div>
              <label className="label">항혈소판제</label>
              <MultiCheck options={["Aspirin", "Clopidogrel"]} values={antiplatelet} onChange={setAntiplatelet} />
            </div>
          </div>
          <input className="input" placeholder="기타 기저질환" value={underlyingEtc} onChange={(e) => setUnderlyingEtc(e.target.value)} />
          <div className="flex items-center gap-3 border-t border-slate-100 pt-2">
            <span className="label mb-0 whitespace-nowrap">최근 치과 치료력</span>
            {(["-", "+"] as const).map((v) => (
              <button type="button" key={v} onClick={() => setDentalHx(dentalHx === v ? "" : v)} className={`w-9 h-8 rounded-md text-xs font-semibold border ${dentalHx === v ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-500"}`}>
                {v}
              </button>
            ))}
            {dentalHx === "+" && <MultiCheck options={["발치", "임플란트"]} values={dentalDetails} onChange={setDentalDetails} />}
          </div>
          {dentalHx === "+" && (
            <input className="input" placeholder="기타 (선택)" value={dentalEtc} onChange={(e) => setDentalEtc(e.target.value)} />
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
            <button className="btn-outline !px-2 !py-1 text-xs ml-auto" onClick={autoGenerateHx} type="button">⚡ 문장 자동완성</button>
          </div>
          <textarea className="input min-h-[60px]" placeholder="증상 경과 및 hx (증상 내용을 포함해서 서술하면 됩니다)" value={hx} onChange={(e) => setHx(e.target.value)} />
          <div>
            <label className="label">증상 (hx 자동완성 및 위험도 판단용)</label>
            <MultiCheck options={symptomOptions} values={symptoms} onChange={setSymptoms} />
          </div>
          <div className="w-40">
            <label className="label">BT (fever 시)</label>
            <input className="input" value={bt} onChange={(e) => setBt(e.target.value)} placeholder="38.5" />
          </div>
        </div>
      </details>

      {/* Airway 평가 (항상 표시, 콤팩트) */}
      <section className="card space-y-0">
        <h2 className="font-medium text-slate-700 mb-1">Airway 평가 (모든 진단에서 확인)</h2>
        <div className="grid grid-cols-2 gap-x-6">
          <Toggle label="Larynx swelling" value={larynxSwelling} onChange={setLarynxSwelling} />
          <Toggle label="Epiglottis swelling" value={epiglottisSwelling} onChange={setEpiglottisSwelling} />
        </div>
        <div className="field-row">
          <span className="text-sm text-slate-700">TVC 확인</span>
          <div className="flex gap-1">
            {[{ v: "visible", label: "확인됨" }, { v: "not_visible", label: "확인 안됨" }].map((o) => (
              <button type="button" key={o.v} onClick={() => setTvcVisible(tvcVisible === o.v ? "" : (o.v as any))} className={`px-2.5 py-1 rounded-md text-xs border ${tvcVisible === o.v ? "bg-red-600 text-white border-red-600" : "border-slate-300 text-slate-600"}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="field-row">
          <span className="text-sm text-slate-700">Vocal cord movement</span>
          <div className="flex gap-1">
            {[{ v: "intact", label: "Intact" }, { v: "paresis", label: "Paresis" }, { v: "palsy", label: "Palsy" }].map((o) => (
              <button type="button" key={o.v} onClick={() => setVocalCordMovement(vocalCordMovement === o.v ? "" : (o.v as any))} className={`px-2.5 py-1 rounded-md text-xs border ${vocalCordMovement === o.v ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}>
                {o.label}
              </button>
            ))}
            {(vocalCordMovement === "paresis" || vocalCordMovement === "palsy") && (
              <div className="flex gap-1 ml-1">
                {(["Rt", "Lt", "Bilateral"] as const).map((s) => (
                  <button type="button" key={s} onClick={() => setVocalCordSide(vocalCordSide === s ? "" : s)} className={`px-2 py-1 rounded-md text-xs border ${vocalCordSide === s ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {showAirwayFreeText && (
          <div className="pt-2">
            <label className="label">추가 소견 (자유 기술, 예: AE fold swelling, epiglottic cyst)</label>
            <input className="input" placeholder="자유롭게 기술" value={airwayExtraFindings} onChange={(e) => setAirwayExtraFindings(e.target.value)} />
          </div>
        )}
      </section>

      {/* Pharynx/Tonsil */}
      {showPharynx && (
        <details className="acc" open={openSections.pharynx} onToggle={(e) => setOpenSections((p) => ({ ...p, pharynx: (e.target as HTMLDetailsElement).open }))}>
          <summary>Pharynx / Tonsil 소견</summary>
          <div className="acc-body">
            <MultiCheck options={["Enlargement", "Injection", "Whitish patch", "With ulceration", "Mass", "s/p tonsillectomy state"]} values={tonsilFindings} onChange={setTonsilFindings} />
            <div className="field-row">
              <span className="text-sm text-slate-700">Peritonsillar bulging</span>
              <div className="flex gap-1 items-center">
                {(["-", "±", "+"] as const).map((v) => (
                  <button type="button" key={v} onClick={() => setPtBulging(ptBulging === v ? "" : v)} className={`w-8 h-7 rounded-md text-xs font-semibold border ${ptBulging === v ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-500"}`}>
                    {v}
                  </button>
                ))}
                <SideChips value={ptBulgingSide} onChange={setPtBulgingSide} />
              </div>
            </div>
            {ptBulging && ptBulging !== "-" && (
              <div className="field-row">
                <span className="text-sm text-slate-600">Uvula deviation</span>
                <div className="flex gap-1">
                  {(["Lt", "Rt"] as const).map((s) => (
                    <button type="button" key={s} onClick={() => setUvulaDeviation(uvulaDeviation === s ? "" : s)} className={`px-2.5 py-1 rounded-md text-xs border ${uvulaDeviation === s ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="field-row">
              <span className="text-sm text-slate-700">Lateral pharyngeal wall swelling</span>
              <div className="flex gap-1 items-center">
                {(["-", "±", "+"] as const).map((v) => (
                  <button type="button" key={v} onClick={() => setLateralWallSwelling(lateralWallSwelling === v ? "" : v)} className={`w-8 h-7 rounded-md text-xs font-semibold border ${lateralWallSwelling === v ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-500"}`}>
                    {v}
                  </button>
                ))}
                <SideChips value={lateralWallSide} onChange={setLateralWallSide} />
              </div>
            </div>
          </div>
        </details>
      )}

      {/* Lymph node */}
      {showLymphNode && (
        <details className="acc" open={openSections.lymphNode} onToggle={(e) => setOpenSections((p) => ({ ...p, lymphNode: (e.target as HTMLDetailsElement).open }))}>
          <summary>Lymph Node 소견</summary>
          <div className="acc-body">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Location</label>
                <div className="flex gap-2">
                  {(["Rt", "Lt", "Bilateral"] as const).map((s) => (
                    <button type="button" key={s} onClick={() => setLnSide(lnSide === s ? "" : s)} className={`chip border ${lnSide === s ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Size</label>
                <input className="input" placeholder="예: about 2cm size" value={lnSizeText} onChange={(e) => setLnSizeText(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Level</label>
              <MultiCheck options={["I", "II", "III", "IV", "V", "VI"]} values={lnLevel} onChange={setLnLevel} />
            </div>
          </div>
        </details>
      )}

      {/* 염증 징후 */}
      {showInflammatory && (
        <details className="acc" open={openSections.inflammatory} onToggle={(e) => setOpenSections((p) => ({ ...p, inflammatory: (e.target as HTMLDetailsElement).open }))}>
          <summary>염증 및 감염 징후</summary>
          <div className="acc-body grid grid-cols-2 gap-x-6">
            <Toggle label="Tenderness" value={tenderness} onChange={setTenderness} options={["-", "+"]} />
            <Toggle label="Erythema" value={erythema} onChange={setErythema} options={["-", "+"]} />
            <Toggle label="Heating sensation" value={heating} onChange={setHeating} options={["-", "+"]} />
            <Toggle label="Pus" value={pus} onChange={setPus} options={["-", "+"]} />
          </div>
        </details>
      )}

      {/* 타액선 */}
      {showSalivary && (
        <details className="acc" open={openSections.salivary} onToggle={(e) => setOpenSections((p) => ({ ...p, salivary: (e.target as HTMLDetailsElement).open }))}>
          <summary>타액선 평가 (Parotid / SMG)</summary>
          <div className="acc-body">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Parotid - Side</label>
                <div className="flex gap-2">
                  {["Rt", "Lt", "Both"].map((s) => (
                    <button type="button" key={s} onClick={() => setParotidSide(parotidSide === s ? "" : s)} className={`chip border ${parotidSide === s ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Stensen's duct orifice</label>
                <div className="flex gap-2">
                  {["Clear", "Pus discharge (+)"].map((o) => (
                    <button type="button" key={o} onClick={() => setParotidDuct(parotidDuct === o ? "" : o)} className={`chip border ${parotidDuct === o ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <MultiCheck options={["WNL", "Swelling", "Tenderness", "Mass"]} values={parotidStatus} onChange={setParotidStatus} />
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-2">
              <div>
                <label className="label">SMG - Side</label>
                <div className="flex gap-2">
                  {["Rt", "Lt", "Both"].map((s) => (
                    <button type="button" key={s} onClick={() => setSmgSide(smgSide === s ? "" : s)} className={`chip border ${smgSide === s ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Wharton's duct orifice</label>
                <div className="flex gap-2">
                  {["Clear", "Pus discharge (+)"].map((o) => (
                    <button type="button" key={o} onClick={() => setSmgDuct(smgDuct === o ? "" : o)} className={`chip border ${smgDuct === o ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <MultiCheck options={["WNL", "Swelling", "Tenderness", "Mass"]} values={smgStatus} onChange={setSmgStatus} />
          </div>
        </details>
      )}

      {/* 구강저 */}
      {showOralFocus && (
        <details className="acc" open={openSections.oralFocus} onToggle={(e) => setOpenSections((p) => ({ ...p, oralFocus: (e.target as HTMLDetailsElement).open }))}>
          <summary>구강 / 구강저 (원발 병소 확인)</summary>
          <div className="acc-body">
            <MultiCheck options={["WNL", "Poor dental hygiene", "Dental caries"]} values={oralFocus} onChange={setOralFocus} />
            {oralFocus.includes("Dental caries") && (
              <input className="input" placeholder="몇 번 치아인지 (예: #16, #46)" value={dentalCariesTeeth} onChange={(e) => setDentalCariesTeeth(e.target.value)} />
            )}
          </div>
        </details>
      )}

      {/* Abscess 처치 */}
      {isAbscessDx && (
        <details className="acc" open={openSections.abscess} onToggle={(e) => setOpenSections((p) => ({ ...p, abscess: (e.target as HTMLDetailsElement).open }))}>
          <summary>Abscess 처치 (Aspiration / I&D)</summary>
          <div className="acc-body">
            <Toggle label="Aspiration 시행" value={aspirationDone} onChange={setAspirationDone} options={["-", "+"]} />
            {aspirationDone === "+" && (
              <>
                <Toggle label="I&D 시행" value={idDone} onChange={setIdDone} options={["-", "+"]} />
                <div>
                  <label className="label">Pus drain 양</label>
                  <div className="flex gap-2">
                    {["다량", "소량", "scanty"].map((o) => (
                      <button type="button" key={o} onClick={() => setPusAmount(pusAmount === o ? "" : o)} className={`chip border ${pusAmount === o ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}>
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </details>
      )}

      {/* Lab / CT */}
      <details className="acc" open={openSections.labCt} onToggle={(e) => setOpenSections((p) => ({ ...p, labCt: (e.target as HTMLDetailsElement).open }))}>
        <summary>Lab / Neck CT</summary>
        <div className="acc-body">
          <div>
            <label className="label">Lab 결과 붙여넣기 (자동 인식)</label>
            <textarea className="input min-h-[70px] font-mono text-xs" placeholder="예: WBC 12200 CRP 26.59 AST 88 ALT 56 eGFR 30" value={labText} onChange={(e) => setLabText(e.target.value)} />
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
                <option value="추후 판독확인 필요">추후 판독확인 필요</option>
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
            <label className="label">입원 사유</label>
            <MultiCheck options={["IV anti", "급성기 증상조절", "Nutritional support", "Airway close monitoring", "수술적 치료", "Pain control 등 conservative tx."]} values={treatReasons} onChange={setTreatReasons} />
          </div>
          <textarea className="input min-h-[45px]" placeholder="추가 특이사항 (자유 기술)" value={extraNote} onChange={(e) => setExtraNote(e.target.value)} />

          <div className="flex items-center gap-2 border-t border-slate-100 pt-2 flex-wrap">
            <span className="label mb-0 whitespace-nowrap">식이</span>
            {(["NPO", "SIPS", "일반식이"] as const).map((d) => (
              <button type="button" key={d} onClick={() => setDietType(dietType === d ? "" : d)} className={`chip border ${dietType === d ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}>
                {d}
              </button>
            ))}
            <span className="text-sm text-slate-500 ml-3">TPN</span>
            {(["-", "+"] as const).map((v) => (
              <button type="button" key={v} onClick={() => setTpn(tpn === v ? "" : v)} className={`w-8 h-7 rounded-md text-xs font-semibold border ${tpn === v ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-500"}`}>
                {v}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-2">
            <div>
              <label className="label">담당 교수님</label>
              <select className="input" value={professorName} onChange={(e) => setProfessorName(e.target.value)}>
                {PROFESSORS.map((p) => (<option key={p} value={p}>{p}</option>))}
              </select>
            </div>
            <div>
              <label className="label">Antibiotics plan</label>
              <select className="input" value={antiPlanType} onChange={(e) => setAntiPlanType(e.target.value as any)}>
                <option value="">선택</option>
                <option value="double1">Double - Cefoperazone/Sulbactam + Clindamycin</option>
                <option value="double2">Double - Ampicillin/Sulbactam + Clindamycin</option>
                <option value="triple">Triple - Ampicillin/Sulbactam + Clindamycin + Ceftriaxone</option>
                <option value="continue_previous">이전 처방력 있을 시 동일 Abx 유지</option>
                <option value="none">Abx 사용하지 않음</option>
                <option value="other">기타 (직접 기술)</option>
              </select>
            </div>
          </div>
          {antiPlanType === "other" && (
            <input className="input" placeholder="예: 감염내과 협진 답변대로 ~" value={antiPlanOther} onChange={(e) => setAntiPlanOther(e.target.value)} />
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="label mb-0 whitespace-nowrap">Dexa</span>
            {(["-", "+"] as const).map((v) => (
              <button type="button" key={v} onClick={() => setDexa(dexa === v ? "" : v)} className={`w-9 h-8 rounded-md text-xs font-semibold border ${dexa === v ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-500"}`}>
                {v}
              </button>
            ))}
            {dexa === "+" && (
              <select className="input !w-auto !py-1" value={dexaFreq} onChange={(e) => setDexaFreq(e.target.value)}>
                <option value="BID">1앰플 BID</option>
                <option value="QD">1앰플 QD</option>
              </select>
            )}
          </div>
          <div>
            <label className="label">Care level</label>
            <MultiCheck options={["ICU care", "처치실 care", "일반병실 care"]} values={careLevel} onChange={setCareLevel} />
          </div>
          <div className="border-t border-slate-100 pt-2">
            <label className="label">환자/보호자 설명</label>
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={explainDeathRisk === "+"} onChange={(e) => setExplainDeathRisk(e.target.checked ? "+" : "")} />
                Sepsis / airway obstruction 진행으로 인한 사망 가능성 설명
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={explainProcedure === "+"} onChange={(e) => setExplainProcedure(e.target.checked ? "+" : "")} />
                필요시 tracheostomy / I&D 시행 가능성 설명
              </label>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-slate-600">동의서</span>
              {[{ v: "temp", label: "임시저장" }, { v: "signed", label: "서명완료" }].map((o) => (
                <button type="button" key={o.v} onClick={() => setConsentStatus(consentStatus === o.v ? "" : (o.v as any))} className={`chip border ${consentStatus === o.v ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </details>

      <div className="flex flex-wrap gap-3">
        <button className="btn" onClick={() => buildText()} type="button">최종 format 생성/미리보기</button>
      </div>

      {finalText && (
        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-slate-700">최종 노티 텍스트 (수정 가능)</h2>
            <button className="btn-outline !px-3 !py-1.5 text-xs" onClick={copyToClipboard} type="button">복사하기 (카카오톡 붙여넣기용)</button>
          </div>
          <textarea className="input min-h-[260px] font-mono text-sm" value={finalText} onChange={(e) => setFinalText(e.target.value)} />

          {contactSuggestion && (
            <div className={`rounded-lg border text-sm px-4 py-3 ${suggestionColor}`}>
              <span className="font-medium">권장 노티 방식: {contactSuggestion.method}</span>
              <p className="opacity-80 mt-1">{contactSuggestion.detail}</p>
            </div>
          )}

          <div className="border-t border-slate-100 pt-3 space-y-3">
            <div>
              <label className="label">최종 처리 결과</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(DISPOSITION_LABEL) as Disposition[]).map((d) => (
                  <button type="button" key={d} onClick={() => setDisposition(d)} className={`chip border ${disposition === d ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}>
                    {DISPOSITION_LABEL[d]}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn" onClick={handleFinalSave} type="button">최종 저장</button>
            {saved && <span className="text-sm text-emerald-600 ml-3">저장되었습니다.</span>}
          </div>
        </section>
      )}
    </div>
  );
}
