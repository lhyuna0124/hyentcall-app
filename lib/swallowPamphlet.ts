// --- 맞춤형 연하 재활 훈련 팜플렛 생성기 (실험실) ---
// 수술 정보를 입력하면 수술 전 연하재활 운동 중 해당 환자에게 맞는 항목을 자동으로 추천합니다.
// 이 파일은 순수 로직만 담당하고, 아이콘/이미지/렌더링은 app/tools/lab/page.tsx에서 처리합니다.

export type PrimarySite = "tongue" | "fom" | "tonsil" | "bot" | "soft_palate" | "larynx" | "hypopharynx";

export const PRIMARY_SITE_OPTIONS: { v: PrimarySite; label: string; group: string }[] = [
  { v: "tongue", label: "설암 (Tongue cancer)", group: "구강암" },
  { v: "fom", label: "구강저암 (FOM cancer)", group: "구강암" },
  { v: "tonsil", label: "편도암 (Tonsil cancer)", group: "구인두암" },
  { v: "bot", label: "설근부암 (BOT cancer)", group: "구인두암" },
  { v: "soft_palate", label: "연구개암 (Soft palate cancer)", group: "구인두암" },
  { v: "larynx", label: "후두암 (Larynx cancer)", group: "후두암" },
  { v: "hypopharynx", label: "하인두암 (Hypopharynx cancer)", group: "하인두암" },
];

export const SURGERY_OPTIONS: Record<PrimarySite, { v: string; label: string }[]> = {
  tongue: [
    { v: "partial_glossectomy", label: "Partial glossectomy" },
    { v: "hemiglossectomy", label: "Hemiglossectomy" },
    { v: "subtotal_glossectomy", label: "Subtotal glossectomy" },
  ],
  fom: [{ v: "wide_excision_fom", label: "Wide excision of FOM" }],
  tonsil: [{ v: "wide_excision_tonsil", label: "Wide excision of tonsil cancer" }],
  bot: [{ v: "wide_excision_bot", label: "Wide excision of BOT cancer" }],
  soft_palate: [{ v: "wide_excision_soft_palate", label: "Wide excision of soft palate" }],
  larynx: [
    { v: "partial_laryngectomy", label: "Partial laryngectomy" },
    { v: "total_laryngectomy", label: "Total laryngectomy" },
  ],
  hypopharynx: [
    { v: "partial_pharyngectomy", label: "Partial pharyngectomy" },
    { v: "total_laryngopharyngectomy", label: "Total laryngopharyngectomy" },
  ],
};

// Partial laryngectomy 선택 시에만 추가로 선택하는 세부 술식 (표시용, 현재 추천 로직에는 영향 없음)
export const PARTIAL_LARYNGECTOMY_TECHNIQUES: { v: string; label: string }[] = [
  { v: "SPL", label: "SPL" },
  { v: "SCPL", label: "SCPL" },
  { v: "SGL", label: "SGL" },
];

// 수술접근법: 원발 부위별로 선택지가 다르며, 없는 부위는 필드 자체가 표시되지 않습니다.
export const APPROACH_OPTIONS: Partial<Record<PrimarySite, { v: string; label: string }[]>> = {
  tongue: [
    { v: "transoral", label: "Via transoral" },
    { v: "pull_through", label: "Pull-through" },
  ],
  fom: [
    { v: "none", label: "-" },
    { v: "mandibulotomy", label: "Mandibulotomy" },
    { v: "mandibulectomy", label: "Mandibulectomy" },
  ],
  tonsil: [
    { v: "none", label: "-" },
    { v: "mandibulotomy", label: "Mandibulotomy" },
    { v: "mandibulectomy", label: "Mandibulectomy" },
    { v: "tors", label: "Via TORS" },
  ],
  bot: [
    { v: "none", label: "-" },
    { v: "mandibulotomy", label: "Mandibulotomy" },
    { v: "mandibulectomy", label: "Mandibulectomy" },
    { v: "tors", label: "Via TORS" },
  ],
  soft_palate: [
    { v: "none", label: "-" },
    { v: "mandibulotomy", label: "Mandibulotomy" },
    { v: "mandibulectomy", label: "Mandibulectomy" },
    { v: "tors", label: "Via TORS" },
  ],
};

