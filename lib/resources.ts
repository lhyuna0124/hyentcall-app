// 인계장(PDF), 수술 설명용 이미지 등 자료실 목록입니다.
// 실제 파일은 public/resources/ 폴더 안에 넣고, 아래 목록에 항목을 추가하세요.
// 파일을 public/resources/handover.pdf 로 넣었다면 filename은 "handover.pdf" 로 적으면 됩니다.
// (public 폴더 안의 파일은 배포 후 https://내주소/resources/파일명 으로 누구나 바로 접근 가능합니다.)

export type ResourceType = "pdf" | "image";

export interface ResourceItem {
  title: string;
  filename: string; // public/resources/ 기준 파일명
  type: ResourceType;
  description?: string;
  category?: string; // 예: "인계장", "수술 설명"
}

export const RESOURCES: ResourceItem[] = [
  { title: "Thyroidectomy 수술 동의서 설명", filename: "thyroidectomy-consent.pdf", type: "pdf", category: "수술 동의서 설명" },
  { title: "Parotidectomy 수술 동의서 설명", filename: "parotidectomy-consent.pdf", type: "pdf", category: "수술 동의서 설명" },
  { title: "수술방 업무 매뉴얼", filename: "or-manual.pdf", type: "pdf", category: "업무 매뉴얼" },
];
