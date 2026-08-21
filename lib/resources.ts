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
  // 예시 (실제 파일을 public/resources/ 에 넣은 뒤 주석을 해제하고 파일명을 맞춰주세요):
  // { title: "이비인후과 인계장", filename: "handover.pdf", type: "pdf", category: "인계장" },
  // { title: "편도절제술 설명 슬라이드 1", filename: "tonsillectomy-1.png", type: "image", category: "수술 설명" },
  // { title: "편도절제술 설명 슬라이드 2", filename: "tonsillectomy-2.png", type: "image", category: "수술 설명" },
];
