import { RiskLevel } from "./triage";

export interface ContactSuggestion {
  method: string;
  detail: string;
}

// 새벽(00~06시) 여부와 위험도에 따라 권장 연락 방식을 제안합니다.
// 병원/과 내부 정책에 맞게 자유롭게 조정하세요.
export function suggestContact(risk: RiskLevel, hour = new Date().getHours()): ContactSuggestion {
  const isLateNight = hour >= 0 && hour < 6;

  if (risk === "HIGH") {
    return {
      method: "즉시 전화 노티 (필수)",
      detail: isLateNight
        ? "새벽 시간이라도 전화로 즉시 노티하세요. 3분 내 미응답 시 5분 간격으로 재발신, 2회 실패 시 차상급자(치프/당직 교수)에게 연락하세요. 카카오톡은 전화 시도와 동시에 백업으로 남기되, 전화 없이 카톡만으로 대체하지 마세요."
        : "전화로 즉시 노티하세요. 미응답 시 5분 간격 재발신, 2회 실패 시 차상급자에게 연락하세요.",
    };
  }
  if (risk === "MEDIUM") {
    return {
      method: isLateNight ? "카카오톡 선노티 + 전화 확인" : "전화 노티 권장",
      detail: isLateNight
        ? "새벽에는 정리된 노티장을 먼저 카카오톡으로 보내고, 10~15분 내 확인이 없으면 전화로 재확인하세요. 위급 소견이 추가되면 즉시 전화로 전환하세요."
        : "전화로 노티하되, 응급도가 낮아지는 추세라면 정리된 카톡 노티 후 회신을 기다려도 무방합니다.",
    };
  }
  return {
    method: "카카오톡 노티 후 회신 대기",
    detail: "정리된 노티장을 카톡으로 전달하고 회신을 기다리세요. 30분 내 회신이 없으면 1회 전화로 확인하세요. 담당 전공의의 최근 역량 평가가 높다면 통상적인 입원 진행 후 사후 보고도 가능합니다.",
  };
}
