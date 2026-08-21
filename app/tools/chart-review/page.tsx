"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { formatChartReview } from "@/lib/chartReview";

export default function ChartReviewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  function convert() {
    const result = formatChartReview(input);
    setOutput(result);
    navigator.clipboard.writeText(result).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {}
    );
  }

  if (loading || !user) return null;

  return (
    <div className="space-y-4 pb-20">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">차트리뷰 포맷터</h1>
        <p className="text-sm text-slate-500 mt-1">
          EHR에서 Neck CT / Thyroid US / ANA / 혈액검사 결과를 그대로 복사해서 붙여넣으면, 환자번호·판독의·처방일 같은 불필요한 정보와 검사일시·단위를 제거하고 깔끔하게 정리해줍니다. 변환과 동시에 클립보드에 자동 복사됩니다.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="card space-y-2">
          <label className="label">입력 (원본 EHR 복사본)</label>
          <textarea
            className="input min-h-[420px] font-mono text-xs"
            placeholder="여기에 EHR에서 복사한 검사 결과를 그대로 붙여넣으세요"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
        <div className="card space-y-2">
          <div className="flex items-center justify-between">
            <label className="label mb-0">출력 (정리된 결과)</label>
            {copied && <span className="text-xs text-emerald-600">복사됨</span>}
          </div>
          <textarea className="input min-h-[420px] font-mono text-xs" value={output} readOnly />
        </div>
      </div>
      <button className="btn" onClick={convert} type="button">
        변환하기 (자동 복사)
      </button>
    </div>
  );
}
