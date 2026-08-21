"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function NavBar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const tabs = [
    { href: "/notify", label: "응급 노티 작성", icon: "🚑" },
    { href: "/tools/chart-review", label: "차트리뷰 포맷", icon: "📋" },
    { href: "/tools/mdt", label: "다학제 정리", icon: "🧑‍⚕️" },
    { href: "/tools/us-report", label: "US Report", icon: "🩻" },
    { href: "/tools/resources", label: "자료실", icon: "📁" },
    { href: "/stats", label: "통계", icon: "📊" },
    ...(user.isAdmin ? [{ href: "/admin", label: "관리자", icon: "⚙️" }] : []),
  ];

  return (
    <header className="sticky top-0 z-10 bg-gradient-to-r from-brand-800 via-brand-700 to-brand-600 shadow-md">
      <div className="w-full px-4 h-16 flex items-center gap-4">
        <span className="font-bold text-white whitespace-nowrap text-lg tracking-tight flex-shrink-0">🏥 HY-ENT Workspace</span>
        <nav className="flex items-center gap-1 text-sm whitespace-nowrap overflow-x-auto flex-1 min-w-0">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={
                pathname === t.href
                  ? "flex items-center gap-1 px-3 py-1.5 rounded-full bg-white text-brand-700 font-semibold shadow-sm flex-shrink-0"
                  : "flex items-center gap-1 px-3 py-1.5 rounded-full text-blue-100 hover:bg-white/10 hover:text-white transition flex-shrink-0"
              }
            >
              <span>{t.icon}</span>
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm text-blue-100 whitespace-nowrap flex-shrink-0">
          <span>
            👤 {user.name} ({user.level})
          </span>
          <button onClick={logout} className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition">
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
