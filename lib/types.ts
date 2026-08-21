import { RiskLevel } from "./triage";

export type Disposition = "admit" | "opd_fu" | "referral" | "transfer";

export const DISPOSITION_LABEL: Record<Disposition, string> = {
  admit: "입원 결정",
  opd_fu: "OPD f/u",
  referral: "타과 의뢰",
  transfer: "전원",
};

export const PROFESSORS = ["박민규", "이현아", "곽진혜"] as const;

export interface NotificationRecord {
  id: string;
  createdAt: string; // ISO string (시간대 판단에 사용)
  residentId: string;
  residentName: string;
  residentLevel: string;
  patientName: string;
  patientAge: string;
  patientSex: "M" | "F";
  diagnosisId: string;
  diagnosisLabel: string;
  risk: RiskLevel;
  disposition: Disposition;
  professorName?: string;
  finalText: string;
  // 상세보기용 원본 입력 스냅샷 (통계 화면에서 펼쳐보기)
  detail?: {
    underlying: string;
    hx: string;
    symptoms: string[];
    bt: string;
    tonsilFindings: string[];
    physicalExam: string;
    labSummary: string;
    ctFinding: string;
    treatmentPlan: string;
    contactSuggestion: string;
  };
}

export interface EvaluationRecord {
  id: string;
  createdAt: string;
  residentId: string;
  residentName: string;
  evaluatorId: string;
  diagnosisId: string;
  diagnosisLabel: string;
  competency: 1 | 2 | 3 | 4 | 5; // 1: 개입 많이 필요 ~ 5: 단독 진행 가능
  note?: string;
}

// --- MDT 환자 목록 ---
export type HospitalSite = "구리" | "서울";

export interface MdtPatient {
  id: string;
  createdAt: string;
  site: HospitalSite;
  registrationNo: string;
  name: string;
  sex: string;
  age: string;
  diagnosis: string;
  summary: string; // MDT 스마트보드에서 생성한 요약 전체 텍스트
}
