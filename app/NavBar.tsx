"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function NavBar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const tabs = [
    { href: "/notify", label: "응급 노티 작성" },
    { href: "/stats", label: "통계" },
    ...(user.isAdmin ? [{ href: "/admin", label: "관리자" }] : []),
  ];

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-slate-800">ENT 응급콜</span>
          <nav className="flex items-center gap-4 text-sm">
            {tabs.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={
                  pathname === t.href
                    ? "text-brand-600 font-medium"
                    : "text-slate-500 hover:text-slate-800"
                }
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span>
            {user.name} ({user.level})
          </span>
          <button onClick={logout} className="btn-outline !px-3 !py-1">
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
