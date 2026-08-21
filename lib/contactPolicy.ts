import { RiskLevel } from "./triage";

export interface ContactSuggestion {
  method: string;
  detail: string;
}

// 위험도(진단명 기반) + 새벽 여부 + 해당 전공의의 "이 진단에 대한" 역량 점수(1~5, 평가 없으면 null)를
// 함께 반영해 권장 노티 방식을 산출합니다.
// competency 가 null이면 아직 평가 기록이 없는 것으로 보고 보수적으로(=역량 낮음과 동일하게) 취급합니다.
export function suggestContact(
  risk: RiskLevel,
  competency: number | null,
  hour = new Date().getHours()
): ContactSuggestion {
  const isLateNight = hour >= 0 && hour < 6;
  const comp = competency ?? 2; // 평가 기록 없으면 보수적으로 낮은 역량(2)으로 취급

  // 고위험 질환은 역량 점수와 무관하게 항상 즉시 전화가 원칙입니다 (환자 안전 최우선).
  if (risk === "HIGH") {
    return {
      method: "즉시 전화 노티 (필수, 역량 무관)",
      detail: isLateNight
        ? "새벽 시간이라도 전화로 즉시 노티하세요. 3분 내 미응답 시 5분 간격으로 재발신, 2회 실패 시 차상급자(치프/당직 교수)에게 연락하세요. 카카오톡은 백업 기록용으로만 병행하고 전화 없이 대체하지 마세요."
        : "전화로 즉시 노티하세요. 미응답 시 5분 간격 재발신, 2회 실패 시 차상급자에게 연락하세요.",
    };
  }

  if (risk === "MEDIUM") {
    if (comp <= 2) {
      return {
        method: "전화 노티 (필수)",
        detail: `해당 질환에 대한 이 전공의의 역량 평가가 낮거나 아직 없어(${competency ?? "미평가"}점), 시간대와 무관하게 전화로 확인하며 진행 상황을 함께 점검하는 것을 권장합니다.`,
      };
    }
    if (comp === 3) {
      return {
        method: isLateNight ? "카카오톡 선노티 + 전화 확인" : "전화 노티 권장",
        detail: isLateNight
          ? "역량이 중간 수준(3점)이므로, 새벽엔 정리된 노티장을 먼저 카톡으로 보내고 10~15분 내 회신이 없으면 전화로 전환하세요."
          : "역량이 중간 수준이므로 주간엔 전화로 노티하되, 안정적으로 진행되고 있다면 다음부터는 카톡 선노티도 고려할 수 있습니다.",
      };
    }
    return {
      method: isLateNight ? "카카오톡 노티 후 회신 대기" : "카카오톡 또는 전화 (선택)",
      detail: `해당 질환에 대한 역량 평가가 높은 편(${comp}점)이라, 새벽에는 정리된 노티장을 카톡으로 보내고 15~20분 내 회신이 없을 때만 전화하는 방식도 무방합니다.`,
    };
  }

  // LOW risk
  if (comp <= 2) {
    return {
      method: "카카오톡 노티 + 전화 확인",
      detail: `역량 평가가 낮거나 없는 상태(${competency ?? "미평가"}점)이므로, 낮은 위험도라도 카톡 노티 후 15분 내 회신이 없으면 전화로 한 번 확인하는 것을 권장합니다.`,
    };
  }
  if (comp === 3) {
    return {
      method: "카카오톡 노티 후 회신 대기",
      detail: "정리된 노티장을 카톡으로 전달하고 30분 내 회신이 없을 때만 전화 1회로 확인하세요.",
    };
  }
  return {
    method: "카카오톡 노티 (통상 진행 가능)",
    detail: `해당 질환에 대한 역량 평가가 높아(${comp}점), 카톡으로 노티만 남기고 통상적인 절차대로 진행 후 사후 보고로도 충분합니다. 다만 예상과 다른 소견이 새로 확인되면 위험도와 무관하게 즉시 전화하세요.`,
  };
}
