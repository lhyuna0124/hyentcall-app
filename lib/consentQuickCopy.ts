import { ConsentCategory } from "./types";
import { NECK_DISSECTION_NERVE_TEXT } from "./neckDissectionNerves";
import { TRACHEOSTOMY_CONSENT_TEXT } from "./tracheostomyConsent";

export interface QuickCopyText {
  id: string;
  label: string;
  text: string;
}

// 분류별로 원클릭 복사 가능한 문구 목록입니다. 전공의 누구나 언제든(관리자 편집 모드와 무관하게)
// 클릭해서 클립보드에 복사할 수 있습니다.
export const QUICK_COPY_TEXTS: Record<ConsentCategory, QuickCopyText[]> = {
  두경부: [
    { id: "neck-dissection-nerve", label: "<첨지>와 같은 신경손상이 발생할 수 있다.", text: NECK_DISSECTION_NERVE_TEXT },
    { id: "tracheostomy", label: "<tracheostomy>", text: TRACHEOSTOMY_CONSENT_TEXT },
  ],
  비과: [],
  이과: [],
  "일반 local": [],
};
