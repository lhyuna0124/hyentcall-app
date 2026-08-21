"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { HospitalSite, MdtPatient } from "@/lib/types";

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

const PMH_OPTIONS = ["HTN", "DM", "Asthma", "Pul. Tb", "Dyslipidemia", "흡연(Smoker)", "음주(Alcohol)"];

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

  const listForSite = useMemo(() => savedList.filter((p) => p.site === site), [savedList, site]);

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
  const [surgRows, setSurgRows] = useState<SurgRow[]>([{ name: "", date: "", path: "" }]);
  const [imgRows, setImgRows] = useState<ImgRow[]>([
    { name: "PET-CT", date: "", desc: "" },
    { name: "HN CT", date: "", desc: "" },
    { name: "HN MRI", date: "", desc: "" },
  ]);
  const [summary, setSummary] = useState("");

  function resetForm() {
    setRegNo(""); setName(""); setSex(""); setAge(""); setDx(""); setCc(""); setOnset(""); setPi("");
    setPmhChecks([]); setPmhEtc(""); setEgfr(""); setDental(""); setPtype("");
    setSurgRows([{ name: "", date: "", path: "" }]);
    setImgRows([{ name: "PET-CT", date: "", desc: "" }, { name: "HN CT", date: "", desc: "" }, { name: "HN MRI", date: "", desc: "" }]);
    setSummary("");
    setLoadedId(null);
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
  }

  async function deletePatient(id: string) {
    if (!confirm("이 환자 기록을 목록에서 삭제할까요?")) return;
    await fetch(`/api/mdt?id=${id}`, { method: "DELETE" });
    setSavedList((prev) => prev.filter((p) => p.id !== id));
    if (loadedId === id) resetForm();
  }

  if (loading || !user) return null;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">다학제(MDT) 환자 정리</h1>
        <button className="btn-outline !px-3 !py-1.5 text-xs" onClick={resetForm} type="button">
          새 환자 작성
        </button>
      </div>

      <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-2">
        등록번호/환자이름을 서버에 저장합니다. 접근 권한이 있는 인원만 이 앱에 접속할 수 있도록 URL 공유에 유의하세요.
      </div>

      <section className="card space-y-3">
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
          <label className="label">저장된 환자 ({site}병원, {listForSite.length}명)</label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {listForSite.length === 0 && <span className="text-xs text-slate-400">저장된 환자가 없습니다.</span>}
            {listForSite.map((p) => (
              <div key={p.id} className={`chip border ${loadedId === p.id ? "bg-brand-50 border-brand-300" : "border-slate-300"}`}>
                <button type="button" onClick={() => loadPatient(p)} className="text-slate-700">
                  {p.name} ({p.registrationNo})
                </button>
                <button type="button" onClick={() => deletePatient(p.id)} className="text-red-400 ml-1">✕</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-medium text-slate-700">1. 환자 인적사항 및 진단 정보</h2>
        <div className="grid grid-cols-4 gap-3">
          <div><label className="label">등록번호</label><input className="input" value={regNo} onChange={(e) => setRegNo(e.target.value)} /></div>
          <div><label className="label">이름</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div>
            <label className="label">성별</label>
            <select className="input" value={sex} onChange={(e) => setSex(e.target.value)}>
              <option value="">선택</option>
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>
          <div><label className="label">나이</label><input className="input" value={age} onChange={(e) => setAge(e.target.value)} /></div>
        </div>
        <div>
          <label className="label">최종진단명 (Primary Site)</label>
          <input className="input" placeholder="예: Tongue cancer" value={dx} onChange={(e) => setDx(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">주소증 (C/C)</label><input className="input" value={cc} onChange={(e) => setCc(e.target.value)} /></div>
          <div><label className="label">Onset</label><input className="input" value={onset} onChange={(e) => setOnset(e.target.value)} /></div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="label mb-0">현병력 (Present Illness)</label>
            <button className="btn-outline !px-2 !py-1 text-xs" onClick={autoGeneratePI} type="button">
              ⚡ 문장 자동 완성
            </button>
          </div>
          <textarea className="input min-h-[60px]" value={pi} onChange={(e) => setPi(e.target.value)} />
        </div>
        <div>
          <label className="label">기저질환 및 사회력</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {PMH_OPTIONS.map((o) => (
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
          <input className="input" placeholder="기타 기저질환 직접 기입" value={pmhEtc} onChange={(e) => setPmhEtc(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3 bg-blue-50 rounded-lg p-3">
          <div><label className="label">eGFR (신기능 / CTx 대비)</label><input className="input" value={egfr} onChange={(e) => setEgfr(e.target.value)} /></div>
          <div><label className="label">치과 진료 내역 (RTx 대비)</label><input className="input" value={dental} onChange={(e) => setDental(e.target.value)} /></div>
        </div>
      </section>

      <section className="card space-y-2">
        <h2 className="font-medium text-slate-700">2. 환자 유형</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { v: "post", label: "수술 후 환자" },
            { v: "pre", label: "수술 전/미결정" },
            { v: "mal", label: "Malignancy 여부 토론" },
            { v: "adv", label: "다회 수술/재발" },
          ].map((o) => (
            <button
              type="button"
              key={o.v}
              onClick={() => setPtype(o.v)}
              className={`chip border ${ptype === o.v ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card space-y-2">
        <h2 className="font-medium text-slate-700">3. 수술 및 병리 기록</h2>
        {surgRows.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_120px_2fr_auto] gap-2 items-start">
            <input className="input" placeholder="수술명" value={row.name} onChange={(e) => setSurgRows((p) => p.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))} />
            <input className="input" placeholder="20260520" value={row.date} onChange={(e) => setSurgRows((p) => p.map((r, j) => (j === i ? { ...r, date: e.target.value } : r)))} />
            <input className="input" placeholder="병리결과" value={row.path} onChange={(e) => setSurgRows((p) => p.map((r, j) => (j === i ? { ...r, path: e.target.value } : r)))} />
            <button type="button" className="text-red-400 text-xs" onClick={() => setSurgRows((p) => p.filter((_, j) => j !== i))}>삭제</button>
          </div>
        ))}
        <button className="btn-outline !px-3 !py-1 text-xs" type="button" onClick={() => setSurgRows((p) => [...p, { name: "", date: "", path: "" }])}>
          + 수술 추가
        </button>
      </section>

      <section className="card space-y-2">
        <h2 className="font-medium text-slate-700">4. 영상 검사</h2>
        {imgRows.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_120px_2fr_auto] gap-2 items-start">
            <input className="input" placeholder="검사명" value={row.name} onChange={(e) => setImgRows((p) => p.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))} />
            <input className="input" placeholder="20260520" value={row.date} onChange={(e) => setImgRows((p) => p.map((r, j) => (j === i ? { ...r, date: e.target.value } : r)))} />
            <input className="input" placeholder="주요 소견" value={row.desc} onChange={(e) => setImgRows((p) => p.map((r, j) => (j === i ? { ...r, desc: e.target.value } : r)))} />
            <button type="button" className="text-red-400 text-xs" onClick={() => setImgRows((p) => p.filter((_, j) => j !== i))}>삭제</button>
          </div>
        ))}
        <button className="btn-outline !px-3 !py-1 text-xs" type="button" onClick={() => setImgRows((p) => [...p, { name: "", date: "", desc: "" }])}>
          + 검사 추가
        </button>
      </section>

      <section className="card space-y-3">
        <h2 className="font-medium text-slate-700">5. MDT 요약 결과</h2>
        <div className="flex gap-2">
          <button className="btn" type="button" onClick={generateSummary}>내용 정리하기</button>
          <button className="btn-outline" type="button" onClick={copyText}>전체 복사</button>
          <button className="btn-outline" type="button" onClick={saveToServer}>서버에 저장</button>
        </div>
        <textarea className="input min-h-[280px] font-mono text-sm" value={summary} onChange={(e) => setSummary(e.target.value)} />
      </section>
    </div>
  );
}
