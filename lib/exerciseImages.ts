// 연하 재활 운동 사진 매핑입니다. lib/swallowPamphlet.ts의 운동 id에 대응하는 이미지 파일명을 적으면
// 팜플렛 미리보기/인쇄에서 아이콘 대신 실제 사진이 표시됩니다.
//
// 사용법:
// 1. public/exercise-images/ 폴더 안에 사진 파일을 넣습니다 (예: public/exercise-images/ctar.jpg).
// 2. 아래 EXERCISE_IMAGES에 { 운동id: "파일명" } 형태로 한 줄 추가합니다.
// 3. GitHub에 커밋하면 Vercel이 자동으로 재배포합니다.
//
// 운동 id 목록 (lib/swallowPamphlet.ts 참고):
//   oral_hygiene, neck_stretch, ctar, effortful_swallow, swallow_strength, tongue_stretch, jaw_stretch, supraglottic_swallow
export const EXERCISE_IMAGES: Partial<Record<string, string>> = {
  // ctar: "ctar.jpg",
  // effortful_swallow: "effortful-swallow.jpg",
  // swallow_strength: "swallow-strength.jpg",
  // tongue_stretch: "tongue-stretch.jpg",
  // jaw_stretch: "jaw-stretch.jpg",
  // supraglottic_swallow: "supraglottic-swallow.jpg",
};
