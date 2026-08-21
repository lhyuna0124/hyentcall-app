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

const ECHO_OPTIONS = ["Isoechoic", "Hypoechoic", "Markedly hypoechoic", "Hyperechoic", "Heterogeneous"];
const MARGIN_OPTIONS = ["Smooth", "Irregular", "Spiculated", "Lobulated"];
const COMPOSITION_OPTIONS = ["Solid", "Predominantly solid", "Predominantly cystic", "Cystic", "Spongiform"];
const KTIRADS_OPTIONS = [
  { v: "kt2", label: "K-TIRADS 2 (benign)" },
  { v: "kt3", label: "K-TIRADS 3 (low suspicion)" },
  { v: "kt4", label: "K-TIRADS 4 (intermediate suspicion)" },
  { v: "kt5", label: "K-TIRADS 5 (high suspicion)" },
];

function StructuredTab() {
  const [location, setLocation] = useState("Rt");
  const [sizeA, setSizeA] = useState("");
  const [sizeB, setSizeB] = useState("");
  const [sizeC, setSizeC] = useState("");
  const [composition, setComposition] = useState(COMPOSITION_OPTIONS[0]);
  const [echo, setEcho] = useState(ECHO_OPTIONS[0]);
  const [margin, setMargin] = useState(MARGIN_OPTIONS[0]);
  const [tallerThanWide, setTallerThanWide] = useState(false);
  const [calcification, setCalcification] = useState<"none" | "punctate" | "rim">("none");
  const [kt, setKt] = useState("kt3");
  const [lnStatus, setLnStatus] = useState<"none" | "benign" | "suspicious">("none");
  const [output, setOutput] = useState("");

  function generate() {
    const size = sizeA && sizeB && sizeC ? `${sizeA} x ${sizeB} x ${sizeC} cm` : "";
    const calcText =
      calcification === "punctate" ? ", punctate echogenic foci (+)" : calcification === "rim" ? ", rim calcification (+)" : "";
    const tallerText = tallerThanWide ? ", taller than wide" : "";
    const ktLabel = KTIRADS_OPTIONS.find((k) => k.v === kt)?.label ?? "";

    const lines: string[] = [];
    lines.push(`${location} thyroid nodule${size ? `, size: ${size}` : ""}`);
    lines.push(`- ${composition}, ${echo}, ${margin} margin${tallerText}${calcText}`);
    lines.push(`- ${ktLabel}`);

    if (lnStatus === "benign") {
      lines.push("");
      lines.push("Enlarged lymph nodes in the neck level {{cursor}}");
      lines.push("- ovoid shape with preserved fatty hilum, no definite abnormal vascularity");
    } else if (lnStatus === "suspicious") {
      lines.push("");
      lines.push("Enlarged lymph nodes in neck level {{cursor}}");
      lines.push("- round to oval shape, fatty hilum not clearly identified, heterogeneous echogenicity");
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
        <div>
          <label className="label">Composition</label>
          <select className="input" value={composition} onChange={(e) => setComposition(e.target.value)}>
            {COMPOSITION_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
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
          <div>
            <label className="label">Margin</label>
            <select className="input" value={margin} onChange={(e) => setMargin(e.target.value)}>
              {MARGIN_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={tallerThanWide} onChange={(e) => setTallerThanWide(e.target.checked)} id="ttw" />
          <label htmlFor="ttw" className="text-sm text-slate-600">Taller than wide</label>
        </div>
        <div>
          <label className="label">석회화</label>
          <div className="flex gap-2">
            {[
              { v: "none", label: "없음" },
              { v: "punctate", label: "Punctate echogenic foci" },
              { v: "rim", label: "Rim calcification" },
            ].map((o) => (
              <button
                type="button"
                key={o.v}
                onClick={() => setCalcification(o.v as any)}
                className={`chip border ${calcification === o.v ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">K-TIRADS</label>
          <select className="input" value={kt} onChange={(e) => setKt(e.target.value)}>
            {KTIRADS_OPTIONS.map((o) => (
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
