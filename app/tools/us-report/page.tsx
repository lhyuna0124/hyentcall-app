"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { US_DICT } from "@/lib/usReportDict";

function getFormattedDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

function buildOutput(text: string) {
  const capitalized = text.replace(/(\d+\.\s*)([a-z])/g, (_m, p1, p2) => p1 + p2.toUpperCase());
  const header = `* Neck / Thyroid US [OL] <${getFormattedDate()}>\n`;
  return capitalized.trim() ? header + "\n" + capitalized : header;
}

function FreeformTab() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [output, setOutput] = useState(buildOutput(""));
  const [suggestions, setSuggestions] = useState<string[]>([]);

  function updateOutput() {
    if (!inputRef.current) return;
    setOutput(buildOutput(inputRef.current.value));
  }

  function handleInput() {
    const el = inputRef.current;
    if (!el) return;
    const cursorPos = el.selectionStart;
    const before = el.value.slice(0, cursorPos);
    const match = before.match(/(\S+)$/);
    const word = match ? match[0] : "";
    if (!word) {
      setSuggestions([]);
    } else {
      setSuggestions(Object.keys(US_DICT).filter((k) => k.startsWith(word)).slice(0, 5));
    }
    updateOutput();
  }

  function insertWord(key: string) {
    const el = inputRef.current;
    if (!el) return;
    let template = US_DICT[key];
    const cursorMarker = template.indexOf("{{cursor}}");
    template = template.replace("{{cursor}}", "");

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const matchBefore = text.slice(0, start).match(/(\S+)$/);
    const wordStart = matchBefore ? start - matchBefore[0].length : start;
    const before = text.slice(0, wordStart);
    const after = text.slice(end);

    el.value = before + template + after;
    const newPos = cursorMarker !== -1 ? before.length + cursorMarker : (before + template).length;
    el.setSelectionRange(newPos, newPos);
    el.focus();
    setSuggestions([]);
    updateOutput();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const el = inputRef.current;
    if (!el) return;
    if (e.key === "Tab" && suggestions.length > 0) {
      e.preventDefault();
      insertWord(suggestions[0]);
      return;
    }
    if (e.key === " " || e.key === "Enter") {
      const pos = el.selectionStart;
      const text = el.value;
      const before = text.slice(0, pos);
      const after = text.slice(pos);
      const updatedBefore = before.replace(
        /size:\s*((\d+(\.\d+)?)(\s+\d+(\.\d+)?){2})(?!\s*cm)$/,
        (m) => {
          const nums = m.replace(/size:\s*/, "").trim().split(/\s+/);
          if (nums.length !== 3) return m;
          return "size: " + nums.join(" x ") + " cm";
        }
      );
      if (updatedBefore !== before) {
        const newText = updatedBefore + after;
        const diff = updatedBefore.length - before.length;
        setTimeout(() => {
          if (!inputRef.current) return;
          inputRef.current.value = newText;
          inputRef.current.setSelectionRange(pos + diff, pos + diff);
          updateOutput();
        }, 0);
      }
    }
  }

  useEffect(() => {
    updateOutput();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function copyOutput() {
    navigator.clipboard.writeText(output);
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="card space-y-2">
        <label className="label">입력 (단어 입력 후 Tab으로 자동완성)</label>
        <textarea
          ref={inputRef}
          className="input min-h-[320px] font-mono text-sm"
          onInput={handleInput}
          onKeyDown={handleKeyDown}
        />
        {suggestions.length > 0 && (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            {suggestions.map((s) => (
              <div
                key={s}
                onClick={() => insertWord(s)}
                className="px-3 py-1.5 text-sm hover:bg-brand-50 cursor-pointer border-b border-slate-100 last:border-0"
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card space-y-2">
        <div className="flex items-center justify-between">
          <label className="label mb-0">결과</label>
          <button className="btn-outline !px-3 !py-1 text-xs" onClick={copyOutput} type="button">
            복사
          </button>
        </div>
        <div className="input min-h-[320px] whitespace-pre-wrap font-mono text-sm bg-slate-50">{output}</div>
      </div>
    </div>
  );
}

const ECHO_OPTIONS = ["Hypoechoic", "Markedly hypoechoic", "Isoechoic", "Hyperechoic", "Heterogeneous", "Anechoic"];
const MARGIN_OPTIONS = ["Smooth", "Irregular", "Spiculated", "Lobulated"];

// Composition과 Echogenicity를 완전히 분리해서 선택합니다.
const COMPOSITION_OPTIONS = [
  { v: "solid", label: "Solid (거의 전부 solid)" },
  { v: "predominantly_solid", label: "Predominantly solid (mixed, solid 위주)" },
  { v: "predominantly_cystic", label: "Predominantly cystic (mixed, cystic 위주)" },
  { v: "spongiform", label: "Spongiform" },
  { v: "pure_cyst", label: "Pure cyst" },
] as const;
type CompositionValue = (typeof COMPOSITION_OPTIONS)[number]["v"];

type KtBranch = "benign" | "solid_hypo" | "solid_isohyper_or_partial";

// K-TIRADS flow chart의 composition + echogenicity 조합 판정 로직
function resolveBranch(
  composition: CompositionValue,
  echo: string,
  cometTail: boolean
): { branch: KtBranch; ambiguous: boolean } {
  if (composition === "spongiform" || composition === "pure_cyst") {
    return { branch: "benign", ambiguous: false };
  }
  if (composition === "predominantly_cystic") {
    if (cometTail) return { branch: "benign", ambiguous: false };
    return { branch: "solid_isohyper_or_partial", ambiguous: false };
  }
  // solid 또는 predominantly_solid
  if (echo === "Hypoechoic" || echo === "Markedly hypoechoic") {
    return { branch: "solid_hypo", ambiguous: false };
  }
  if (echo === "Isoechoic" || echo === "Hyperechoic") {
    return { branch: "solid_isohyper_or_partial", ambiguous: false };
  }
  // Heterogeneous / Anechoic 등 flow chart에 명시되지 않은 조합
  // -> 보수적으로 solid hypoechoic 경로(더 위험한 쪽)로 분류하되, 애매함을 표시해서 직접 확인하도록 함
  return { branch: "solid_hypo", ambiguous: true };
}

const ECHOGENIC_FOCI_OPTIONS = [
  "Punctate echogenic foci",
  "Macrocalcification",
  "Intracystic echogenic foci with comet-tail artifacts",
  "Rim calcification",
];

// K-TIRADS 3개 suspicious US feature (공식 기준)
const SUSPICIOUS_FEATURE_KEYS = ["microcalcification", "tallerThanWide", "spiculatedMargin"] as const;
type SuspiciousFeatureKey = (typeof SUSPICIOUS_FEATURE_KEYS)[number];
const SUSPICIOUS_FEATURE_LABEL: Record<SuspiciousFeatureKey, string> = {
  microcalcification: "Microcalcification",
  tallerThanWide: "Taller than wide",
  spiculatedMargin: "Spiculated / microlobulated margin",
};

const KT_OVERRIDE_OPTIONS = [
  { v: "auto", label: "자동 판정 사용" },
  { v: "kt2", label: "직접 지정: K-TIRADS 2" },
  { v: "kt3", label: "직접 지정: K-TIRADS 3" },
  { v: "kt4", label: "직접 지정: K-TIRADS 4" },
  { v: "kt5", label: "직접 지정: K-TIRADS 5" },
] as const;

// 공식 K-TIRADS flow chart 그대로 구현 (branch + suspicious feature 개수로 산출)
function calcKTIRADS(branch: KtBranch, suspiciousCount: number) {
  if (branch === "benign") {
    return { kt: "K-TIRADS 2 (benign)", rec: "No biopsy" };
  }
  if (branch === "solid_hypo") {
    return suspiciousCount > 0
      ? { kt: "K-TIRADS 5 (high suspicion)", rec: "Biopsy recommended if ≥ 1.0 cm" }
      : { kt: "K-TIRADS 4 (intermediate suspicion)", rec: "Biopsy recommended if ≥ 1.0 cm" };
  }
  // solid_isohyper_or_partial
  return suspiciousCount > 0
    ? { kt: "K-TIRADS 4 (intermediate suspicion)", rec: "Biopsy recommended if ≥ 1.0 cm" }
    : { kt: "K-TIRADS 3 (low suspicion)", rec: "Biopsy recommended if ≥ 1.5 cm" };
}

const GLAND_STATUS_OPTIONS = ["언급 안함", "Normal", "Mass"] as const;

function GlandSection({
  title,
  status,
  setStatus,
  side,
  setSide,
  desc,
  setDesc,
}: {
  title: string;
  status: (typeof GLAND_STATUS_OPTIONS)[number];
  setStatus: (v: (typeof GLAND_STATUS_OPTIONS)[number]) => void;
  side: string;
  setSide: (v: string) => void;
  desc: string;
  setDesc: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="label">{title}</label>
      <div className="flex gap-2">
        {GLAND_STATUS_OPTIONS.map((o) => (
          <button
            type="button"
            key={o}
            onClick={() => setStatus(o)}
            className={`chip border ${status === o ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}
          >
            {o}
          </button>
        ))}
      </div>
      {status === "Mass" && (
        <div className="grid grid-cols-3 gap-2">
          <select className="input" value={side} onChange={(e) => setSide(e.target.value)}>
            <option value="Rt">Rt</option>
            <option value="Lt">Lt</option>
            <option value="Both">Both</option>
          </select>
          <input className="input col-span-2" placeholder="소견 (예: 1.2cm hypoechoic mass)" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
      )}
    </div>
  );
}

function StructuredTab() {
  const [location, setLocation] = useState("Rt");
  const [sizeA, setSizeA] = useState("");
  const [sizeB, setSizeB] = useState("");
  const [sizeC, setSizeC] = useState("");
  const [composition, setComposition] = useState<CompositionValue>("solid");
  const [echo, setEcho] = useState(ECHO_OPTIONS[0]);
  const [margin, setMargin] = useState(MARGIN_OPTIONS[0]);
  const [cometTail, setCometTail] = useState(false);
  const [echogenicFoci, setEchogenicFoci] = useState<string[]>([]);
  const [suspicious, setSuspicious] = useState<Record<SuspiciousFeatureKey, boolean>>({
    microcalcification: false,
    tallerThanWide: false,
    spiculatedMargin: false,
  });
  const [ktOverride, setKtOverride] = useState<(typeof KT_OVERRIDE_OPTIONS)[number]["v"]>("auto");
  const [lnStatus, setLnStatus] = useState<"none" | "benign" | "suspicious">("none");

  // Parotid / SMG
  const [parotidStatus, setParotidStatus] = useState<(typeof GLAND_STATUS_OPTIONS)[number]>("언급 안함");
  const [parotidSide, setParotidSide] = useState("Rt");
  const [parotidDesc, setParotidDesc] = useState("");
  const [smgStatus, setSmgStatus] = useState<(typeof GLAND_STATUS_OPTIONS)[number]>("언급 안함");
  const [smgSide, setSmgSide] = useState("Rt");
  const [smgDesc, setSmgDesc] = useState("");

  // FNAC
  const [fnac, setFnac] = useState<"" | "-" | "+">("");
  const [fnacSite, setFnacSite] = useState("");

  const [output, setOutput] = useState("");

  const { branch, ambiguous } = resolveBranch(composition, echo, cometTail);
  const isBenignBranch = branch === "benign";

  function toggleEchogenicFocus(opt: string) {
    setEchogenicFoci((prev) => (prev.includes(opt) ? prev.filter((v) => v !== opt) : [...prev, opt]));
  }

  function generate() {
    const suspiciousCount = SUSPICIOUS_FEATURE_KEYS.filter((k) => suspicious[k]).length;

    if (!isBenignBranch && suspiciousCount === 0) {
      const ok = confirm(
        "Suspicious US feature(microcalcification / taller than wide / spiculated·microlobulated margin)가 하나도 선택되지 않았습니다.\n정말 없는 것이 맞습니까?"
      );
      if (!ok) return;
    }
    if (ambiguous) {
      const proceed = confirm(
        "선택하신 조합(Solid + Heterogeneous 등)은 K-TIRADS flow chart에 명시적으로 정의되어 있지 않아, 보수적으로 'Solid hypoechoic' 경로로 자동 분류했습니다.\n이대로 진행하시겠습니까? (다르게 판정하시려면 취소 후 아래 'K-TIRADS 직접 지정'을 이용하세요.)"
      );
      if (!proceed) return;
    }

    const auto = calcKTIRADS(branch, suspiciousCount);
    const ktLabelMap: Record<string, string> = {
      kt2: "K-TIRADS 2 (benign)",
      kt3: "K-TIRADS 3 (low suspicion)",
      kt4: "K-TIRADS 4 (intermediate suspicion)",
      kt5: "K-TIRADS 5 (high suspicion)",
    };
    const kt = ktOverride === "auto" ? auto.kt : ktLabelMap[ktOverride];
    const rec = ktOverride === "auto" ? auto.rec : "(수동 지정 - biopsy 기준은 담당의 판단에 따름)";

    const compositionLabel = COMPOSITION_OPTIONS.find((c) => c.v === composition)?.label ?? "";
    const size = sizeA && sizeB && sizeC ? `${sizeA} x ${sizeB} x ${sizeC} cm` : "";

    const lines: string[] = [];
    lines.push(`${location} thyroid nodule${size ? `, size: ${size}` : ""}`);
    lines.push(`- ${compositionLabel}, ${echo}${cometTail ? " with comet-tail artifact" : ""}, ${margin} margin`);

    if (echogenicFoci.length) {
      lines.push(`- ${echogenicFoci.join(", ")}`);
    }

    const suspiciousLabels = SUSPICIOUS_FEATURE_KEYS.filter((k) => suspicious[k]).map((k) => SUSPICIOUS_FEATURE_LABEL[k]);
    lines.push(`- Suspicious US features: ${suspiciousLabels.length ? suspiciousLabels.join(", ") : "none"}`);
    lines.push(`- ${kt}, rec) ${rec}`);
    if (ambiguous && ktOverride === "auto") {
      lines.push(`  (* Solid + Heterogeneous 등 flow chart에 명시되지 않은 조합으로 보수적 판정됨 - 필요시 직접 확인)`);
    }

    if (lnStatus === "benign") {
      lines.push("");
      lines.push("Enlarged lymph nodes in the neck level {{cursor}}");
      lines.push("- ovoid shape with preserved fatty hilum, no definite abnormal vascularity");
    } else if (lnStatus === "suspicious") {
      lines.push("");
      lines.push("Enlarged lymph nodes in neck level {{cursor}}");
      lines.push("- round to oval shape, fatty hilum not clearly identified, heterogeneous echogenicity");
    }

    if (parotidStatus !== "언급 안함") {
      lines.push("");
      if (parotidStatus === "Normal") {
        lines.push("Parotid gland: normal, no mass");
      } else {
        lines.push(`Parotid gland: ${parotidSide} mass${parotidDesc ? ` - ${parotidDesc}` : ""}`);
      }
    }
    if (smgStatus !== "언급 안함") {
      lines.push(smgStatus === "Normal" ? "SMG (submandibular gland): normal, no mass" : `SMG (submandibular gland): ${smgSide} mass${smgDesc ? ` - ${smgDesc}` : ""}`);
    }

    if (fnac) {
      lines.push("");
      lines.push(`US-guided FNAC (${fnac})${fnacSite ? ` from the ${fnacSite}` : ""}${fnac === "+" ? "\n- No immediate complication" : ""}`);
    }

    const header = `* Neck / Thyroid US [OL] <${getFormattedDate()}>\n\n`;
    setOutput(header + lines.join("\n"));
  }

  function copyOutput() {
    navigator.clipboard.writeText(output);
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="card space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">위치</label>
            <select className="input" value={location} onChange={(e) => setLocation(e.target.value)}>
              <option value="Rt">Rt</option>
              <option value="Lt">Lt</option>
              <option value="Both">Both</option>
              <option value="Isthmic">Isthmic</option>
            </select>
          </div>
          <div>
            <label className="label">크기 (cm)</label>
            <div className="flex gap-1">
              <input className="input" placeholder="A" value={sizeA} onChange={(e) => setSizeA(e.target.value)} />
              <input className="input" placeholder="B" value={sizeB} onChange={(e) => setSizeB(e.target.value)} />
              <input className="input" placeholder="C" value={sizeC} onChange={(e) => setSizeC(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Composition</label>
            <select className="input" value={composition} onChange={(e) => setComposition(e.target.value as CompositionValue)}>
              {COMPOSITION_OPTIONS.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Echogenicity</label>
            <select className="input" value={echo} onChange={(e) => setEcho(e.target.value)}>
              {ECHO_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>

        {composition === "predominantly_cystic" && (
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={cometTail} onChange={(e) => setCometTail(e.target.checked)} id="comet" />
            <label htmlFor="comet" className="text-sm text-slate-600">
              Intracystic comet-tail artifact 동반 (→ benign 경로로 분류됨)
            </label>
          </div>
        )}

        <div className={`text-xs rounded-lg px-3 py-2 ${ambiguous ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-slate-50 text-slate-500 border border-slate-200"}`}>
          현재 조합 판정 경로: {branch === "benign" ? "Benign (K-TIRADS 2)" : branch === "solid_hypo" ? "Solid hypoechoic" : "Partially cystic / Isohyperechoic"}
          {ambiguous && " — flow chart에 명시되지 않은 조합이라 보수적으로 분류했습니다. 확실치 않으면 아래 'K-TIRADS 직접 지정'을 사용하세요."}
        </div>

        <div>
          <label className="label">Margin (서술용)</label>
          <select className="input" value={margin} onChange={(e) => setMargin(e.target.value)}>
            {MARGIN_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Echogenic foci (복수 선택)</label>
          <div className="flex flex-wrap gap-2">
            {ECHOGENIC_FOCI_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt}
                onClick={() => toggleEchogenicFocus(opt)}
                className={`chip border ${echogenicFoci.includes(opt) ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <label className="label text-amber-700">Suspicious US features (K-TIRADS 산출 기준, 3개)</label>
          <div className="flex flex-col gap-1">
            {SUSPICIOUS_FEATURE_KEYS.map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={suspicious[k]}
                  onChange={(e) => setSuspicious((prev) => ({ ...prev, [k]: e.target.checked }))}
                />
                {SUSPICIOUS_FEATURE_LABEL[k]}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label">K-TIRADS 직접 지정 (자동 판정이 애매할 때)</label>
          <select className="input" value={ktOverride} onChange={(e) => setKtOverride(e.target.value as any)}>
            {KT_OVERRIDE_OPTIONS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Lymph node</label>
          <div className="flex gap-2">
            {[
              { v: "none", label: "언급 안함" },
              { v: "benign", label: "양성 소견" },
              { v: "suspicious", label: "의심 소견" },
            ].map((o) => (
              <button
                type="button"
                key={o.v}
                onClick={() => setLnStatus(o.v as any)}
                className={`chip border ${lnStatus === o.v ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3 space-y-3">
          <GlandSection
            title="Parotid gland"
            status={parotidStatus}
            setStatus={setParotidStatus}
            side={parotidSide}
            setSide={setParotidSide}
            desc={parotidDesc}
            setDesc={setParotidDesc}
          />
          <GlandSection
            title="SMG (submandibular gland)"
            status={smgStatus}
            setStatus={setSmgStatus}
            side={smgSide}
            setSide={setSmgSide}
            desc={smgDesc}
            setDesc={setSmgDesc}
          />
        </div>

        <div className="border-t border-slate-100 pt-3">
          <label className="label">FNAC 시행</label>
          <div className="flex gap-2 items-center">
            {(["", "-", "+"] as const).map((v) => (
              <button
                type="button"
                key={v || "none"}
                onClick={() => setFnac(v)}
                className={`chip border ${fnac === v ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}
              >
                {v === "" ? "언급 안함" : v}
              </button>
            ))}
            {fnac && (
              <input
                className="input flex-1"
                placeholder="시행 부위 (예: Rt thyroid nodule)"
                value={fnacSite}
                onChange={(e) => setFnacSite(e.target.value)}
              />
            )}
          </div>
        </div>

        <button className="btn" onClick={generate} type="button">
          생성하기
        </button>
      </div>
      <div className="card space-y-2">
        <div className="flex items-center justify-between">
          <label className="label mb-0">결과</label>
          <button className="btn-outline !px-3 !py-1 text-xs" onClick={copyOutput} type="button">
            복사
          </button>
        </div>
        <div className="input min-h-[420px] whitespace-pre-wrap font-mono text-sm bg-slate-50">{output || "왼쪽에서 값을 선택하고 생성하기를 누르세요."}</div>
      </div>
    </div>
  );
}

export default function UsReportPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  const [tab, setTab] = useState<"free" | "structured">("free");

  if (loading || !user) return null;

  return (
    <div className="space-y-4 pb-20">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">US Report 작성</h1>
        <p className="text-sm text-slate-500 mt-1">갑상선/경부 초음파 판독문을 빠르게 작성합니다.</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("free")}
          className={`chip border ${tab === "free" ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}
        >
          자유 입력 (자동완성)
        </button>
        <button
          type="button"
          onClick={() => setTab("structured")}
          className={`chip border ${tab === "structured" ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}
        >
          선택형 (체크박스로 생성)
        </button>
      </div>
      {tab === "free" ? <FreeformTab /> : <StructuredTab />}
    </div>
  );
}
