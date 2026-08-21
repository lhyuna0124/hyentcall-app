"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { HospitalSite, MdtPatient, MdtSurgRow, MdtImgRow } from "@/lib/types";
import { formatChartReview } from "@/lib/chartReview";

interface SurgRow {
  name: string;
  date: string;
  path: string;
}
interface ImgRow {
  name: string;
  date: string;
  desc: string;
}

const PMH_DISEASE_OPTIONS = ["HTN", "DM", "Asthma", "Pul. Tb", "Dyslipidemia"];
const PMH_SOCIAL_OPTIONS = ["흡연(Smoker)", "음주(Alcohol)"];

const PTYPE_OPTIONS = [
  { v: "post", label: "수술 후 환자" },
  { v: "pre", label: "수술 전/미결정" },
  { v: "mal", label: "Malignancy 여부 토론" },
  { v: "adv", label: "다회 수술/재발" },
] as const;

// 환자 유형별로 다학제 준비 시 챙겨야 할 체크리스트 (요약문에는 포함되지 않음, 화면 확인용)
const TODOS: Record<string, string[]> = {
  post: ["병리결과 확인", "치과 진료 내역 (방사선 치료 대비)", "eGFR 및 기저질환 (CTx 신기능)", "NGS/PD-L1 등 유전자 검사"],
  pre: ["조직검사 결과 확인", "PET, CT, MR 영상검사 확인", "치과 진료 내역 (방사선 치료 대비)", "eGFR 및 기저질환 (CTx 신기능)", "수술 날짜"],
  mal: ["조직검사 결과 확인", "PET, CT, MR 영상검사 확인", "추가 검사(Chest CT 등) 필요성"],
  adv: ["이전 병리결과 확인", "Advanced 현재 영상 평가", "이전 영상 자료와 비교 분석"],
};

function cleanSpaces(str: string) {
  if (!str) return "";
  let cleaned = str.replace(/[\n\r]+/g, ", ").replace(/[\s\u00A0]+/g, " ");
  cleaned = cleaned
    .replace(/\s+,/g, ",")
    .replace(/,([^\s])/g, ", $1")
    .replace(/(,\s*)+/g, ", ")
    .replace(/^[\s,]+|[\s,]+$/g, "");
  return cleaned;
}

function formatSurgDate(raw: string) {
  const num = raw.replace(/[^0-9]/g, "");
  if (num.length >= 8) return num.substring(2, 4) + "'." + num.substring(4, 6) + "." + num.substring(6, 8);
  return raw;
}
function formatImgDate(raw: string) {
  const num = raw.replace(/[^0-9]/g, "");
  if (num.length >= 8) return num.substring(0, 4) + "." + num.substring(4, 6) + "." + num.substring(6, 8);
  return raw;
}
function sortKey(raw: string) {
  const num = raw.replace(/[^0-9]/g, "");
  return num.length >= 8 ? parseInt(num.substring(0, 8), 10) : 99999999;
}

// 날짜칸에 숫자 8자리를 입력하면 자동으로 "YYYY.MM.DD" 형식으로 바꿔줍니다.
function autoFormatDateInput(raw: string) {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length === 8) return digits;
  return raw;
}

