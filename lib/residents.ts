export type Level = "R1" | "R2" | "R3" | "R4" | "ATTENDING" | "H&N RN";

export interface Resident {
  id: string;
  name: string;
  level: Level;
  phoneLast4: string; // 로그인용 (핸드폰 뒷 4자리)
  isAdmin?: boolean;
}

// 계정 목록의 초기값입니다. 이후 추가/수정/삭제는 관리자 화면(계정 관리)에서 하며 KV에 저장됩니다
// (이 배열은 최초 1회 기본값으로만 쓰입니다 - /api/residents 참고).
export const DEFAULT_RESIDENTS: Resident[] = [
  { id: "swg", name: "서우근", level: "R4", phoneLast4: "0420" },
  { id: "hsm", name: "홍성만", level: "R4", phoneLast4: "4308" },
  { id: "bjs", name: "반준성", level: "R4", phoneLast4: "2713" },
  { id: "bmj", name: "백민주", level: "R3", phoneLast4: "9109" },
  { id: "lhk", name: "이하경", level: "R2", phoneLast4: "7288" },
  { id: "kma", name: "김민아", level: "R2", phoneLast4: "5913" },
  { id: "ysy", name: "유승연", level: "R1", phoneLast4: "0368" },
  { id: "psm", name: "박승민", level: "R1", phoneLast4: "7524" },
  { id: "ljw", name: "이진원", level: "H&N RN", phoneLast4: "0347" },
  // 관리자(교수/치프) 계정 예시 - 이름/전화번호 뒷자리를 실제 값으로 변경하세요.
  { id: "admin", name: "관리자", level: "ATTENDING", phoneLast4: "9999", isAdmin: true },
];
