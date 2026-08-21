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

const
