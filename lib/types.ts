import { RiskLevel } from "./triage";

export interface NotificationRecord {
  id: string;
  createdAt: string; // ISO string
  residentId: string;
  residentName: string;
  residentLevel: string;
  patientName: string;
  patientAge: string;
  patientSex: "M" | "F";
  diagnosisId: string;
  diagnosisLabel: string;
  risk: RiskLevel;
  admitted: boolean;
  professorName?: string;
  finalText: string;
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
