export interface LabRule {
  key: string; // 내부 키
  aliases: string[]; // 인식할 텍스트 (대소문자 무시)
  label: string; // 표시 이름
  low?: number;
  high?: number;
  unit?: string;
  alwaysShow?: boolean; // CRP처럼 항상 표기해야 하는 항목
}

// 병원마다 정상범위가 다를 수 있으니 배포 전 각 항목의 low/high를 실제 검사실 기준으로 조정하세요.
// WBC/Platelet은 EHR에서 보통 "x10^3/μL" (천 단위) 로 표기되므로 그 기준으로 맞췄습니다.
// (예: WBC 9.9 = 9,900/μL). 병원 표기가 원시 카운트(예: 9900)라면 이 두 항목의 low/high를 1000배로 조정하세요.
export const LAB_RULES: LabRule[] = [
  { key: "WBC", aliases: ["wbc"], label: "WBC", low: 4.0, high: 10.0 },
  { key: "CRP", aliases: ["crp"], label: "CRP", low: 0, high: 0.5, alwaysShow: true },
  { key: "Hb", aliases: ["hb", "hgb"], label: "Hb", low: 12, high: 16 },
  { key: "Hct", aliases: ["hct"], label: "Hct", low: 36, high: 48 },
  { key: "RBC", aliases: ["rbc"], label: "RBC", low: 4.0, high: 5.5 },
  { key: "PLT", aliases: ["plt", "platelet"], label: "Platelet", low: 150, high: 400 },
  { key: "AST", aliases: ["ast", "got"], label: "AST", low: 0, high: 40 },
  { key: "ALT", aliases: ["alt", "gpt"], label: "ALT", low: 0, high: 40 },
  { key: "BUN", aliases: ["bun"], label: "BUN", low: 8, high: 20 },
  { key: "Cr", aliases: ["cr", "creatinine"], label: "Cr", low: 0.6, high: 1.2 },
  { key: "eGFR", aliases: ["egfr"], label: "eGFR", low: 60 },
  { key: "Na", aliases: ["na"], label: "Na", low: 135, high: 145 },
  { key: "K", aliases: ["k"], label: "K", low: 3.5, high: 5.1 },
  { key: "Cl", aliases: ["cl"], label: "Cl", low: 98, high: 107 },
  { key: "TroponinI", aliases: ["troponin i", "troponin", "tni"], label: "Troponin I", low: 0, high: 0.04 },
  { key: "Glucose", aliases: ["glucose", "glu"], label: "Glucose", low: 70, high: 140 },
];

export interface ParsedLab {
  key: string;
  label: string;
  value: number;
  raw: string;
  status: "low" | "high" | "normal";
  arrow: string; // ▲ / ▼ / ""
}

// "WBC 12200 CRP 26.59 AST 88/ALT 56 eGFR 30" 같은 텍스트 (복붙 결과 포함) 파싱
export function parseLabText(text: string): ParsedLab[] {
  const results: ParsedLab[] = [];
  if (!text) return results;

  for (const rule of LAB_RULES) {
    for (const alias of rule.aliases) {
      // alias 뒤에 오는 첫 숫자(소수점 포함)를 값으로 인식. 화살표(▲▼) 등이 중간에 있어도 인식.
      const regex = new RegExp(`${escapeRegex(alias)}[\\s:=▲▼]*(-?\\d+(?:\\.\\d+)?)`, "i");
      const match = text.match(regex);
      if (match) {
        const value = parseFloat(match[1]);
        let status: ParsedLab["status"] = "normal";
        let arrow = "";
        if (rule.high !== undefined && value > rule.high) {
          status = "high";
          arrow = "▲";
        } else if (rule.low !== undefined && value < rule.low) {
          status = "low";
          arrow = "▼";
        }
        results.push({
          key: rule.key,
          label: rule.label,
          value,
          raw: match[0],
          status,
          arrow,
        });
        break; // 같은 rule 내에서는 첫 매치만 사용
      }
    }
  }
  return results;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 노티장 텍스트에 들어갈 lab 요약 문자열 생성
// WBC 는 항상 - 표시, CRP는 항상 표기, 그 외 항목은 이상치일 때만 표기
export function formatLabSummary(parsed: ParsedLab[]): string {
  const parts: string[] = [];
  const wbc = parsed.find((p) => p.key === "WBC");
  const crp = parsed.find((p) => p.key === "CRP");

  if (wbc) parts.push(`WBC ${wbc.value}${wbc.arrow ? " " + wbc.arrow : ""}`);
  if (crp) parts.push(`CRP ${crp.value}${crp.arrow ? " " + crp.arrow : ""}`);

  for (const p of parsed) {
    if (p.key === "WBC" || p.key === "CRP") continue;
    if (p.status !== "normal") {
      parts.push(`${p.label} ${p.value}${p.arrow ? " " + p.arrow : ""}`);
    }
  }
  return parts.join(", ");
}
