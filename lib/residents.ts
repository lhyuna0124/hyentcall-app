export type Level = "R1" | "R2" | "R3" | "R4" | "ATTENDING";

export interface Resident {
  id: string;
  name: string;
  level: Level;
  phoneLast4: string; // 로그인용 (핸드폰 뒷 4자리)
  isAdmin?: boolean;
}

// 실제 운영 시에는 이 목록을 관리자 화면(/admin/users) 또는 환경변수/DB로 옮기는 것을 권장합니다.
// phoneLast4 는 예시이며, 배포 전 반드시 실제 값으로 교체하세요.
export const RESIDENTS: Resident[] = [
  { id: "swg", name: "서우근", level: "R4", phoneLast4: "0420" },
  { id: "hsm", name: "홍성만", level: "R4", phoneLast4: "4308" },
  { id: "bjs", name: "반준성", level: "R4", phoneLast4: "2713" },
  { id: "bmj", name: "백민주", level: "R3", phoneLast4: "9109" },
  { id: "lhk", name: "이하경", level: "R2", phoneLast4: "7288" },
  { id: "kma", name: "김민아", level: "R2", phoneLast4: "5913" },
  { id: "ysy", name: "유승연", level: "R1", phoneLast4: "0368" },
  { id: "psm", name: "박승민", level: "R1", phoneLast4: "7524" },
  // 관리자(교수/치프) 계정 예시 - 이름/전화번호 뒷자리를 실제 값으로 변경하세요.
  { id: "admin", name: "관리자", level: "ATTENDING", phoneLast4: "9999", isAdmin: true },
];

export function findResident(name: string, phoneLast4: string): Resident | undefined {
  return RESIDENTS.find(
    (r) => r.name === name.trim() && r.phoneLast4 === phoneLast4.trim()
  );
}

export function getResident(id: string): Resident | undefined {
  return RESIDENTS.find((r) => r.id === id);
}
