"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { CONSENT_CATEGORIES, ConsentCategory, ConsentComment, ConsentProcedure, ConsentTemplate } from "@/lib/types";
import { QUICK_COPY_TEXTS } from "@/lib/consentQuickCopy";
import { isProcedureUnread, markProcedureSeen } from "@/lib/consentSeen";

type SectionKey = "purpose" | "process" | "complications" | "precautions";
const SECTIONS: { key: SectionKey; title: string }[] = [
  { key: "purpose", title: "1. 수술(시술, 검사)의 목적 및 효과" },
  { key: "process", title: "2. 수술과정 및 방법, 수술(시술, 검사) 부위 및 추정 소요 시간" },
  { key: "complications", title: "3. 발현가능한 합병증(후유증)의 내용, 정도 및 대처방법" },
  { key: "precautions", title: "4. 수술(시술, 검사) 관련 주의 사항 (수술 후 건강관리에 필요한 사항)" },
];

function emptyTemplate(procedureId: string, procedureName: string): ConsentTemplate {
  return { procedureId, procedureName, procedureNameKo: "", purpose: "", process: "", complications: "", precautions: "", updatedAt: "" };
}

// 특정 분류 내에서만 순서를 바꾸고, 다른 분류 항목들의 상대 위치는 그대로 둡니다.
function reorderInCategory(all: ConsentProcedure[], category: ConsentCategory, orderedCategoryItems: ConsentProcedure[]): ConsentProcedure[] {
  let i = 0;
  return all.map((p) => (p.category === category ? orderedCategoryItems[i++] : p));
}

