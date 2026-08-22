"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

export default function MemoSidebar() {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/memo?residentId=${user.id}`)
      .then((r) => r.json())
      .then((d) => {
        setContent(d.content || "");
        setUpdatedAt(d.updatedAt || "");
      })
      .catch(() => {});
  }, [user]);

  async function save() {
    if (!user) return;
    setSaving(true);
    await fetch("/api/memo", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ residentId: user.id, content }),
    });
    setUpdatedAt(new Date().toISOString());
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  if (!user) return null;

  return (
    <aside className="hidden 2xl:block fixed top-20 left-6 w-72 z-0">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">📝 내 메모</h3>
        <textarea
          className="input min-h-[240px] font-mono text-xs"
          placeholder="자유롭게 메모하세요."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex items-center gap-2 mt-2">
          <button type="button" onClick={save} className="btn !py-1 !px-3 text-xs" disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </button>
          {saved && <span className="text-xs text-emerald-600">저장됨</span>}
        </div>
        {updatedAt && (
          <p className="text-[10px] text-slate-300 mt-2">업데이트: {new Date(updatedAt).toLocaleString("ko-KR")}</p>
        )}
      </div>
    </aside>
  );
}
