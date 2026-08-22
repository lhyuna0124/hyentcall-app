export type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

export interface DiagnosisRule {
  id: string;
  label: string; // 화면 표시용
  baseRisk: RiskLevel;
  immediateAdmit: boolean; // 바로 입원 대상 (airway trauma, postop bleeding, deep neck 등)
}

export const DEFAULT_DIAGNOSES: DiagnosisRule[] = [
  { id: "tonsillitis", label: "Acute tonsillitis", baseRisk: "LOW", immediateAdmit: false },
  { id: "ptabscess", label: "Peritonsillar abscess", baseRisk: "MEDIUM", immediateAdmit: false },
  { id: "epiglottitis", label: "Acute epiglottitis", baseRisk: "HIGH", immediateAdmit: false },
  { id: "acute_laryngitis", label: "Acute laryngitis", baseRisk: "LOW", immediateAdmit: false },
  { id: "cervical_lad", label: "Cervical lymphadenitis / lymphadenopathy", baseRisk: "LOW", immediateAdmit: false },
  { id: "parotitis", label: "Acute parotitis", baseRisk: "LOW", immediateAdmit: false },
  { id: "parotid_abscess", label: "Parotid abscess", baseRisk: "MEDIUM", immediateAdmit: false },
  { id: "airway_trauma", label: "Airway trauma", baseRisk: "HIGH", immediateAdmit: true },
  { id: "postop_bleeding", label: "Postop bleeding (tonsillectomy/thyroidectomy/LMS 등)", baseRisk: "HIGH", immediateAdmit: true },
  { id: "deep_neck", label: "Deep neck infection", baseRisk: "HIGH", immediateAdmit: true },
  { id: "acute_sinusitis", label: "Acute sinusitis", baseRisk: "MEDIUM", immediateAdmit: false },
  { id: "epistaxis", label: "Epistaxis", baseRisk: "MEDIUM", immediateAdmit: false },
  { id: "transfer", label: "타병원 전원", baseRisk: "MEDIUM", immediateAdmit: false },
  { id: "other", label: "기타 (자유롭게 기술)", baseRisk: "LOW", immediateAdmit: false },
];

// 관리자 화면에서 이 규칙 자체를 수정할 수 있도록 KV에 저장/불러오기 (lib/kv.ts, /api/algorithm 참고)
export interface EscalationRule {
  id: string;
  description: string; // 예: "True vocal cord 확인 불가 -> airway compromise 가능성"
  condition: string; // 내부 식별자 (예: tvc_not_visible)
  raiseTo: RiskLevel;
}

export const DEFAULT_ESCALATIONS: EscalationRule[] = [
  {
    id: "tvc_not_visible",
    description: "True vocal cord 확인 불가 → airway compromise 가능성으로 위험도 상향",
    condition: "tvc_not_visible",
    raiseTo: "HIGH",
  },
  {
    id: "epiglottis_severe_swelling",
    description: "Epiglottis swelling(+) 이면서 dyspnea 동반 → 위험도 상향",
    condition: "epiglottis_swelling_dyspnea",
    raiseTo: "HIGH",
  },
];

export function riskColor(risk: RiskLevel) {
  switch (risk) {
    case "HIGH":
      return "bg-red-100 text-red-700 border border-red-200";
    case "MEDIUM":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    default:
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  }
}

export function riskLabel(risk: RiskLevel) {
  return risk === "HIGH" ? "높음 (즉시 입원 고려)" : risk === "MEDIUM" ? "중간" : "낮음";
}
