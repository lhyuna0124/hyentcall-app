"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { QuickLink } from "@/lib/types";

export default function QuickLinksSidebar() {
  const { user } = useAuth();
  const [links, setLinks] = useState<QuickLink[]>([]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/quicklinks")
      .then((r) => r.json())
      .then(setLinks)
      .catch(() => {});
  }, [user]);

  if (!user || links.length === 0) return null;

  return (
    <aside className="hidden 2xl:block fixed bottom-24 right-6 w-72 z-0">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
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
    </aside>
  );
}
