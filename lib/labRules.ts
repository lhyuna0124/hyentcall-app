export interface LabRule {
  key: string; // 내부 키
  aliases: string[]; // 인식할 텍스트 (대소문자 무시)
  label: string; // 표시 이름
  low?: number;
  high?: number;
  unit?: string;
  alwaysShow?: boolean; // WBC/CRP처럼 항상 표기해야 하는 항목
}

// 병원마다 정상범위가 다를 수 있으니 배포 전 각 항목의 low/high를 실제 검사실 기준으로 조정하세요.
// WBC/Platelet은 EHR에서 보통 "x10^3/μL" (천 단위) 로 표기되므로 그 기준으로 맞췄습니다.
// (예: WBC 9.9 = 9,900/μL). 병원 표기가 원시 카운트(예: 9900)라면 이 두 항목의 low/high를 1000배로 조정하세요.
// RBC는 임상적으로 Hb(헤모글로빈)만큼 중요하게 보지 않아 자동인식 대상에서 제외했습니다.
export const LAB_RULES: LabRule[] = [
  { key: "WBC", aliases: ["wbc"], label: "WBC", low: 4, high: 10, alwaysShow: true },
  { key: "CRP", aliases: ["crp"], label: "CRP", low: 0, high: 0.5, alwaysShow: true },
  { key: "Hb", aliases: ["hb", "hgb", "hemoglobin"], label: "Hb", low: 13, high: 17 },
  { key: "Hct", aliases: ["hct", "hematocrit"], label: "Hct", low: 36, high: 48 },
  { key: "PLT", aliases: ["plt", "platelet"], label: "Platelet", low: 150, high: 450 },
  { key: "ANC", aliases: ["anc"], label: "ANC", low: 1.57, high: 8.3 },
  { key: "AST", aliases: ["ast", "got"], label: "AST", low: 0, high: 49 },
  { key: "ALT", aliases: ["alt", "gpt"], label: "ALT", low: 0, high: 49 },
  { key: "BUN", aliases: ["bun"], label: "BUN", low: 8, high: 20 },
  { key: "Cr", aliases: ["cr", "creatinine"], label: "Cr", low: 0.67, high: 1.17 },
  { key: "eGFR", aliases: ["egfr"], label: "eGFR", low: 60 },
  { key: "Na", aliases: ["na", "sodium"], label: "Na", low: 136, high: 146 },
  { key: "K", aliases: ["k", "potassium"], label: "K", low: 3.5, high: 5.5 },
  { key: "Cl", aliases: ["cl", "chloride"], label: "Cl", low: 101, high: 109 },
  { key: "Ca", aliases: ["calcium"], label: "Calcium", low: 8.6, high: 10.3 },
  { key: "Phos", aliases: ["phosphorus", "phosphate"], label: "Phosphorus", low: 2.5, high: 4.5 },
  { key: "Amylase", aliases: ["amylase"], label: "Amylase", low: 44, high: 132 },
  { key: "Lipase", aliases: ["lipase"], label: "Lipase", low: 1, high: 66 },
  { key: "CKMB", aliases: ["ck-mb", "ckmb", "creatine kinase-mb"], label: "CK-MB", low: 0, high: 4.7 },
  { key: "TroponinI", aliases: ["troponin i", "troponin", "tni"], label: "Troponin I", low: 0, high: 0.026 },
  { key: "ESR", aliases: ["esr"], label: "ESR", low: 0, high: 15 },
  { key: "Presepsin", aliases: ["presepsin"], label: "Presepsin", low: 0, high: 336.9 },
  { key: "DDimer", aliases: ["d-dimer", "ddimer", "d dimer"], label: "D-dimer", low: 0, high: 500 },
  { key: "Glucose", aliases: ["glucose", "glu"], label: "Glucose", low: 70, high: 140 },
];

export interface ParsedLab {
  key: string;
  label: string;
  value: number;
  raw: string;
  status: "low" | "high" | "normal";
  arrow: string; // ▲ / ▼ / ""
  date: string | null; // YYYY-MM-DD (인식되지 않으면 null)
}

