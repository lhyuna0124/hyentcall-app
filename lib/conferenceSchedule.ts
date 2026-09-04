import { ConferenceEntry, ConferenceSite } from "./types";

// 실험실이 아닌 정식 기능입니다. 관리자 화면에서 수정한 내용은 KV에 저장되며,
// 이 값은 최초 1회 기본값으로만 쓰입니다 (/api/conference-schedule 참고).
function entry(
  id: string,
  month: string,
  date: string,
  category: string,
  topic: string,
  topicAssignee = "",
  journalAssignee = "",
  site: ConferenceSite = "공통"
): ConferenceEntry {
  return { id, month, date, category, topic, topicAssignee, topicPresenterName: "", journalAssignee, journalPresenterName: "", site };
}

export const DEFAULT_CONFERENCE_ENTRIES: ConferenceEntry[] = [
  entry("conf-1", "9월", "9월 7일", "이과", "만성중이염의 수술 및 ossiculoplasty", "R3/4"),
  entry("conf-2", "9월", "9월 14일", "비과", "External apporach of sinus surgery", "R3/4"),
  entry("conf-3", "9월", "9월 21일", "두경부", "부인두강 종양", "R2"),
  entry("conf-4", "9월", "9월 28일", "Staff lecture", "후두암 수술", "태경"),
  entry("conf-5", "9월", "10월 2일", "전공의 7차시험", "Topic 평가"),
  entry("conf-6", "9월", "", "휴일", "추석 9월 24~27일"),

  entry("conf-7", "10월", "10월 6일", "이과", "전정기능검사 I", "R2/3"),
  entry("conf-8", "10월", "10월 12일", "비과", "OSAS, 수면다원검사", "R2/3"),
  entry("conf-9", "10월", "10월 19일", "두경부", "비인두종양", "R1"),
  entry("conf-10", "10월", "10월 26일", "Staff lecture", "보청기", "한상윤"),
  entry("conf-11", "10월", "10월 30일", "전공의 8차 시험", "Topic 평가"),
  entry("conf-12", "10월", "", "학회", "추계 학회 - 10월 21~23일 (부산)"),

  entry("conf-13", "11월", "11월 2일", "이과", "전정기능검사 II (rotatory chair, posturography, VEMP)", "R2/3"),
  entry("conf-14", "11월", "11월 9일", "비과", "알레르기비염의 진단및 치료", "R1"),
  entry("conf-15", "11월", "11월 16일", "두경부", "경부절제술", "R2/3"),
  entry("conf-16", "11월", "11월 23일", "Staff lecture", "비용종 환자의 치료 : 스테로이드, 생물학적 제제 및 수술", "정선민"),
  entry("conf-17", "11월", "11월 27일", "전공의 9차 시험", "Topic 평가"),

  entry("conf-18", "12월", "12월 7일", "이과", "말초 전정질환과 치료, 전정재활", "R2/3"),
  entry("conf-19", "12월", "12월 14일", "비과", "비알레르기 비염과 감염", "R1"),
  entry("conf-20", "12월", "12월 21일", "두경부", "구강, 구인두의 양성/악성종양", "R2/3"),
  entry("conf-21", "12월", "12월 28일", "Staff lecture", "Office based Laryngeal Procedures", "송창면"),
  entry("conf-22", "12월", "12월 31일", "전공의 10차 시험", "Topic 평가"),
];
