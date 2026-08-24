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

// --- 바로가기 링크 (우측 하단 위젯) ---
export interface QuickLink {
  id: string;
  label: string;
  url: string;
}

// --- 개인 바로가기 (전공의 ID별로 직접 편집) ---
export interface PersonalLink {
  id: string;
  label: string;
  url: string;
}

// --- 개인 메모장 (Windows 메모장처럼 자유 기술 + 저장) ---
export interface PersonalMemo {
  content: string;
  updatedAt: string;
}

// --- 건의사항 (우측 하단 위젯에서 관리자에게 전송) ---
export interface FeedbackRecord {
  id: string;
  createdAt: string;
  residentId: string;
  residentName: string;
  message: string;
}

// --- 실험실: 수술동의서 양식 (준비 중인 기능을 미리 테스트해보는 공간) ---
export const CONSENT_CATEGORIES = ["두경부", "비과", "이과", "일반 local"] as const;
export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number];

export interface ConsentProcedure {
  id: string;
  name: string;
  category: ConsentCategory;
}

// 표준 수술/시술 동의서 4개 항목 (보건복지부 표준 동의서 양식 기준)
export interface ConsentTemplate {
  procedureId: string;
  procedureName: string;
  procedureNameKo?: string; // 수술명 한글 표기
  purpose: string; // 1. 수술(시술, 검사)의 목적 및 효과
  process: string; // 2. 수술과정 및 방법, 수술(시술, 검사) 부위 및 추정 소요 시간
  complications: string; // 3. 발현가능한 합병증(후유증)의 내용, 정도 및 대처방법
  precautions: string; // 4. 수술(시술, 검사) 관련 주의 사항
  updatedAt: string;
}

export interface ConsentComment {
  id: string;
  createdAt: string;
  procedureId: string;
  authorId: string;
  authorName: string;
  authorLevel: string;
  text: string;
}

// --- MDT 환자 목록 ---
export type HospitalSite = "구리" | "서울";

export interface MdtSurgRow {
  name: string;
  date: string;
  path: string;
}
export interface MdtImgRow {
  name: string;
  date: string;
  desc: string;
}

export interface MdtPatient {
  id: string;
  createdAt: string;
  updatedAt?: string;
  site: HospitalSite;
  registrationNo: string;
  name: string;
  sex: string;
  age: string;
  diagnosis: string;
  summary: string; // MDT 스마트보드에서 생성한 요약 전체 텍스트
  // 다시 불러왔을 때 각 입력칸을 그대로 복원하기 위한 전체 스냅샷
  detail?: {
    cc: string;
    onset: string;
    pi: string;
    pmhChecks: string[];
    pmhEtc: string;
    egfr: string;
    dental: string;
    ptype: string;
    surgRows: MdtSurgRow[];
    imgRows: MdtImgRow[];
  };
}
