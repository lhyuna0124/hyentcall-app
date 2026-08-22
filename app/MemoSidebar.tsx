"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { MemoItem } from "@/lib/types";

export default function MemoSidebar() {
  const { user } = useAuth();
  const [items, setItems] = useState<MemoItem[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!user) return;
    fetch(`/api/memo?residentId=${user.id}`)
      .then((r) => r.json())
      .then(setItems)
      .catch(() => {});
  }, [user]);

  async function saveItems(next: MemoItem[]) {
    setItems(next);
    if (!user) return;
    await fetch("/api/memo", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ residentId: user.id, items: next }),
    });
  }

  function addItem() {
    if (!draft.trim()) return;
    saveItems([...items, { id: crypto.randomUUID(), text: draft.trim(), done: false }]);
    setDraft("");
  }

  function toggleItem(id: string) {
    saveItems(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  }

  function removeItem(id: string) {
    saveItems(items.filter((i) => i.id !== id));
  }

  if (!user) return null;

  return (
    <aside className="hidden 2xl:block fixed top-20 left-6 w-64 z-0">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">📝 내 메모</h3>
        <div className="flex gap-1.5 mb-2">
          <input
            className="input !py-1 text-xs flex-1"
            placeholder="할 일 추가"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addItem();
            }}
          />
          <button type="button" onClick={addItem} className="btn !py-1 !px-2 text-xs flex-shrink-0">
            추가
          </button>
        </div>
        <div className="space-y-1">
          {items.length === 0 && <p className="text-xs text-slate-400">할 일이나 메모를 자유롭게 남겨보세요.</p>}
          {items.map((i) => (
            <div key={i.id} className="flex items-center gap-2 group">
              <input type="checkbox" checked={i.done} onChange={() => toggleItem(i.id)} className="flex-shrink-0" />
              <span className={`text-sm flex-1 break-words ${i.done ? "line-through text-slate-400" : "text-slate-600"}`}>{i.text}</span>
              <button
                type="button"
                onClick={() => removeItem(i.id)}
                className="text-slate-300 hover:text-red-500 text-xs flex-shrink-0 opacity-0 group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