// Enter로 줄바꿈이 되는 자동 높이조절 textarea.
// cleanOnPaste가 true면, EHR에서 복사한 결과를 붙여넣을 때 차트리뷰 포맷터와 동일한 로직으로
// 불필요한 정보(환자번호/판독의/검사일시/단위 등)를 자동으로 정리해서 넣어줍니다.
function AutoTextarea({
  value,
  onChange,
  placeholder,
  className = "",
  cleanOnPaste = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  cleanOnPaste?: boolean;
}) {
  return (
    <textarea
      className={`input resize-none overflow-hidden ${className}`}
      placeholder={placeholder}
      value={value}
      rows={1}
      onChange={(e) => {
        onChange(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = e.target.scrollHeight + "px";
      }}
      onInput={(e) => {
        const el = e.currentTarget;
        el.style.height = "auto";
        el.style.height = el.scrollHeight + "px";
      }}
      onPaste={
        cleanOnPaste
          ? (e) => {
              const pasted = e.clipboardData.getData("text");
              // EHR 형식(Neck CT/Thyroid US/혈액검사 등)으로 보이면 자동 정리, 아니면 원문 그대로 붙여넣기
              const looksLikeEhr = /【검사명】|【검사일】|Thyroid Ultrasonography|CI:|-{10,}/.test(pasted);
              if (!looksLikeEhr) return; // 기본 붙여넣기 동작 유지
              e.preventDefault();
              const cleaned = formatChartReview(pasted);
              const el = e.currentTarget;
              const start = el.selectionStart ?? el.value.length;
              const end = el.selectionEnd ?? el.value.length;
              const newVal = el.value.slice(0, start) + cleaned + el.value.slice(end);
              onChange(newVal);
              setTimeout(() => {
                el.style.height = "auto";
                el.style.height = el.scrollHeight + "px";
              }, 0);
            }
          : undefined
      }
    />
  );
}

export default function MdtPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  const [site, setSite] = useState<HospitalSite>("구리");
  const [savedList, setSavedList] = useState<MdtPatient[]>([]);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/mdt").then((r) => r.json()).then(setSavedList).catch(() => {});
  }, []);

  // --- 서버에서 등록번호로 불러오기 ---
  const [searchRegNo, setSearchRegNo] = useState("");
  const [searchResults, setSearchResults] = useState<MdtPatient[] | null>(null);

  function searchByRegNo() {
    const q = searchRegNo.trim();
    if (!q) {
      alert("등록번호를 입력해주세요.");
      return;
    }
    const exact = savedList.filter((p) => p.registrationNo === q);
    if (exact.length === 1) {
      loadPatient(exact[0]);
      setSearchResults(null);
      return;
    }
    const matches = exact.length > 1 ? exact : savedList.filter((p) => p.registrationNo.includes(q) || p.name.includes(q));
    if (matches.length === 0) {
      alert("해당 등록번호로 저장된 환자를 찾을 수 없습니다.");
      setSearchResults(null);
      return;
    }
    setSearchResults(matches);
  }

  // --- 환자 인적사항 ---
  const [regNo, setRegNo] = useState("");
  const [name, setName] = useState("");
  const [sex, setSex] = useState("");
  const [age, setAge] = useState("");
  const [dx, setDx] = useState("");
  const [cc, setCc] = useState("");
  const [onset, setOnset] = useState("");
  const [pi, setPi] = useState("");
  const [pmhChecks, setPmhChecks] = useState<string[]>([]);
  const [pmhEtc, setPmhEtc] = useState("");
  const [egfr, setEgfr] = useState("");
  const [dental, setDental] = useState("");
  const [ptype, setPtype] = useState("");
  const [todoChecks, setTodoChecks] = useState<Record<string, boolean>>({});
  const [surgRows, setSurgRows] = useState<SurgRow[]>([{ name: "", date: "", path: "" }]);
  const [imgRows, setImgRows] = useState<ImgRow[]>([
    { name: "PET-CT", date: "", desc: "" },
    { name: "HN CT", date: "", desc: "" },
    { name: "HN MRI", date: "", desc: "" },
  ]);
  const [summary, setSummary] = useState("");

  function resetForm() {
    setRegNo(""); setName(""); setSex(""); setAge(""); setDx(""); setCc(""); setOnset(""); setPi("");
    setPmhChecks([]); setPmhEtc(""); setEgfr(""); setDental(""); setPtype(""); setTodoChecks({});
    setSurgRows([{ name: "", date: "", path: "" }]);
    setImgRows([{ name: "PET-CT", date: "", desc: "" }, { name: "HN CT", date: "", desc: "" }, { name: "HN MRI", date: "", desc: "" }]);
    setSummary("");
    setLoadedId(null);
    setSearchRegNo("");
    setSearchResults(null);
  }

  function selectPtype(v: string) {
    setPtype(v);
    setTodoChecks({});
  }

  function autoGeneratePI() {
    if (!cc && !dx) {
      alert("주소증(C/C)이나 최종진단명을 먼저 입력해주세요!");
      return;
    }
    let s = "상기 환자 " + (onset ? `${onset} ` : "");
    s += cc ? `${cc} 주소로 내원하여 조직검사 하였고, ` : "내원하여 조직검사 하였고, ";
    s += dx ? `${dx} 확인되어 ` : "";
    s += "추후 치료방침 결정 위해 다학제진료 의뢰됨.";
    setPi(s);
  }

  function generateSummary() {
    const ptypeLabel: Record<string, string> = {
      post: "수술 후 환자", pre: "수술 전/미결정", mal: "Malignancy 여부 토론", adv: "다회 수술/재발",
    };
    let pmhArr = [...pmhChecks];
    if (pmhEtc) pmhArr.push(cleanSpaces(pmhEtc));
    const pmhStr = pmhArr.length ? `기저 및 사회력(+, ${pmhArr.join(", ")})` : "기저 및 사회력(-)";

    let out = "[환자 기본 정보]\n";
    out += `등록번호: ${regNo} | 이름: ${name} | 성별/나이: ${sex}/${age}\n`;
    out += `최종진단명: ${dx}\n환자유형: ${ptype ? ptypeLabel[ptype] : "선택 안됨"}\n주소증(C/C): ${cc} (Onset: ${onset})\n${pmhStr}\n\n`;

    if (pi) out += `[현병력 (Present Illness)]\n${pi}\n\n`;

    const evals: string[] = [];
    if (egfr) evals.push(`eGFR: ${egfr}`);
    if (dental) evals.push(`치과: ${dental}`);
    if (evals.length) out += evals.join(" | ") + "\n\n";

    out += "[수술 및 병리 기록]\n";
    const surgList = surgRows
      .filter((r) => r.name || r.path || r.date)
      .map((r) => ({ ...r, key: sortKey(r.date) }))
      .sort((a, b) => a.key - b.key);
    if (surgList.length) {
      surgList.forEach((item) => {
        const fDate = item.date ? formatSurgDate(item.date) : "";
        const line = `${fDate ? fDate + " " : ""}${cleanSpaces(item.name)}`.trim();
        if (line) out += `${line}\n`;
        if (item.path) out += ` Bx) ${item.path.replace(/\n/g, "\n     ")}\n`;
        out += "\n";
      });
    } else out += "- 해당사항 없음\n\n";

    out += "[영상 검사 소견]\n";
    const imgList = imgRows
      .filter((r) => r.date || r.desc || r.name)
      .map((r) => ({ ...r, key: sortKey(r.date) }))
      .sort((a, b) => a.key - b.key);
    if (imgList.length) {
      imgList.forEach((item) => {
        const fDate = item.date ? formatImgDate(item.date) : "";
        if (item.name || fDate) out += `* ${cleanSpaces(item.name)}${fDate ? ` <${fDate}>` : ""}\n`;
        if (item.desc) out += `  ${item.desc.replace(/\n/g, "\n  ")}\n`;
        out += "\n";
      });
    } else out += "- 해당사항 없음\n\n";

    setSummary(out.trim());
    return out.trim();
  }

  function copyText() {
    if (!summary.trim()) {
      alert("먼저 '내용 정리하기' 버튼을 눌러주세요.");
      return;
    }
    navigator.clipboard.writeText(summary);
    alert("복사 완료! EMR 의무기록창에 붙여넣으세요.");
  }

  async function saveToServer() {
    if (!regNo || !name) {
      alert("등록번호와 이름은 저장을 위해 필수입니다.");
      return;
    }
    if (!summary.trim()) generateSummary();
    const payload: MdtPatient = {
      id: loadedId || crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      site,
      registrationNo: regNo,
      name,
      sex,
      age,
      diagnosis: dx,
      summary: summary || "",
      detail: {
        cc,
        onset,
        pi,
        pmhChecks,
        pmhEtc,
        egfr,
        dental,
        ptype,
        surgRows,
        imgRows,
      },
    };
    if (loadedId) {
      await fetch("/api/mdt", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setSavedList((prev) => prev.map((p) => (p.id === payload.id ? payload : p)));
    } else {
      await fetch("/api/mdt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setSavedList((prev) => [payload, ...prev]);
      setLoadedId(payload.id);
    }
    alert("저장되었습니다.");
  }

  function loadPatient(p: MdtPatient) {
    setSite(p.site);
    setRegNo(p.registrationNo);
    setName(p.name);
    setSex(p.sex);
    setAge(p.age);
    setDx(p.diagnosis);
    setSummary(p.summary);
    setLoadedId(p.id);
    if (p.detail) {
      setCc(p.detail.cc || "");
      setOnset(p.detail.onset || "");
      setPi(p.detail.pi || "");
      setPmhChecks(p.detail.pmhChecks || []);
      setPmhEtc(p.detail.pmhEtc || "");
      setEgfr(p.detail.egfr || "");
      setDental(p.detail.dental || "");
      setPtype(p.detail.ptype || "");
      setTodoChecks({});
      setSurgRows(p.detail.surgRows?.length ? p.detail.surgRows : [{ name: "", date: "", path: "" }]);
      setImgRows(
        p.detail.imgRows?.length
          ? p.detail.imgRows
          : [{ name: "PET-CT", date: "", desc: "" }, { name: "HN CT", date: "", desc: "" }, { name: "HN MRI", date: "", desc: "" }]
      );
    }
  }

  async function deletePatient(id: string) {
    if (!confirm("이 환자 기록을 목록에서 삭제할까요?")) return;
    await fetch(`/api/mdt?id=${id}`, { method: "DELETE" });
    setSavedList((prev) => prev.filter((p) => p.id !== id));
    if (loadedId === id) resetForm();
  }

  function printSummary() {
    const text = generateSummary();
    if (!text) {
      alert("먼저 내용을 입력하고 '내용 정리하기'를 눌러 요약본을 생성해주세요.");
      return;
    }
    setTimeout(() => window.print(), 50);
  }

  if (loading || !user) return null;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold text-brand-700">🧑‍⚕️ 다학제(MDT) 환자 정리</h1>
        <div className="flex gap-2">
          {loadedId && (
            <button
              className="btn-outline !px-3 !py-1.5 text-xs !text-red-500 !border-red-200"
              onClick={() => deletePatient(loadedId)}
              type="button"
            >
              이 환자 삭제
            </button>
          )}
          <button className="btn-outline !px-3 !py-1.5 text-xs" onClick={resetForm} type="button">
            새 환자 작성
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-2 print:hidden">
        등록번호/환자이름을 서버에 저장합니다. 접근 권한이 있는 인원만 이 앱에 접속할 수 있도록 URL 공유에 유의하세요.
      </div>

      <section className="card space-y-3 print:hidden">
        <div>
          <label className="label">병원</label>
          <div className="flex gap-2">
            {(["구리", "서울"] as HospitalSite[]).map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setSite(s)}
                className={`chip border ${site === s ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}
              >
                {s}병원
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">서버에서 불러오기 (등록번호 또는 이름)</label>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="등록번호 입력"
              value={searchRegNo}
              onChange={(e) => setSearchRegNo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchByRegNo()}
            />
            <button className="btn-outline whitespace-nowrap" type="button" onClick={searchByRegNo}>
              불러오기
            </button>
          </div>
          {searchResults && (
            <div className="mt-2 border border-slate-200 rounded-lg divide-y divide-slate-100">
              {searchResults.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <button type="button" onClick={() => { loadPatient(p); setSearchResults(null); }} className="text-left flex-1">
                    <span className="font-medium">{p.name}</span> ({p.registrationNo}) · {p.site}병원 · {p.diagnosis || "진단명 미기재"}
                  </button>
                  <button type="button" onClick={() => deletePatient(p.id)} className="text-red-400 text-xs ml-2">삭제</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="card space-y-3 print:hidden">
        <h2 className="font-medium text-slate-700">1. 환자 인적사항 및 진단 정보</h2>
        <div className="grid grid-cols-4 gap-3">
          <div><label className="label">등록번호 (*목록 저장 필수)</label><input className="input" value={regNo} onChange={(e) => setRegNo(e.target.value)} /></div>
          <div><label className="label">이름 (*목록 저장 필수)</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div>
            <label className="label">성별</label>
            <select className="input" value={sex} onChange={(e) => setSex(e.target.value)}>
              <option value="">선택</option>
              <option value="M">M (남성)</option>
              <option value="F">F (여성)</option>
            </select>
          </div>
          <div><label className="label">나이</label><input className="input" value={age} onChange={(e) => setAge(e.target.value)} /></div>
        </div>
        <div>
          <label className="label">최종진단명 (Primary Site)</label>
          <input className="input" placeholder="예: Tongue cancer" value={dx} onChange={(e) => setDx(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">주소증 (C/C)</label><input className="input" placeholder="예: 우측 경부 종괴" value={cc} onChange={(e) => setCc(e.target.value)} /></div>
          <div><label className="label">Onset</label><input className="input" placeholder="예: 2개월 전" value={onset} onChange={(e) => setOnset(e.target.value)} /></div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="label mb-0">📝 현병력 (Present Illness)</label>
            <button className="btn-outline !px-2 !py-1 text-xs" onClick={autoGeneratePI} type="button">
              ⚡ 문장 자동 완성
            </button>
          </div>
          <AutoTextarea
            className="min-h-[50px]"
            value={pi}
            onChange={setPi}
            placeholder="주소증/진단명 입력 후 자동 완성 버튼을 누르거나, 복잡한 히스토리가 있다면 직접 자유롭게 타이핑하세요..."
          />
        </div>
        <div>
          <label className="label">기저질환 (Underlying Disease) 및 사회력</label>
          <div className="flex flex-wrap items-center gap-2 mb-2 bg-slate-50 rounded-lg p-2.5">
            {PMH_DISEASE_OPTIONS.map((o) => (
              <button
                type="button"
                key={o}
                onClick={() => setPmhChecks((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]))}
                className={`chip border ${pmhChecks.includes(o) ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}
              >
                {o}
              </button>
            ))}
            <span className="text-slate-300 px-1">|</span>
            {PMH_SOCIAL_OPTIONS.map((o) => (
              <button
                type="button"
                key={o}
                onClick={() => setPmhChecks((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]))}
                className={`chip border ${pmhChecks.includes(o) ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}
              >
                {o}
              </button>
            ))}
          </div>
          <input
            className="input"
            placeholder="기타 기저질환 직접 기입 (예: Hepatitis, s/p cerebral hemorrhage 등)..."
            value={pmhEtc}
            onChange={(e) => setPmhEtc(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 bg-blue-50 rounded-lg p-3">
          <div><label className="label">🩸 eGFR (신기능 / CTx 대비)</label><input className="input" placeholder="예: 85.4 ml/min" value={egfr} onChange={(e) => setEgfr(e.target.value)} /></div>
          <div><label className="label">🦷 치과 진료 내역 (RTx 대비)</label><input className="input" placeholder="예: 우측 하악 대구치 발치 완료" value={dental} onChange={(e) => setDental(e.target.value)} /></div>
        </div>
      </section>

      <section className="card space-y-2 print:hidden">
        <h2 className="font-medium text-slate-700">2. 환자 유형 선택 (To-Do)</h2>
        <div className="flex flex-wrap gap-2 bg-slate-50 rounded-lg p-3">
          {PTYPE_OPTIONS.map((o) => (
            <button
              type="button"
              key={o.v}
              onClick={() => selectPtype(o.v)}
              className={`chip border ${ptype === o.v ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {ptype && TODOS[ptype] && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5">
            <p className="text-sm font-medium text-amber-800">필수 확인 체크리스트 (요약에는 포함되지 않음)</p>
            {TODOS[ptype].map((item) => (
              <label key={item} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!todoChecks[item]}
                  onChange={(e) => setTodoChecks((prev) => ({ ...prev, [item]: e.target.checked }))}
                />
                {item}
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="card space-y-2 print:hidden">
        <h2 className="font-medium text-slate-700">3. 수술 및 병리 기록</h2>
        {surgRows.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_120px_2fr_auto] gap-2 items-start">
            <AutoTextarea
              placeholder="수술명 입력"
              value={row.name}
              onChange={(v) => setSurgRows((p) => p.map((r, j) => (j === i ? { ...r, name: v } : r)))}
            />
            <input
              className="input text-center"
              placeholder="예: 20260520"
              maxLength={10}
              value={row.date}
              onChange={(e) => setSurgRows((p) => p.map((r, j) => (j === i ? { ...r, date: autoFormatDateInput(e.target.value) } : r)))}
            />
            <AutoTextarea
              placeholder="소견 입력 (EHR 결과 붙여넣으면 자동 정리)"
              value={row.path}
              onChange={(v) => setSurgRows((p) => p.map((r, j) => (j === i ? { ...r, path: v } : r)))}
              cleanOnPaste
            />
            <button type="button" className="text-red-400 text-xs mt-2" onClick={() => setSurgRows((p) => p.filter((_, j) => j !== i))}>삭제</button>
          </div>
        ))}
        <button className="btn-outline !px-3 !py-1 text-xs" type="button" onClick={() => setSurgRows((p) => [...p, { name: "", date: "", path: "" }])}>
          + 수술 추가
        </button>
      </section>

      <section className="card space-y-2 print:hidden">
        <h2 className="font-medium text-slate-700">4. 영상 검사</h2>
        {imgRows.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_120px_2fr_auto] gap-2 items-start">
            <AutoTextarea
              placeholder="검사명 입력"
              value={row.name}
              onChange={(v) => setImgRows((p) => p.map((r, j) => (j === i ? { ...r, name: v } : r)))}
            />
            <input
              className="input text-center"
              placeholder="예: 20260520"
              maxLength={10}
              value={row.date}
              onChange={(e) => setImgRows((p) => p.map((r, j) => (j === i ? { ...r, date: autoFormatDateInput(e.target.value) } : r)))}
            />
            <AutoTextarea
              placeholder="소견 입력 (EHR 결과 붙여넣으면 자동 정리)"
              value={row.desc}
              onChange={(v) => setImgRows((p) => p.map((r, j) => (j === i ? { ...r, desc: v } : r)))}
              cleanOnPaste
            />
            <button type="button" className="text-red-400 text-xs mt-2" onClick={() => setImgRows((p) => p.filter((_, j) => j !== i))}>삭제</button>
          </div>
        ))}
        <button className="btn-outline !px-3 !py-1 text-xs" type="button" onClick={() => setImgRows((p) => [...p, { name: "", date: "", desc: "" }])}>
          + 검사 추가
        </button>
      </section>

      <section className="card space-y-3 print:hidden">
        <h2 className="font-medium text-slate-700">5. MDT 요약 결과</h2>
        <div className="flex gap-2 flex-wrap">
          <button className="btn" type="button" onClick={generateSummary}>내용 정리하기</button>
          <button className="btn-outline" type="button" onClick={copyText}>전체 복사</button>
          <button className="btn-outline" type="button" onClick={saveToServer}>서버에 저장</button>
          <button className="btn-outline" type="button" onClick={printSummary}>🖨️ 요약본 인쇄</button>
        </div>
        <textarea className="input min-h-[280px] font-mono text-sm" value={summary} onChange={(e) => setSummary(e.target.value)} />
      </section>

      {/* 프린트 전용 구역 - 평소엔 안 보이고, 인쇄(Ctrl+P) 할 때만 이 구역만 출력됩니다 */}
      <div className="hidden print:block">
        <h2 className="text-xl font-bold border-b-2 border-black pb-3 mb-6 text-center">
          다학제(MDT) 진료 환자 요약지
          {(name || regNo) && (
            <div className="text-sm font-normal text-slate-600 mt-1">
              환자: {name} {regNo && `(${regNo})`}
            </div>
          )}
        </h2>
        <pre className="whitespace-pre-wrap font-sans text-[12pt] leading-relaxed text-black">{summary}</pre>
      </div>
    </div>
  );
}
