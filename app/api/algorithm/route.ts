import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { DEFAULT_DIAGNOSES, DiagnosisRule } from "@/lib/triage";

const KEY = "algorithm_diagnoses";

export async function GET() {
  const saved = await kvGet<DiagnosisRule[]>(KEY);
  return NextResponse.json(saved ?? DEFAULT_DIAGNOSES);
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as DiagnosisRule[];
  await kvSet(KEY, body);
  return NextResponse.json({ ok: true });
}
