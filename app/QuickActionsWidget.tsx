"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { QuickLink } from "@/lib/types";

export default function QuickActionsWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch("/api/quicklinks")
      .then((r) => r.json())
      .then(setLinks)
      .catch(() => {});
  }, [user]);

  async function sendFeedback() {
    if (!user || !message.trim()) return;
    setSending(true);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        residentId: user.id,
        residentName: user.name,
        message: message.trim(),
      }),
    });
    setSending(false);
    setSent(true);
    setMessage("");
    setTimeout(() => setSent(false), 2500);
  }

  if (!user) return null;

  return (
    <div className="quick-actions-widget fixed bottom-5 right-5 z-40">
      {open && (
        <div className="mb-3 w-72 max-w-[calc(100vw-2.5rem)] bg-white rounded-xl shadow-lg border border-slate-200 p-4 space-y-4">
          {links.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">바로가기</h3>
              <div className="space-y-1.5">
                {links.map((l) => (
                  <a
                    key={l.id}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-brand-300 hover:bg-brand-50 transition"
                  >
                    <span>{l.label}</span>
                    <span className="text-xs text-brand-600">열기 →</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">관리자에게 건의하기</h3>
            <textarea
              className="input min-h-[80px] text-sm"
              placeholder="건의하실 내용을 적어주세요."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="btn !py-1.5 !px-3 text-sm"
                onClick={sendFeedback}
                disabled={sending || !message.trim()}
              >
                {sending ? "전송 중..." : "보내기"}
              </button>
              {sent && <span className="text-xs text-emerald-600">전달되었습니다.</span>}
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-12 h-12 rounded-full bg-brand-700 text-white shadow-lg flex items-center justify-center text-xl hover:bg-brand-800 transition"
        aria-label="바로가기 및 건의사항"
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
