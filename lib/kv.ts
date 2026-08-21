// Vercel KV(Redis)가 연결되어 있으면 그것을 사용하고,
// 로컬 개발 등 KV 환경변수가 없을 때는 메모리 저장소로 자동 대체합니다.
// (메모리 저장소는 서버 재시작/재배포 시 초기화되므로 실제 운영에는 반드시 Vercel KV를 연결하세요.
//  Vercel 대시보드 -> Storage -> Create Database -> KV 를 생성하면 KV_REST_API_URL, KV_REST_API_TOKEN 이
//  자동으로 프로젝트 환경변수에 추가됩니다.)

type Store = Map<string, string>;
const globalAny = global as any;
if (!globalAny.__memStore) {
  globalAny.__memStore = new Map() as Store;
}
const memStore: Store = globalAny.__memStore;

const hasKV = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;

async function getKvClient() {
  const { kv } = await import("@vercel/kv");
  return kv;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  if (hasKV) {
    const kv = await getKvClient();
    const v = await kv.get<T>(key);
    return v ?? null;
  }
  const raw = memStore.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  if (hasKV) {
    const kv = await getKvClient();
    await kv.set(key, value as any);
    return;
  }
  memStore.set(key, JSON.stringify(value));
}

// 리스트형 데이터 (알림 기록, 평가 기록 등) append 용
export async function kvListAppend<T>(listKey: string, item: T): Promise<void> {
  const current = (await kvGet<T[]>(listKey)) ?? [];
  current.push(item);
  await kvSet(listKey, current);
}

export async function kvListGet<T>(listKey: string): Promise<T[]> {
  return (await kvGet<T[]>(listKey)) ?? [];
}
