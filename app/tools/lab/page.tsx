"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { LabIdeaComment } from "@/lib/types";

const PAMPHLET_IDEAS = [
  {
    title: "수술 전 연하훈련",
    desc: "원발종양 위치에 따라 멘델슨 기법, effortful swallowing 등 다양한 훈련 중 선택해서 팜플렛 제작",
  },
  { title: "술 후 음성훈련 방법 설명", desc: "수술 후 음성 재활을 위한 훈련법 안내" },
];

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
      <div>
        <h1 className="text-xl font-bold text-brand-700">🧪 실험실</h1>
        <p className="text-sm text-slate-500 mt-1">
          곧 추가될 기능을 미리 구상해보는 공간입니다. 다음 목표는 <b>환자 설명 팜플렛 제작</b>이에요.
        </p>
      </div>

      <section className="card space-y-3">
        <h2 className="font-bold text-slate-800">📋 만들어볼 팜플렛</h2>
        <div className="space-y-2">
          {PAMPHLET_IDEAS.map((idea) => (
            <div key={idea.title} className="p-3 rounded-lg border border-slate-200">
              <p className="text-sm font-semibold text-slate-700">{idea.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{idea.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold text-slate-800">💬 의견 남기기 ({comments.length})</h2>
        <p className="text-xs text-slate-400">추가로 필요한 팜플렛이나 우선순위, 원하는 형식 등 자유롭게 남겨주세요.</p>

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
