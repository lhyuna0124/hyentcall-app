"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { LabIdeaComment } from "@/lib/types";
import {
  DEFAULT_PAMPHLET_INPUT,
  DIET_STATUS_OPTIONS,
  NECK_DISSECTION_OPTIONS,
  PRIMARY_SITE_OPTIONS,
  PamphletExercise,
  PamphletInput,
  PrimarySite,
  SURGERY_OPTIONS,
  buildPamphlet,
} from "@/lib/swallowPamphlet";
import {
  AlertTriangle,
  ArrowDownCircle,
  Dumbbell,
  Lock,
  Maximize2,
  MoveHorizontal,
  Printer,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Zap,
  type LucideIcon,
} from "lucide-react";

const PAMPHLET_IDEAS = [{ title: "술 후 음성훈련 방법 설명", desc: "수술 후 음성 재활을 위한 훈련법 안내" }];

const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  rotate: RotateCw,
  ctar: ArrowDownCircle,
  zap: Zap,
  dumbbell: Dumbbell,
  tongue: MoveHorizontal,
  jaw: Maximize2,
  shield: ShieldCheck,
};

function isChecked(ex: PamphletExercise, overrides: Record<string, boolean>) {
  if (ex.locked) return true;
  if (ex.id in overrides) return overrides[ex.id];
  return ex.hardExcluded ? false : ex.autoRecommended;
}