function hasMandibularApproach(approach?: string) {
  return approach === "mandibulotomy" || approach === "mandibulectomy";
}

export type DietStatus = "normal" | "mild_dysphagia" | "aspiration_dysphagia" | "ltube" | "peg";
export const DIET_STATUS_OPTIONS: { v: DietStatus; label: string }[] = [
  { v: "normal", label: "정상식이 가능" },
  { v: "mild_dysphagia", label: "통증 등 경미한 연하장애" },
  { v: "aspiration_dysphagia", label: "흡인을 동반한 연하장애" },
  { v: "ltube", label: "L-tube feeding" },
  { v: "peg", label: "PEG status" },
];

export interface PamphletInput {
  site: PrimarySite;
  surgery: string;
  partialLarynxTechnique?: string; // surgery === "partial_laryngectomy" 일 때만 사용
  approach?: string; // APPROACH_OPTIONS[site]가 있을 때만 사용
  ccrt: boolean;
  trismus: boolean;
  neckDissection: boolean;
  neckDissectionSide?: "unilateral" | "bilateral"; // neckDissection === true 일 때만 사용
  freeFlap: boolean;
  diet: DietStatus;
}

function firstApproach(site: PrimarySite) {
  return APPROACH_OPTIONS[site]?.[0]?.v;
}

export const DEFAULT_PAMPHLET_INPUT: PamphletInput = {
  site: "tongue",
  surgery: SURGERY_OPTIONS.tongue[0].v,
  partialLarynxTechnique: undefined,
  approach: firstApproach("tongue"),
  ccrt: false,
  trismus: false,
  neckDissection: false,
  neckDissectionSide: undefined,
  freeFlap: false,
  diet: "normal",
};

export interface PamphletExercise {
  id: string;
  icon: string;
  title: string;
  locked: boolean;
  autoRecommended: boolean;
  hardExcluded: boolean;
  excludeReason?: string;
  detail: string[];
  note?: string;
}

export interface PamphletResult {
  exercises: PamphletExercise[];
  warning?: string;
}

function swallowWord(diet: DietStatus) {
  return diet === "aspiration_dysphagia" || diet === "ltube" || diet === "peg" ? "마른 침" : "물 한 모금";
}

