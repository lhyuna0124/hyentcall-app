"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { RESOURCES } from "@/lib/resources";

export default function ResourcesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [activePdf, setActivePdf] = useState<{ url: string; title: string } | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof RESOURCES>();
    for (const r of RESOURCES) {
      const cat = r.category || "기타";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(r);
    }
    return Array.from(map.entries());
  }, []);

  if (loading || !user) return null;

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-xl font-bold text-brand-700">📁 자료실</h1>
        <p className="text-sm text-slate-500 mt-1">인계장(PDF), 수술 설명용 이미지 등을 바로 열어볼 수 있습니다.</p>
      </div>

      {RESOURCES.length === 0 && (
        <div className="card text-sm text-slate-500">
          아직 등록된 자료가 없습니다. <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">public/resources/</code> 폴더에 파일을 넣고{" "}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">lib/resources.ts</code>에 항목을 추가해주세요.
        </div>
      )}

      {grouped.map(([category, items]) => (
        <section key={category} className="card space-y-3">
          <h2 className="font-medium text-slate-700">{category}</h2>

          {/* PDF 목록 */}
          <div className="space-y-2">
            {items
              .filter((r) => r.type === "pdf")
              .map((r) => (
                <button
                  key={r.filename}
                  type="button"
                  onClick={() => setActivePdf({ url: `/resources/${r.filename}`, title: r.title })}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50 transition text-left"
                >
                  <span className="text-2xl">📄</span>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{r.title}</p>
                    {r.description && <p className="text-xs text-slate-400">{r.description}</p>}
                  </div>
                  <span className="ml-auto text-xs text-brand-600">바로 보기 →</span>
                </button>
              ))}
          </div>

          {/* 이미지 그리드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {items
              .filter((r) => r.type === "image")
              .map((r) => (
                <button
                  key={r.filename}
                  type="button"
                  onClick={() => setActiveImage(`/resources/${r.filename}`)}
                  className="text-left"
                >
                  <img
                    src={`/resources/${r.filename}`}
                    alt={r.title}
                    className="w-full aspect-video object-cover rounded-lg border border-slate-200 hover:border-brand-400 transition"
                  />
                  <p className="text-xs text-slate-500 mt-1 truncate">{r.title}</p>
                </button>
              ))}
          </div>
        </section>
      ))}

      {/* 이미지 크게보기 */}
      {activeImage && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6"
          onClick={() => setActiveImage(null)}
        >
          <img src={activeImage} alt="" className="max-w-full max-h-full rounded-lg shadow-2xl" />
        </div>
      )}

      {/* PDF 바로 보기 */}
      {activePdf && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl h-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 flex-shrink-0">
              <p className="text-sm font-medium text-slate-700 truncate">{activePdf.title}</p>
              <div className="flex items-center gap-3 flex-shrink-0">
                <a
                  href={activePdf.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-brand-600 hover:underline"
                >
                  새 창에서 열기
                </a>
                <button
                  type="button"
                  onClick={() => setActivePdf(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                  aria-label="닫기"
                >
                  ✕
                </button>
              </div>
            </div>
            <iframe src={activePdf.url} title={activePdf.title} className="flex-1 w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
