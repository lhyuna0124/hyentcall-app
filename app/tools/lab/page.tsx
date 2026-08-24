"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { CONSENT_PROCEDURES } from "@/lib/consentProcedures";
import { ConsentComment, ConsentTemplate } from "@/lib/types";

export default function LabPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  const [procedureId, setProcedureId] = useState(CONSENT_PROCEDURES[0].id);
  const procedure = CONSENT_PROCEDURES.find((p) => p.id === procedureId)!;

  const [content, setContent] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [comments, setComments] = useState<ConsentComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  function loadTemplate() {
    fetch(`/api/consent-templates?procedureId=${procedureId}`)
      .then((r) => r.json())
      .then((d: ConsentTemplate | null) => {
        setContent(d?.content || "");
        setUpdatedAt(d?.updatedAt || "");
      })
      .catch(() => {});
  }

  function loadComments() {
    fetch(`/api/consent-comments?procedureId=${procedureId}`)
      .then((r) => r.json())
      .then((d: ConsentComment[]) => setComments(d))
      .catch(() => {});
  }

  useEffect(() => {
    if (!user) return;
    setEditing(false);
    loadTemplate();
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, procedureId]);

  async function saveTemplate() {
    if (!user) return;
    setSaving(true);
    await fetch("/api/consent-templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ procedureId, procedureName: procedure.name, content: draft }),
    });
    setContent(draft);
    setUpdatedAt(new Date().toISOString());
    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 1500);
  }

  async function postComment() {
    if (!user || !newComment.trim()) return;
    setPosting(true);
    await fetch("/api/consent-comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        procedureId,
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
    await fetch(`/api/consent-comments?procedureId=${procedureId}&id=${id}`, { method: "DELETE" });
    loadComments();
  }

  if (loading || !user) return null;

  return (
    <div className="space-y-4 pb-20">
      <div>
        <h1 className="text-xl font-bold text-brand-700">🧪 실험실</h1>
        <p className="text-sm text-slate-500 mt-1">
          곧 추가될 기능을 미리 테스트해보는 공간입니다. 지금은 <b>수술동의서 와꾸</b>를 시험 중이에요 — 술 전 챙길 것,
          동의서 설명 시 다룰 내용 등을 댓글로 남겨주시면 관리자가 확인 후 아래 내용에 반영합니다.
        </p>
      </div>

      <div className="flex items-center gap-2">
        {CONSENT_PROCEDURES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setProcedureId(p.id)}
            className={
              p.id === procedureId
                ? "px-3 py-1.5 rounded-full bg-brand-600 text-white text-sm font-semibold"
                : "px-3 py-1.5 rounded-full border border-slate-300 text-sm text-slate-600 hover:bg-slate-50"
            }
          >
            {p.name}
          </button>
        ))}
      </div>

      <section className="card space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-800">{procedure.name} 수술동의서 와꾸</h2>
          {user.isAdmin && !editing && (
            <button
              type="button"
              onClick={() => {
                setDraft(content);
                setEditing(true);
              }}
              className="btn-outline !px-3 !py-1 text-xs"
            >
              ✏️ 편집
            </button>
          )}
        </div>

        {editing ? (
          <>
            <textarea
              className="input min-h-[280px] font-mono text-xs"
              placeholder="자유롭게 와꾸 내용을 작성하세요."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <button type="button" onClick={saveTemplate} className="btn !px-3 !py-1 text-xs" disabled={saving}>
                {saving ? "저장 중..." : "저장"}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="btn-outline !px-3 !py-1 text-xs">
                취소
              </button>
              {saved && <span className="text-xs text-emerald-600">저장됨</span>}
            </div>
          </>
        ) : content ? (
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{content}</p>
        ) : (
          <p className="text-sm text-slate-400">
            아직 작성된 내용이 없습니다{user.isAdmin ? '. "편집" 버튼을 눌러 작성해보세요.' : "."}
          </p>
        )}
        {updatedAt && !editing && (
          <p className="text-[10px] text-slate-300">업데이트: {new Date(updatedAt).toLocaleString("ko-KR")}</p>
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
    </div>
  );
}
