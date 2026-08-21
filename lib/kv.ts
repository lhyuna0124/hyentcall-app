// Upstash에서 직접 만든 무료 Redis 데이터베이스를 사용합니다 (Vercel Marketplace/카드 등록 불필요).
//
// 사용 방법:
// 1) https://console.upstash.com 에서 무료 가입 후 Redis 데이터베이스 생성 (Free 티어 선택)
// 2) 생성된 DB의 "REST API" 섹션에서 UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN 값을 복사
// 3) Vercel 프로젝트 -> Settings -> Environment Variables 에 위 두 값을 이름 그대로 추가
// 4) Redeploy
//
// 두 환경변수가 없으면(로컬 개발 등) 메모리 저장소로 자동 대체됩니다.
// (메모리 저장소는 서버 재시작/재배포 시 초기화됩니다.)

type Store = Map<string, string>;
const globalAny = global as any;
if (!globalAny.__memStore) {
  globalAny.__memStore = new Map() as Store;
}
const memStore: Store = globalAny.__memStore;

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const hasUpstash = !!UPSTASH_URL && !!UPSTASH_TOKEN;

async function getRedisClient() {
  const { Redis } = await import("@upstash/redis");
  return new Redis({ url: UPSTASH_URL!, token: UPSTASH_TOKEN! });
}

export async function kvGet<T>(key: string): Promise<T | null> {
  if (hasUpstash) {
    const redis = await getRedisClient();
    const v = await redis.get<T>(key);
    return (v as T) ?? null;
  }
  const raw = memStore.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  if (hasUpstash) {
    const redis = await getRedisClient();
    await redis.set(key, value as any);
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
