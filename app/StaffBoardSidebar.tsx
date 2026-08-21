"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

export default function StaffBoardSidebar() {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  useEffect(() => {
    if (!user) return;
    fetch("/api/board")
      .then((r) => r.json())
      .then((d) => {
        setContent(d.content || "");
        setUpdatedAt(d.updatedAt || "");
      })
      .catch(() => {});
  }, [user]);

  if (!user || !content.trim()) return null;

  return (
    <aside className="hidden 2xl:block fixed top-20 right-6 w-72 z-0">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-700">Staff 일정 / 공지</h3>
        </div>
        <pre className="whitespace-pre-wrap font-sans text-xs text-slate-600 leading-relaxed">{content}</pre>
        {updatedAt && (
          <p className="text-[10px] text-slate-300 mt-3">
            업데이트: {new Date(updatedAt).toLocaleString("ko-KR")}
          </p>
        )}
      </div>
    </aside>
  );
}