export function buildPamphlet(input: PamphletInput): PamphletResult {
  const { site, surgery, trismus, ccrt, neckDissection, neckDissectionSide, approach, freeFlap, diet } = input;
  const water = swallowWord(diet);
  const hasMandibular = hasMandibularApproach(approach);

  // 그룹 분류 (기존 로직과의 대응 관계를 유지하기 위한 내부 그룹핑)
  const isTongue = site === "tongue";
  const isTonsilOrBot = site === "tonsil" || site === "bot";
  const isLarynxPartial = site === "larynx" && surgery === "partial_laryngectomy";
  const isLarynxTotal = site === "larynx" && surgery === "total_laryngectomy";
  const isHypoPartial = site === "hypopharynx" && surgery === "partial_pharyngectomy";
  const isHypoTotal = site === "hypopharynx" && surgery === "total_laryngopharyngectomy";
  const isAirwayRemoved = isLarynxTotal || isHypoTotal;

  const exercises: PamphletExercise[] = [];

  // 1. 구강 위생 관리 (공통 필수)
  exercises.push({
    id: "oral_hygiene",
    icon: "sparkles",
    title: "구강 위생 관리",
    locked: true,
    autoRecommended: true,
    hardExcluded: false,
    detail: [
      "부드러운 수술 후 전용 칫솔로 하루 3회 이상 꼼꼼히 양치해 주세요.",
      "입안 세균이 기도로 넘어가면 폐렴을 유발할 수 있어, 수술 후 폐렴 예방을 위해 양치와 가글이 매우 중요합니다.",
    ],
  });

  // 2. 목 근육 스트레칭 (공통 필수)
  const neckCaution =
    (neckDissection && neckDissectionSide === "bilateral") || (neckDissection && ccrt)
      ? "어깨와 목 근육을 과도하게 꺾지 말고, 통증이 없는 부드러운 범위 내에서만 하세요."
      : undefined;
  exercises.push({
    id: "neck_stretch",
    icon: "rotate",
    title: "목 근육 스트레칭",
    locked: true,
    autoRecommended: true,
    hardExcluded: false,
    detail: [
      "숙이기: 고개를 앞으로 천천히 숙여 10초 유지합니다.",
      "젖히기: 고개를 뒤로 천천히 젖혀 10초 유지합니다.",
      "돌리기: 고개를 오른쪽으로 끝까지 돌려 10초, 왼쪽도 10초 유지합니다.",
      "기울이기: 귀가 어깨에 닿는 느낌으로 오른쪽 10초, 왼쪽도 10초 유지합니다.",
    ],
    note: neckCaution,
  });

  // 3. 턱 당기기 저항 운동 (CTAR)
  const ctarRecommended = isLarynxPartial || isTonsilOrBot;
  exercises.push({
    id: "ctar",
    icon: "ctar",
    title: "턱 당기기 저항 운동 (CTAR)",
    locked: false,
    autoRecommended: ctarRecommended,
    hardExcluded: false,
    detail: [
      "말랑한 공(테니스공 크기)이나 돌돌 만 수건을 턱 아래에 끼웁니다.",
      "① 지그시 누르고 버티기: 턱으로 공을 가슴 쪽으로 지그시 눌러 10초 버틴 후 힘을 뺍니다. (10회)",
      "② 빠르게 눌렀다 떼기: 턱으로 공을 꾹 눌렀다가 바로 힘을 빼는 동작을 연속 10회 반복합니다.",
    ],
  });

  // 4. 힘껏 삼키기 (노력성 연하)
  const effortfulRecommended = isTongue || isLarynxPartial || isLarynxTotal || isTonsilOrBot;
  exercises.push({
    id: "effortful_swallow",
    icon: "zap",
    title: "힘껏 삼키기 (노력성 연하)",
    locked: false,
    autoRecommended: effortfulRecommended,
    hardExcluded: false,
    detail: [
      `${water}을 아주 조금 입에 머금습니다.`,
      "목과 혀 근육을 쥐어짜듯, 평소보다 2~3배 강한 힘으로 '꿀꺽' 소리가 나게 세게 삼킵니다.",
      "한 번에 5회씩, 하루에 자주 반복해 주세요.",
    ],
  });

  // 5. 삼킴 근육 강화 운동 (멘델슨 + 마사코) - 두 하위 기법을 독립적으로 안전 필터링
  const mendelsohnApplicable = isLarynxPartial;
  const masakoApplicable = isTongue || isTonsilOrBot || isHypoPartial;
  const mendelsohnShown = mendelsohnApplicable; // Total 계열은 애초에 isLarynxPartial이 아니므로 자동으로 제외됨
  const masakoShown = masakoApplicable && !trismus;
  const strengthenBase = mendelsohnApplicable || masakoApplicable;
  const strengthenDetail: string[] = [];
  if (mendelsohnShown) {
    strengthenDetail.push(
      "멘델슨 운동 (목젖 올리고 버티기, 5회): 목 앞부분에 손가락을 가볍게 대고 침을 삼켜 목젖이 가장 높이 올라간 순간, 3~5초간 꽉 유지했다가 힘을 뺍니다."
    );
  }
  if (masakoShown) {
    strengthenDetail.push(
      `마사코 운동 (혀 살짝 물고 삼키기, 10회): 혀끝을 앞니 사이에 살짝 문 상태로, 혀가 안으로 빨려 들어가지 않게 유지하며 ${water}을 '꿀꺽' 삼킵니다.`
    );
  }
  exercises.push({
    id: "swallow_strength",
    icon: "dumbbell",
    title: "삼킴 근육 강화 운동",
    locked: false,
    autoRecommended: strengthenBase && (mendelsohnShown || masakoShown),
    hardExcluded: strengthenBase && !mendelsohnShown && !masakoShown,
    excludeReason: strengthenBase && !mendelsohnShown && !masakoShown ? "이 환자군에는 멘델슨·마사코 기법 모두 해당되지 않아 기본 제외되었습니다." : undefined,
    detail: strengthenDetail.length ? strengthenDetail : ["(선택하신 조건에서는 표시할 하위 운동이 없습니다. 담당의 판단에 따라 직접 구성해 주세요.)"],
  });

  // 6. 혀 스트레칭 및 강화 운동 (Trismus 시 입 안 대체 운동으로 전환)
  const tongueDetail = trismus
    ? [
        "입을 다문 상태에서 혀를 양쪽 볼 안쪽 · 입천장 · 앞니 안쪽(위/아래/좌/우) 방향으로 강하게 밀어냅니다.",
        "밀어낼 때마다 5초간 꽉 힘을 준 후 힘을 뺍니다.",
      ]
    : ["혀를 입 밖으로 턱을 향해 길게 내밀어 10초간 버팁니다.", "좌우 입꼬리 쪽으로도 최대한 뻗어 움직여 줍니다."];
  exercises.push({
    id: "tongue_stretch",
    icon: "tongue",
    title: "혀 스트레칭 및 강화 운동",
    locked: false,
    autoRecommended: isTongue,
    hardExcluded: false,
    detail: tongueDetail,
    note: trismus ? "입을 벌리기 어려워 입 안에서 하는 대체 운동으로 안내됩니다." : undefined,
  });

  // 7. 입 벌리기 연습 (수술접근법이 mandibulotomy/mandibulectomy면 무조건 추가, Trismus 시 기본 제외)
  exercises.push({
    id: "jaw_stretch",
    icon: "jaw",
    title: "입 벌리기 연습",
    locked: false,
    autoRecommended: hasMandibular,
    hardExcluded: trismus,
    excludeReason: trismus
      ? "이미 입이 잘 안 벌어지는 상태에서 도구를 이용한 개구 운동은 무리가 될 수 있어 기본 제외되었습니다. (혀 스트레칭의 입 안 대체 운동을 참고하세요)"
      : undefined,
    detail: ["입을 최대한 크게 벌리고 10초간 유지합니다.", "필요하면 설압자를 어금니 사이에 물고 버티는 것도 좋습니다."],
  });

  // 8. 성문 상부 연하법 (기도 보호 삼킴법) - Total laryngectomy / Total laryngopharyngectomy는 구조적으로 해당 없음
  exercises.push({
    id: "supraglottic_swallow",
    icon: "shield",
    title: "성문 상부 연하법 (기도 보호 삼킴법)",
    locked: false,
    autoRecommended: !isAirwayRemoved,
    hardExcluded: isAirwayRemoved,
    excludeReason: isAirwayRemoved
      ? "이 수술은 기도와 식도가 완전히 분리되어 사레(흡인)가 구조적으로 발생하지 않으므로, 기도 보호 삼킴법은 해당되지 않아 기본 제외되었습니다."
      : undefined,
    detail: [
      "① 숨 참기: 숨을 깊게 들이마신 후 '읍!' 하고 숨을 참아 목구멍을 꽉 닫습니다.",
      `② 삼키기: 숨을 참은 채로 ${water}을 '꿀꺽' 삼킵니다.`,
      "③ 기침하기: 삼킨 직후 숨을 들이마시지 말고 바로 '큼!' 하고 강하게 기침합니다.",
      "④ 다시 삼키기: 다시 한번 꿀꺽 삼킨 후 편안히 숨을 쉽니다.",
    ],
  });

  const warning =
    hasMandibular || freeFlap
      ? "수술 직후 뼈 유합과 이식 피판 안정을 위해, 의료진 허락 전까지 입을 크게 벌리거나 혀·턱을 세게 움직이는 연습을 절대 하지 마세요."
      : undefined;

  return { exercises, warning };
}