// 날짜 뒤에 "13:48" 같은 검사 시각이 붙는 경우가 많아, 그 시각까지 함께 건너뛰지 않으면
// 시각의 ":" 이 검사명/결과를 구분하는 실제 ":" 보다 먼저 잡혀 파싱이 깨집니다.
const DATE_LINE_RE = /^\s*(\d{4}-\d{2}-\d{2})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?\s+(.*)$/;
const VALUE_RE = /\s*([▲▼])?\s*(-?\d+(?:\.\d+)?)/;

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findRule(namePart: string): LabRule | undefined {
  const lower = namePart.toLowerCase();
  for (const rule of LAB_RULES) {
    for (const alias of rule.aliases) {
      const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(alias)}($|[^a-z0-9])`, "i");
      if (re.test(lower)) return rule;
    }
  }
  return undefined;
}

function evaluateStatus(rule: LabRule, value: number, sourceArrow: string): { status: ParsedLab["status"]; arrow: string } {
  let status: ParsedLab["status"] = "normal";
  let arrow = "";
  if (rule.high !== undefined && value > rule.high) {
    status = "high";
    arrow = "▲";
  } else if (rule.low !== undefined && value < rule.low) {
    status = "low";
    arrow = "▼";
  }
  if (status === "normal" && sourceArrow) {
    // 계산상 정상 범위여도 원본에 화살표가 찍혀 있으면 병원 기준을 신뢰합니다.
    status = sourceArrow === "▲" ? "high" : "low";
    arrow = sourceArrow;
  }
  return { status, arrow };
}

// EMR에서 그대로 복사한 "검사일시 / 검사명 : 검사결과" 표 형식 (날짜별로 여러 번 붙여넣어도 인식)과
// "WBC 12200 CRP 26.59 AST 88 ALT 56 eGFR 30" 같은 단순 나열 형식을 모두 지원합니다.
export function parseLabText(text: string): ParsedLab[] {
  if (!text) return [];

  const dated: ParsedLab[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const dateMatch = line.match(DATE_LINE_RE);
    const date = dateMatch ? dateMatch[1] : null;
    const rest = dateMatch ? dateMatch[2] : line;
    const colonIdx = rest.lastIndexOf(":");
    if (colonIdx === -1) continue;
    const namePart = rest.slice(0, colonIdx);
    const valuePart = rest.slice(colonIdx + 1);
    const rule = findRule(namePart);
    if (!rule) continue;
    const valueMatch = valuePart.match(VALUE_RE);
    if (!valueMatch) continue;
    const value = parseFloat(valueMatch[2]);
    const { status, arrow } = evaluateStatus(rule, value, valueMatch[1] || "");
    dated.push({ key: rule.key, label: rule.label, value, raw: line, status, arrow, date });
  }
  if (dated.length > 0) return dated;

  // 표 형식이 아니면(콜론/날짜 없이 쭉 나열된 경우) 기존 방식대로 전체 텍스트에서 한 번씩만 인식
  const flat: ParsedLab[] = [];
  for (const rule of LAB_RULES) {
    for (const alias of rule.aliases) {
      const regex = new RegExp(`(^|[^a-z0-9])${escapeRegex(alias)}[\\s:=]*(-?\\d+(?:\\.\\d+)?)`, "i");
      const match = text.match(regex);
      if (match) {
        const value = parseFloat(match[2]);
        const { status, arrow } = evaluateStatus(rule, value, "");
        flat.push({ key: rule.key, label: rule.label, value, raw: match[0], status, arrow, date: null });
        break;
      }
    }
  }
  return flat;
}

// 항목별로 가장 최근 값 하나만 남깁니다 (칩 미리보기 등 요약 표시용).
export function latestPerKey(parsed: ParsedLab[]): ParsedLab[] {
  const byKey = new Map<string, ParsedLab>();
  for (const p of parsed) {
    const existing = byKey.get(p.key);
    if (!existing || compareDateDesc(p.date, existing.date) < 0) byKey.set(p.key, p);
  }
  return Array.from(byKey.values());
}

function compareDateDesc(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return -1; // 날짜 미상은 가장 최근으로 취급 (단일 판독 텍스트 호환)
  if (b === null) return 1;
  return a < b ? 1 : -1;
}

export function todayISODate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatMonthDay(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

// 노티장 텍스트에 들어갈 lab 요약 문자열 생성
// WBC/CRP는 항상 표기, 그 외 항목은 최근 값이 이상치일 때만 표기합니다.
// 같은 항목의 이전 검사 결과가 있고 최근 값이 이상치라면(이전 값이 정상이어도) 괄호 안에 비교값을 함께 표기합니다.
// 최근 검사일이 노티 작성일(오늘)과 다르면 날짜를 표기하고, 같으면 생략합니다.
export function formatLabSummary(parsed: ParsedLab[], today: string = todayISODate()): string {
  const byKey = new Map<string, ParsedLab[]>();
  for (const p of parsed) {
    if (!byKey.has(p.key)) byKey.set(p.key, []);
    byKey.get(p.key)!.push(p);
  }
  for (const list of byKey.values()) {
    list.sort((a, b) => compareDateDesc(a.date, b.date));
  }

  const orderedKeys = Array.from(byKey.keys()).sort((a, b) => {
    const rank = (k: string) => (k === "WBC" ? 0 : k === "CRP" ? 1 : 2);
    return rank(a) - rank(b);
  });

  const primaryParts: string[] = [];
  const comparisonByDate = new Map<string, string[]>();

  for (const key of orderedKeys) {
    const readings = byKey.get(key)!;
    const recent = readings[0];
    const rule = LAB_RULES.find((r) => r.key === key);
    const alwaysShow = rule?.alwaysShow;
    if (!alwaysShow && recent.status === "normal") continue;

    const datePrefix = recent.date && recent.date !== today ? `${formatMonthDay(recent.date)} ` : "";
    primaryParts.push(`${datePrefix}${recent.label} ${recent.value}${recent.arrow ? " " + recent.arrow : ""}`);

    const older = readings[1];
    if (older && recent.status !== "normal") {
      const dateGroupKey = older.date ?? "";
      if (!comparisonByDate.has(dateGroupKey)) comparisonByDate.set(dateGroupKey, []);
      comparisonByDate.get(dateGroupKey)!.push(`${older.label} ${older.value}${older.arrow ? " " + older.arrow : ""}`);
    }
  }

  let result = primaryParts.join(", ");
  for (const [dateGroupKey, items] of comparisonByDate) {
    const label = dateGroupKey && dateGroupKey !== today ? `${formatMonthDay(dateGroupKey)} ` : "";
    result += ` (${label}${items.join(", ")})`;
  }
  return result;
}
