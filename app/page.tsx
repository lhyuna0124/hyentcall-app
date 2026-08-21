"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { findResident } from "@/lib/residents";

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) router.replace("/notify");
  }, [loading, user, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const r = findResident(name, phone);
    if (!r) {
      setError("이름 또는 전화번호 뒷자리가 일치하지 않습니다.");
      return;
    }
    login(r);
    router.replace("/notify");
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-b from-brand-50 to-white -m-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4 border-t-4 border-brand-600">
        <div className="text-center mb-2">
          <div className="text-3xl mb-1">🏥</div>
          <h1 className="text-lg font-bold text-brand-700">HY-ENT Workspace</h1>
          <p className="text-sm text-slate-500 mt-1">이름과 휴대폰 뒷 4자리로 로그인하세요.</p>
        </div>
        <div>
          <label className="label">이름</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 홍성만" />
        </div>
        <div>
          <label className="label">휴대폰 뒷 4자리</label>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0000"
            maxLength={4}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="btn w-full">
          로그인
        </button>
        <p className="text-xs text-slate-400 text-center">
          계정 목록은 관리자가 lib/residents.ts 에서 관리합니다.
        </p>
      </form>
    </div>
  );
}
