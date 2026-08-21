// 병원 EHR에서 랩/영상판독 결과를 복사-붙여넣기 했을 때, 노티에 불필요한 정보
// (환자번호, 처방일/접수일/보고일, 판독의, 불필요한 빈 줄, 검사일시, 단위 등)를 제거하고
// 깔끔하게 정리된 텍스트를 만들어줍니다.

function cleanCRLF(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function extractExamDate(text: string): string | null {
  const m = text.match(/【검사일】\s*(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const fallback = text.match(/(\d{4}-\d{2}-\d{2})/);
  return fallback ? fallback[1] : null;
}

function dateTag(date: string | null) {
  return date ? `<${date.replace(/-/g, ".")}>` : "";
}

// "YYYY-MM-DD [HH:MM] 검사명 :결과" 형식의 라인들을 모두 찾아
// 이름 기준으로 중복 제거(첫 등장 값 유지)하고, 단위를 제거한 값만 남깁니다.
export interface LabEntry {
  name: string;
  value: string; // 화살표(▲▼) 포함, 단위 제외
  date: string;
}

function stripUnit(resultRaw: string): string {
  const m = resultRaw.match(/^\s*(▲|▼)?\s*(-?\d+(?:\.\d+)?)/);
  if (m) return `${m[1] || ""}${m[2]}`;
  return resultRaw.trim();
}

export function extractLabEntries(text: string): LabEntry[] {
  const lines = text.split("\n");
  const seen = new Map<string, LabEntry>();
  const order: string[] = [];
  const re = /^(\d{4}-\d{2}-\d{2})(?:\s+\d{2}:\d{2})?\s+(.+?):(.*)$/;
  for (const line of lines) {
    const m = line.match(re);
    if (!m) continue;
    const name = m[2].trim();
    if (!name || /^-+$/.test(name)) continue;
    if (!seen.has(name)) {
      seen.set(name, { name, value: stripUnit(m[3]), date: m[1] });
      order.push(name);
    }
  }
  return order.map((n) => seen.get(n)!);
}

// CI: 로 시작하는 영상판독 소견 구간 추출 (환자번호/판독의 등 메타정보는 자동 제외됨)
function extractByCI(text: string): string | null {
  const ciIdx = text.indexOf("CI:");
  if (ciIdx === -1) return null;
  const after = text.slice(ciIdx);
  const endMatch = after.match(/\n-{2,}\s*\n/);
  let section = endMatch ? after.slice(0, endMatch.index) : after;
  const tableIdx = section.indexOf("【검사일시】");
  if (tableIdx !== -1) section = section.slice(0, tableIdx);
  return section.trim();
}

// "Compared with/to ..." 로 시작하는 추적관찰 판독문 추출 (기존 서식)
function extractByCompare(lines: string[]): string | null {
  let compareIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim().toLowerCase();
    if (t.startsWith("compared with") || t.startsWith("compared to") || t.includes("ompared")) {
      compareIndex = i;
      break;
    }
  }
  if (compareIndex === -1) return null;
  const out: string[] = [lines[compareIndex].trim()];
  for (let i = compareIndex + 1; i < lines.length; i++) {
    const raw = lines[i];
    const t = raw.trim();
    if (!t) continue;
    if (/^us\s*-\s*$/i.test(t)) continue;
    if (t.toLowerCase().startsWith("clinical information")) continue;
    if (/^-{2,}$/.test(t)) break;
    if (/^【검사일시】/.test(t)) break;
    out.push(t);
  }
  return out.join("\n");
}

function isThyroidUS(text: string) {
  return text.includes("Thyroid Ultrasonography");
}
function isCT(text: string) {
  return text.includes("Neck CT") || /【검사명】.*CT/i.test(text) || text.includes("CI:");
}
function isANA(text: string) {
  return text.includes("ANA Titer") || text.includes("ANA titer 결과");
}

function extractANA(text: string): string | null {
  const lines = text.split("\n");
  const date = extractExamDate(text);
  for (const line of lines) {
    if (line.includes("ANA titer 결과")) {
      const idx = line.indexOf(":");
      const result = idx !== -1 ? line.slice(idx + 1).trim() : line.trim();
      return `* ANA ${dateTag(date)} : ${result}`;
    }
  }
  return null;
}

export function formatChartReview(raw: string): string {
  const text = cleanCRLF(raw);
  const lines = text.split("\n");
  const examDate = extractExamDate(text);
  const sections: string[] = [];

  if (isThyroidUS(text)) {
    const compared = extractByCompare(lines);
    const ci = compared ? null : extractByCI(text);
    const body = compared || ci;
    if (body) sections.push(`* Thyroid US ${dateTag(examDate)}\n${body}`.trim());
  } else if (isCT(text)) {
    const compared = extractByCompare(lines);
    const ci = compared ? null : extractByCI(text);
    const body = compared || ci;
    if (body) sections.push(`* HN CT CE ${dateTag(examDate)}\n${body}`.trim());
  }

  if (isANA(text)) {
    const ana = extractANA(text);
    if (ana) sections.push(ana);
  }

  const labs = extractLabEntries(text);
  if (labs.length) {
    const labDate = labs[0].date;
    const labLines = labs.map((l) => `${l.name} : ${l.value}`);
    sections.push(`[Lab] ${dateTag(labDate)}\n${labLines.join("\n")}`.trim());
  }

  if (sections.length === 0) {
    // 아무 패턴도 못 찾았으면, 최소한 메타정보 라인과 빈 줄만 정리해서 반환
    const cleaned = lines
      .filter((l) => {
        const t = l.trim();
        if (!t) return false;
        if (/^【(환자번호|환자명|구분|처방일|접수일|보고일|판독의\d?|확인의)】/.test(t)) return false;
        if (/^=+$/.test(t)) return false;
        if (/^\*+.*\*+$/.test(t)) return false;
        return true;
      })
      .join("\n");
    return cleaned || "(인식 가능한 결과가 없습니다. Neck CT/Thyroid US/ANA/혈액검사 결과를 그대로 붙여넣어 주세요.)";
  }

  return sections.join("\n\n");
}
