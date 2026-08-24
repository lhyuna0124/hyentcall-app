import { ConsentProcedure } from "./types";

// 실험실 > 수술동의서 양식의 초기 목록입니다. 이후 추가되는 항목은 관리자가 화면에서
// 직접 추가하며 KV에 저장됩니다 (이 배열은 최초 1회 기본값으로만 쓰입니다).
export const DEFAULT_CONSENT_PROCEDURES: ConsentProcedure[] = [
  { id: "thyroidectomy", name: "Thyroidectomy", category: "두경부" },
  { id: "parotidectomy", name: "Parotidectomy", category: "두경부" },
];
