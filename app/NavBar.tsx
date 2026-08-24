"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { hasAnyUnread } from "@/lib/consentSeen";

export default function NavBar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [hasUnreadConsentComments, setHasUnreadConsentComments] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch("/api/consent-comments/counts")
      .then((r) => r.json())
      .then((counts: Record<string, number>) => setHasUnreadConsentComments(hasAnyUnread(user.id, counts)))
      .catch(() => {});
  }, [user, pathname]);

  if (!user) return null;

  const tabs = [
    { href: "/notify", label: "응급 노티 작성", icon: "🚑" },
    { href: "/tools/chart-review", label: "차트리뷰 포맷", icon: "📋" },
    { href: "/tools/mdt", label: "다학제 정리", icon: "🧑‍⚕️" },
    { href: "/tools/us-report", label: "US Report", icon: "🩻" },
    { href: "/tools/resources", label: "자료실", icon: "📁" },
    { href: "/tools/lab", label: "실험실", icon: "🧪" },
    { href: "/stats", label: "통계", icon: "📊" },
    ...(user.isAdmin ? [{ href: "/admin", label: "관리자", icon: "⚙️" }] : []),
  ];

  return (
    <header className="sticky top-0 z-10 bg-gradient-to-r from-brand-800 via-brand-700 to-brand-600 shadow-md">
      <div className="w-full px-4 h-16 flex items-center gap-2 sm:gap-4 overflow-hidden">
        <span className="font-bold text-white whitespace-nowrap text-lg tracking-tight flex-shrink-0">
          <span className="sm:hidden">🏥</span>
          <span className="hidden sm:inline">🏥 HY-ENT Workspace</span>
        </span>
        <div className="flex-1 min-w-0 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] [touch-action:pan-x]">
          <nav className="flex items-center gap-1 text-sm whitespace-nowrap w-max">
            {tabs.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={
                  pathname === t.href
                    ? "relative flex items-center gap-1 px-3 py-1.5 rounded-full bg-white text-brand-700 font-semibold shadow-sm flex-shrink-0"
                    : "relative flex items-center gap-1 px-3 py-1.5 rounded-full text-blue-100 hover:bg-white/10 hover:text-white transition flex-shrink-0"
                }
              >
                <span>{t.icon}</span>
                {t.label}
                {t.href === "/tools/lab" && hasUnreadConsentComments && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500" title="새 댓글" />
                )}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 text-sm text-blue-100 whitespace-nowrap flex-shrink-0">
          <span className="hidden sm:inline">
            👤 {user.name} ({user.level})
          </span>
          <span className="sm:hidden">👤 {user.name}</span>
          <button onClick={logout} className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition">
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