function ToggleField({
  label,
  value,
  onChange,
  onLabel,
  offLabel,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`chip border ${!value ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}
        >
          {offLabel}
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`chip border ${value ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600"}`}
        >
          {onLabel}
        </button>
      </div>
    </div>
  );
}

function SwallowPamphletGenerator() {
  const [input, setInput] = useState<PamphletInput>(DEFAULT_PAMPHLET_INPUT);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const result = useMemo(() => buildPamphlet(input), [input]);
  const includedExercises = result.exercises.filter((ex) => isChecked(ex, overrides));

  function updateSite(site: PrimarySite) {
    setInput((v) => ({ ...v, site, surgery: SURGERY_OPTIONS[site][0].v }));
  }

  function toggle(id: string, current: boolean) {
    setOverrides((o) => ({ ...o, [id]: !current }));
  }

  return (
    <section className="space-y-4">
      <div className="print:hidden">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-brand-600" /> 맞춤형 연하 재활 훈련 팜플렛 생성기
        </h2>
        <p className="text-sm text-slate-500 mt-1">수술 정보를 입력하면 해당 환자에게 맞는 수술 전 연하재활 운동이 자동으로 추천됩니다.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 입력 폼 */}
        <div className="card space-y-4 print:hidden">
          <div>
            <label className="label">원발 부위</label>
            <select className="input" value={input.site} onChange={(e) => updateSite(e.target.value as PrimarySite)}>
              {PRIMARY_SITE_OPTIONS.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">예정 수술명</label>
            <select className="input" value={input.surgery} onChange={(e) => setInput((v) => ({ ...v, surgery: e.target.value }))}>
              {SURGERY_OPTIONS[input.site].map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ToggleField label="수술 전 CCRT" value={input.ccrt} onChange={(v) => setInput((s) => ({ ...s, ccrt: v }))} onLabel="+" offLabel="-" />
            <ToggleField
              label="Trismus (개구장애)"
              value={input.trismus}
              onChange={(v) => setInput((s) => ({ ...s, trismus: v }))}
              onLabel="+"
              offLabel="-"
            />
            <ToggleField
              label="하악 절개/절제 (Mandibulotomy/ectomy)"
              value={input.mandibulotomy}
              onChange={(v) => setInput((s) => ({ ...s, mandibulotomy: v }))}
              onLabel="O"
              offLabel="X"
            />
            <ToggleField
              label="유리 재건술"
              value={input.freeFlap}
              onChange={(v) => setInput((s) => ({ ...s, freeFlap: v }))}
              onLabel="O"
              offLabel="X"
            />
          </div>

          <div>
            <label className="label">경부곽청술 (Neck Dissection)</label>
            <select
              className="input"
              value={input.neckDissection}
              onChange={(e) => setInput((v) => ({ ...v, neckDissection: e.target.value as PamphletInput["neckDissection"] }))}
            >
              {NECK_DISSECTION_OPTIONS.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">수술 전 식이 상태</label>
            <select
              className="input"
              value={input.diet}
              onChange={(e) => setInput((v) => ({ ...v, diet: e.target.value as PamphletInput["diet"] }))}
            >
              {DIET_STATUS_OPTIONS.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-1">
            <div className="flex items-center justify-between">
              <label className="label mb-0">포함할 운동 (자동 추천됨 · 직접 조정 가능)</label>
              {Object.keys(overrides).length > 0 && (
                <button type="button" className="text-xs text-brand-600 hover:underline" onClick={() => setOverrides({})}>
                  자동 추천으로 초기화
                </button>
              )}
            </div>
            {result.exercises
              .filter((ex) => !ex.locked)
              .map((ex) => {
                const checked = isChecked(ex, overrides);
                return (
                  <label
                    key={ex.id}
                    className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50"
                  >
                    <input type="checkbox" className="mt-1" checked={checked} onChange={() => toggle(ex.id, checked)} />
                    <span className="flex-1">
                      {ex.title}
                      {ex.hardExcluded && (
                        <span className="block text-xs text-amber-600 mt-0.5">⚠ 기본 제외{ex.excludeReason ? ` · ${ex.excludeReason}` : ""}</span>
                      )}
                    </span>
                  </label>
                );
              })}
            <p className="text-xs text-slate-400 flex items-center gap-1 pt-1">
              <Lock className="w-3 h-3 flex-shrink-0" /> 구강 위생 관리 / 목 근육 스트레칭은 모든 환자 공통 필수 항목으로 항상 포함됩니다.
            </p>
          </div>
        </div>

        {/* 미리보기 */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between print:hidden">
            <label className="label mb-0">📄 팜플렛 미리보기</label>
            <button type="button" onClick={() => window.print()} className="btn !px-3 !py-1.5 text-xs flex items-center gap-1.5">
              <Printer className="w-4 h-4" /> 인쇄하기
            </button>
          </div>

          <div id="pamphlet-print-area" className="space-y-3">
            <div className="text-center border-b-2 border-brand-100 pb-3">
              <h3 className="text-2xl font-bold text-brand-700">수술 전 연하 재활 운동</h3>
              <p className="text-sm text-slate-500 mt-1">이비인후과 · 두경부외과</p>
            </div>

            {includedExercises.map((ex, i) => {
              const Icon = ICONS[ex.icon] ?? Sparkles;
              return (
                <div key={ex.id} className="rounded-xl border-2 border-slate-200 p-4 flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <p className="text-xl font-bold text-slate-800">
                      {i + 1}. {ex.title}
                    </p>
                    <ul className="space-y-1 list-none">
                      {ex.detail.map((d, j) => (
                        <li key={j} className="text-lg text-slate-700 leading-relaxed">
                          {d}
                        </li>
                      ))}
                    </ul>
                    {ex.note && (
                      <p className="text-base text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-1.5">
                        ⚠ {ex.note}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {result.warning && (
              <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4 flex gap-3 items-start">
                <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-xl font-bold text-red-700">[수술 후 주의]</p>
                  <p className="text-lg text-red-700 leading-relaxed mt-1">{result.warning}</p>
                </div>
              </div>
            )}

            {includedExercises.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">왼쪽에서 조건을 입력하거나 운동을 선택하면 여기에 팜플렛이 표시됩니다.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LabPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  const [comments, setComments] = useState<LabIdeaComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  function loadComments() {
    fetch("/api/lab-comments")
      .then((r) => r.json())
      .then(setComments)
      .catch(() => {});
  }
  useEffect(() => {
    loadComments();
  }, []);

  async function postComment() {
    if (!user || !newComment.trim()) return;
    setPosting(true);
    await fetch("/api/lab-comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authorId: user.id,
        authorName: user.name,
        authorLevel: user.level,
        text: newComment.trim(),
      }),
    });
    setNewComment("");
    setPosting(false);
    loadComments();
  }

  async function deleteComment(id: string) {
    if (!confirm("이 댓글을 삭제하시겠습니까?")) return;
    await fetch(`/api/lab-comments?id=${id}`, { method: "DELETE" });
    loadComments();
  }

  if (loading || !user) return null;

  return (
    <div className="space-y-4 pb-20">
      <div className="print:hidden">
        <h1 className="text-xl font-bold text-brand-700">🧪 실험실</h1>
        <p className="text-sm text-slate-500 mt-1">
          곧 추가될 기능을 미리 구상해보는 공간입니다. 연하 재활 훈련 팜플렛 생성기를 시범 운영 중이에요.
        </p>
      </div>

      <SwallowPamphletGenerator />

      <section className="card space-y-3 print:hidden">
        <h2 className="font-bold text-slate-800">📋 만들어볼 팜플렛 (다음 목표)</h2>
        <div className="space-y-2">
          {PAMPHLET_IDEAS.map((idea) => (
            <div key={idea.title} className="p-3 rounded-lg border border-slate-200">
              <p className="text-sm font-semibold text-slate-700">{idea.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{idea.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-3 print:hidden">
        <h2 className="font-bold text-slate-800">💬 의견 남기기 ({comments.length})</h2>
        <p className="text-xs text-slate-400">팜플렛 생성기 사용 소감이나 추가로 필요한 운동/조건, 다음에 만들 기능 등 자유롭게 남겨주세요.</p>

        <div className="flex items-start gap-2">
          <textarea
            className="input min-h-[60px] text-sm flex-1"
            placeholder="의견을 입력하세요..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button
            type="button"
            onClick={postComment}
            className="btn !px-3 !py-1.5 text-xs flex-shrink-0"
            disabled={posting || !newComment.trim()}
          >
            작성
          </button>
        </div>

        <div className="space-y-2">
          {comments.length === 0 && <p className="text-sm text-slate-400">아직 의견이 없습니다.</p>}
          {comments.map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-2 p-2.5 rounded-lg border border-slate-200">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">
                    {c.authorName} ({c.authorLevel})
                  </span>
                  <span>{new Date(c.createdAt).toLocaleString("ko-KR")}</span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap mt-0.5">{c.text}</p>
              </div>
              {user.isAdmin && (
                <button
                  type="button"
                  onClick={() => deleteComment(c.id)}
                  className="text-xs text-red-500 hover:text-red-700 flex-shrink-0"
                >
                  삭제
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