export default function ConsentFormsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  const [procedures, setProcedures] = useState<ConsentProcedure[]>([]);
  const [activeCategory, setActiveCategory] = useState<ConsentCategory>(CONSENT_CATEGORIES[0]);
  const [activeProcedureId, setActiveProcedureId] = useState<string | null>(null);
  const [addingProcedure, setAddingProcedure] = useState(false);
  const [newProcedureName, setNewProcedureName] = useState("");
  const [addingSubmitting, setAddingSubmitting] = useState(false);

  const procedureList = useMemo(() => procedures.filter((p) => p.category === activeCategory), [procedures, activeCategory]);
  const activeProcedure = procedures.find((p) => p.id === activeProcedureId) || null;

  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  function loadCommentCounts() {
    fetch("/api/consent-comments/counts")
      .then((r) => r.json())
      .then((counts: Record<string, number>) => setCommentCounts(counts))
      .catch(() => {});
  }

  function loadProcedures(selectId?: string) {
    fetch("/api/consent-procedures")
      .then((r) => r.json())
      .then((list: ConsentProcedure[]) => {
        setProcedures(list);
        if (selectId) {
          setActiveProcedureId(selectId);
        } else {
          setActiveProcedureId((prev) => {
            if (prev && list.some((p) => p.id === prev && p.category === activeCategory)) return prev;
            const firstInCat = list.find((p) => p.category === activeCategory);
            return firstInCat ? firstInCat.id : null;
          });
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    if (!user) return;
    loadProcedures();
    loadCommentCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    // 카테고리를 바꾸면 그 카테고리의 첫 항목을 자동 선택
    setActiveProcedureId((prev) => {
      if (prev && procedures.some((p) => p.id === prev && p.category === activeCategory)) return prev;
      const firstInCat = procedures.find((p) => p.category === activeCategory);
      return firstInCat ? firstInCat.id : null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  async function addProcedure() {
    if (!newProcedureName.trim() || addingSubmitting) return;
    setAddingSubmitting(true);
    const res = await fetch("/api/consent-procedures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newProcedureName.trim(), category: activeCategory }),
    });
    const created: ConsentProcedure = await res.json();
    setNewProcedureName("");
    setAddingProcedure(false);
    setAddingSubmitting(false);
    loadProcedures(created.id);
  }

  async function deleteProcedure(id: string) {
    if (!confirm("이 동의서 항목을 삭제하시겠습니까? (양식 내용/댓글은 남지만 목록에서 사라집니다)")) return;
    await fetch(`/api/consent-procedures?id=${id}`, { method: "DELETE" });
    loadProcedures();
  }

  async function persistProcedures(next: ConsentProcedure[]) {
    setProcedures(next);
    await fetch("/api/consent-procedures", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
  }

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function startRenaming(p: ConsentProcedure) {
    setRenamingId(p.id);
    setRenameValue(p.name);
  }

  async function saveRename() {
    const id = renamingId;
    const trimmed = renameValue.trim();
    setRenamingId(null);
    if (!id || !trimmed) return;
    const next = procedures.map((p) => (p.id === id ? { ...p, name: trimmed } : p));
    await persistProcedures(next);
  }

  async function moveProcedure(id: string, direction: "up" | "down") {
    const curIdx = procedureList.findIndex((p) => p.id === id);
    const targetIdx = direction === "up" ? curIdx - 1 : curIdx + 1;
    if (curIdx === -1 || targetIdx < 0 || targetIdx >= procedureList.length) return;
    const reordered = [...procedureList];
    [reordered[curIdx], reordered[targetIdx]] = [reordered[targetIdx], reordered[curIdx]];
    await persistProcedures(reorderInCategory(procedures, activeCategory, reordered));
  }

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  async function handleDrop(overId: string) {
    const draggedId = dragId;
    setDragId(null);
    setDragOverId(null);
    if (!draggedId || draggedId === overId) return;
    const curIdx = procedureList.findIndex((p) => p.id === draggedId);
    const overIdx = procedureList.findIndex((p) => p.id === overId);
    if (curIdx === -1 || overIdx === -1) return;
    const reordered = [...procedureList];
    const [moved] = reordered.splice(curIdx, 1);
    reordered.splice(overIdx, 0, moved);
    await persistProcedures(reorderInCategory(procedures, activeCategory, reordered));
  }

  // --- 선택된 수술의 양식 ---
  const [template, setTemplate] = useState<ConsentTemplate | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ConsentTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [comments, setComments] = useState<ConsentComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  function loadTemplate(procedureId: string) {
    fetch(`/api/consent-templates?procedureId=${procedureId}`)
      .then((r) => r.json())
      .then((d: ConsentTemplate | null) => setTemplate(d ?? emptyTemplate(procedureId, activeProcedure?.name || "")))
      .catch(() => {});
  }

  function loadComments(procedureId: string) {
    fetch(`/api/consent-comments?procedureId=${procedureId}`)
      .then((r) => r.json())
      .then((d: ConsentComment[]) => {
        setComments(d);
        setCommentCounts((prev) => ({ ...prev, [procedureId]: d.length }));
        if (user) markProcedureSeen(user.id, procedureId, d.length);
      })
      .catch(() => {});
  }

  useEffect(() => {
    if (!user || !activeProcedureId) {
      setTemplate(null);
      setComments([]);
      return;
    }
    setEditing(false);
    loadTemplate(activeProcedureId);
    loadComments(activeProcedureId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeProcedureId]);

  function startEditing() {
    if (!template) return;
    setDraft({ ...template });
    setEditing(true);
  }

  async function saveTemplate() {
    if (!draft || !activeProcedureId) return;
    setSaving(true);
    await fetch("/api/consent-templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setTemplate({ ...draft, updatedAt: new Date().toISOString() });
    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 1500);
  }

  async function copyQuickText(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(id);
      setTimeout(() => setCopiedKey((k) => (k === id ? null : k)), 1500);
    } catch {
      alert("복사에 실패했습니다. 브라우저 클립보드 권한을 확인해주세요.");
    }
  }

  async function postComment() {
    if (!user || !activeProcedureId || !newComment.trim()) return;
    setPosting(true);
    await fetch("/api/consent-comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        procedureId: activeProcedureId,
        authorId: user.id,
        authorName: user.name,
        authorLevel: user.level,
        text: newComment.trim(),
      }),
    });
    setNewComment("");
    setPosting(false);
    loadComments(activeProcedureId);
  }

  async function deleteComment(id: string) {
    if (!activeProcedureId || !confirm("이 댓글을 삭제하시겠습니까?")) return;
    await fetch(`/api/consent-comments?procedureId=${activeProcedureId}&id=${id}`, { method: "DELETE" });
    loadComments(activeProcedureId);
  }

  if (loading || !user) return null;

  return (
    <div className="space-y-4 pb-20">
      <div>
        <h1 className="text-xl font-bold text-brand-700">📝 수술동의서 양식</h1>
        <p className="text-sm text-slate-500 mt-1">
          술 전 챙길 것, 동의서 설명 시 다룰 내용 등을 댓글로 남겨주시면 관리자가 확인 후 아래 내용에 반영합니다.
        </p>
      </div>

      {/* 분류 탭 */}
      <div className="flex items-center gap-2">
        {CONSENT_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setActiveCategory(c)}
            className={
              c === activeCategory
                ? "px-3 py-1.5 rounded-full bg-brand-700 text-white text-sm font-semibold"
                : "px-3 py-1.5 rounded-full border border-slate-300 text-sm text-slate-600 hover:bg-slate-50"
            }
          >
            {c}
          </button>
        ))}
      </div>

      {/* 해당 분류의 수술 목록 */}
      <div className="card !p-2 space-y-1">
        {user.isAdmin && procedureList.length > 1 && (
          <p className="text-[11px] text-slate-400 px-1">⠿ 를 끌어서, 또는 ▲▼로 순서를 바꿀 수 있어요.</p>
        )}
        {procedureList.map((p, idx) => (
          <div
            key={p.id}
            draggable={user.isAdmin && renamingId !== p.id}
            onDragStart={() => setDragId(p.id)}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragId && dragId !== p.id) setDragOverId(p.id);
            }}
            onDragLeave={() => setDragOverId((id) => (id === p.id ? null : id))}
            onDrop={() => handleDrop(p.id)}
            onDragEnd={() => {
              setDragId(null);
              setDragOverId(null);
            }}
            className={`group flex items-center gap-1.5 rounded-lg border px-2 py-1.5 transition ${
              p.id === activeProcedureId ? "bg-brand-50 border-brand-300" : "border-transparent hover:bg-slate-50"
            } ${dragOverId === p.id ? "border-brand-500 border-2" : ""}`}
          >
            {user.isAdmin && (
              <>
                <span className="cursor-grab text-slate-300 group-hover:text-slate-400 select-none px-0.5" title="드래그로 순서 변경">
                  ⠿
                </span>
                <div className="flex flex-col flex-shrink-0">
                  <button
                    type="button"
                    title="위로"
                    onClick={() => moveProcedure(p.id, "up")}
                    disabled={idx === 0}
                    className="leading-none text-[10px] px-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:hover:text-slate-400"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    title="아래로"
                    onClick={() => moveProcedure(p.id, "down")}
                    disabled={idx === procedureList.length - 1}
                    className="leading-none text-[10px] px-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:hover:text-slate-400"
                  >
                    ▼
                  </button>
                </div>
              </>
            )}
            {renamingId === p.id ? (
              <>
                <input
                  autoFocus
                  className="input !py-1 text-xs flex-1"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRename();
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                />
                <button type="button" onClick={saveRename} className="text-xs text-brand-600 hover:underline px-1 flex-shrink-0">
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => setRenamingId(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 px-1 flex-shrink-0"
                >
                  취소
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setActiveProcedureId(p.id)}
                  className={`flex-1 text-left text-sm py-0.5 ${p.id === activeProcedureId ? "font-semibold text-brand-700" : "text-slate-600"}`}
                >
                  {p.name}
                </button>
                {!!commentCounts[p.id] && (
                  <span
                    title={isProcedureUnread(user.id, p.id, commentCounts[p.id]) ? "새 댓글이 있습니다" : "댓글"}
                    className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      isProcedureUnread(user.id, p.id, commentCounts[p.id])
                        ? "bg-red-100 text-red-600 font-semibold"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    💬 {commentCounts[p.id]}
                  </span>
                )}
                {user.isAdmin && (
                  <button
                    type="button"
                    title="이름 수정"
                    onClick={() => startRenaming(p)}
                    className="opacity-0 group-hover:opacity-100 text-xs text-slate-400 hover:text-slate-700 px-1 flex-shrink-0"
                  >
                    ✏️
                  </button>
                )}
                {user.isAdmin && (
                  <button
                    type="button"
                    title="삭제"
                    onClick={() => deleteProcedure(p.id)}
                    className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-700 px-1 flex-shrink-0"
                  >
                    삭제
                  </button>
                )}
              </>
            )}
          </div>
        ))}
        {procedureList.length === 0 && !addingProcedure && (
          <p className="text-sm text-slate-400 px-1 py-1">이 분류에 등록된 동의서가 없습니다.</p>
        )}
        {user.isAdmin && !addingProcedure && (
          <button type="button" onClick={() => setAddingProcedure(true)} className="btn-outline !px-3 !py-1.5 text-xs">
            + 동의서 추가
          </button>
        )}
        {user.isAdmin && addingProcedure && (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              className="input !py-1 text-xs w-40"
              placeholder={`${activeCategory} 수술명`}
              value={newProcedureName}
              onChange={(e) => setNewProcedureName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addProcedure()}
            />
            <button type="button" onClick={addProcedure} className="btn !px-2 !py-1 text-xs" disabled={addingSubmitting}>
              추가
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingProcedure(false);
                setNewProcedureName("");
              }}
              className="btn-outline !px-2 !py-1 text-xs"
            >
              취소
            </button>
          </div>
        )}
      </div>

      {QUICK_COPY_TEXTS[activeCategory].length > 0 && (
        <section className="card space-y-2">
          <h2 className="font-bold text-slate-800 text-sm">🔖 자주 쓰는 문구 복사</h2>
          <p className="text-xs text-slate-400">클릭하면 아래 문구가 클립보드에 복사됩니다. 동의서 작성 중 원하는 곳에 붙여넣으세요.</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_COPY_TEXTS[activeCategory].map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => copyQuickText(q.id, q.text)}
                className={
                  copiedKey === q.id
                    ? "px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-semibold"
                    : "px-3 py-1.5 rounded-full border border-slate-300 text-xs text-slate-600 hover:bg-slate-50"
                }
              >
                {copiedKey === q.id ? "복사되었습니다" : q.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {activeProcedure && template && (
        <>
          <section className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800">
                {activeProcedure.name}
                {template.procedureNameKo ? ` (${template.procedureNameKo})` : ""} 수술동의서 양식
              </h2>
              {user.isAdmin && !editing && (
                <button type="button" onClick={startEditing} className="btn-outline !px-3 !py-1 text-xs">
                  ✏️ 편집
                </button>
              )}
            </div>

            {editing && draft ? (
              <>
                <div className="space-y-1">
                  <label className="label">수술명 (한글)</label>
                  <input
                    className="input text-sm"
                    placeholder="예: 갑상선절제술"
                    value={draft.procedureNameKo || ""}
                    onChange={(e) => setDraft({ ...draft, procedureNameKo: e.target.value })}
                  />
                </div>
                {SECTIONS.map((s) => (
                  <div key={s.key} className="space-y-1">
                    <label className="label">{s.title}</label>
                    <textarea
                      className="input min-h-[90px] text-xs"
                      placeholder="여기에 붙여넣으세요."
                      value={draft[s.key]}
                      onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })}
                    />
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-1">
                  <button type="button" onClick={saveTemplate} className="btn !px-3 !py-1 text-xs" disabled={saving}>
                    {saving ? "저장 중..." : "저장"}
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="btn-outline !px-3 !py-1 text-xs">
                    취소
                  </button>
                  {saved && <span className="text-xs text-emerald-600">저장됨</span>}
                </div>
              </>
            ) : (
              <div className="space-y-3">
                {SECTIONS.map((s) => (
                  <div key={s.key}>
                    <h3 className="text-sm font-semibold text-slate-700">{s.title}</h3>
                    {template[s.key] ? (
                      <p className="text-sm text-slate-700 whitespace-pre-wrap mt-0.5">{template[s.key]}</p>
                    ) : (
                      <p className="text-sm text-slate-400 mt-0.5">아직 작성된 내용이 없습니다.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {template.updatedAt && !editing && (
              <p className="text-[10px] text-slate-300">업데이트: {new Date(template.updatedAt).toLocaleString("ko-KR")}</p>
            )}
          </section>

          <section className="card space-y-3">
            <h2 className="font-bold text-slate-800">💬 댓글 ({comments.length})</h2>
            <p className="text-xs text-slate-400">술 전 챙길 것, 동의서에 포함하면 좋을 내용 등 자유롭게 남겨주세요.</p>

            <div className="flex items-start gap-2">
              <textarea
                className="input min-h-[60px] text-sm flex-1"
                placeholder="댓글을 입력하세요..."
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
              {comments.length === 0 && <p className="text-sm text-slate-400">아직 댓글이 없습니다.</p>}
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
        </>
      )}
    </div>
  );
}
