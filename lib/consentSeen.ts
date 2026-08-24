// 실험실 > 수술동의서 양식의 댓글을 사용자가 마지막으로 확인한 시점(개수)을 기기별로 기억합니다.
// 서버에 저장하지 않는 가벼운 "안 읽음" 표시용이라, 로그아웃하거나 다른 기기로 접속하면 다시 표시될 수 있습니다.
const KEY_PREFIX = "entcall_consent_seen_";

function getSeenCounts(userId: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + userId);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function markProcedureSeen(userId: string, procedureId: string, count: number) {
  try {
    const seen = getSeenCounts(userId);
    seen[procedureId] = count;
    localStorage.setItem(KEY_PREFIX + userId, JSON.stringify(seen));
  } catch {}
}

export function isProcedureUnread(userId: string, procedureId: string, count: number): boolean {
  const seen = getSeenCounts(userId);
  return count > (seen[procedureId] ?? 0);
}

export function hasAnyUnread(userId: string, counts: Record<string, number>): boolean {
  const seen = getSeenCounts(userId);
  return Object.entries(counts).some(([id, count]) => count > (seen[id] ?? 0));
}
