"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { QuickLink, PersonalLink } from "@/lib/types";

export default function QuickLinksSidebar() {
  const { user } = useAuth();
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [personalLinks, setPersonalLinks] = useState<PersonalLink[]>([]);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch("/api/quicklinks")
      .then((r) => r.json())
      .then(setLinks)
      .catch(() => {});
    fetch(`/api/personal-links?residentId=${user.id}`)
      .then((r) => r.json())
      .then(setPersonalLinks)
      .catch(() => {});
  }, [user]);

  async function savePersonalLinks(next: PersonalLink[]) {
    setPersonalLinks(next);
    if (!user) return;
    await fetch("/api/personal-links", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ residentId: user.id, links: next }),
    });
  }

  function addPersonalLink() {
    savePersonalLinks([...personalLinks, { id: crypto.randomUUID(), label: "", url: "" }]);
  }

  function updatePersonalLink(id: string, patch: Partial<PersonalLink>) {
    setPersonalLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removePersonalLink(id: string) {
    savePersonalLinks(personalLinks.filter((l) => l.id !== id));
  }

  function finishEditing() {
    savePersonalLinks(personalLinks.filter((l) => l.label.trim() && l.url.trim()));
    setEditing(false);
  }

  if (!user) return null;

  return (
    <aside className="hidden 2xl:block fixed bottom-24 right-6 w-72 z-0">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
        {links.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">바로가기</h3>
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

        <div className={links.length > 0 ? "border-t border-slate-100 pt-3" : ""}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-700">내 바로가기</h3>
            <button
              type="button"
              onClick={() => (editing ? finishEditing() : setEditing(true))}
              className="text-xs text-brand-600 hover:underline"
            >
              {editing ? "완료" : "편집"}
            </button>
          </div>

          {!editing && (
            <div className="space-y-1.5">
              {personalLinks.length === 0 && <p className="text-xs text-slate-400">편집을 눌러 자주 쓰는 링크를 추가하세요.</p>}
              {personalLinks.map((l) => (
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
          )}

          {editing && (
            <div className="space-y-2">
              {personalLinks.map((l) => (
                <div key={l.id} className="flex items-center gap-1">
                  <input
                    className="input !py-1 text-xs flex-1"
                    placeholder="이름"
                    value={l.label}
                    onChange={(e) => updatePersonalLink(l.id, { label: e.target.value })}
                  />
                  <input
                    className="input !py-1 text-xs flex-1"
                    placeholder="https://..."
                    value={l.url}
                    onChange={(e) => updatePersonalLink(l.id, { url: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => removePersonalLink(l.id)}
                    className="text-red-400 hover:text-red-600 text-xs flex-shrink-0"
                  >
                    삭제
                  </button>
                </div>
              ))}
              <button type="button" onClick={addPersonalLink} className="btn-outline !py-1 !px-2 text-xs w-full">
                + 링크 추가
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
