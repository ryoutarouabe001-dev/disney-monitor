import { NextResponse } from "next/server";
import {
  parseAvailabilityFromHtmlWithAnchor,
  type AvailabilitySignal,
} from "@/lib/checker";

export const runtime = "nodejs";
/**
 * Vercel Hobby は実質 ~10 秒で関数が終了する。Pro ではダッシュボードの「最大延長」に合わせて値を上げられる。
 * @see https://vercel.com/docs/functions/limitations#max-duration
 */
export const maxDuration = 10;

/** Hobby 想定の処理バジェット（ミリ秒）。Pro / Docker では環境変数で伸長。 */
const DEFAULT_VERCEL_BUDGET_MS = 9_000;
const MAX_ENV_BUDGET_MS = 780_000;

function resolveCheckBudgetMs(): number {
  const raw = process.env.CHECK_BUDGET_MS?.trim();
  if (raw && /^\d+$/.test(raw)) {
    return Math.min(Number(raw), MAX_ENV_BUDGET_MS);
  }
  if (process.env.VERCEL === "1") {
    return DEFAULT_VERCEL_BUDGET_MS;
  }
  /** ローカル・自前ホストでは公式の遅延に余裕を持たせる */
  return 115_000;
}

type TimeBudget = {
  remainingMs: () => number;
  /** 次の1回の fetch に割り当てるタイムアウト（残りが少なければ短くする） */
  allocateFetchMs: (preferMs: number, reserveTailMs?: number) => number;
};

function createBudget(): TimeBudget {
  const endAt = Date.now() + resolveCheckBudgetMs();
  return {
    remainingMs: () => Math.max(0, endAt - Date.now()),
    allocateFetchMs: (preferMs, reserveTailMs = 350) =>
      Math.max(0, Math.min(preferMs, endAt - Date.now() - reserveTailMs)),
  };
}

const FIRST_HOP_PREFER_MS = 8_000;
const FIRST_HOP_RETRY_PREFER_MS = 6_500;
const FOLLOW_HOP_PREFER_MS = 4_500;
const FIRST_FETCH_RETRIES = 2;
const FOLLOW_FETCH_RETRIES = 1;
const MIN_FETCH_SLICE_MS = 1_100;

type Body = {
  url?: string;
};

async function fetchHtml(
  url: string,
  cookieEnabled: boolean,
  budget: TimeBudget,
  opts: { isFirstHop: boolean }
): Promise<{ html: string; httpStatus: number; budgetCutShort?: boolean }> {
  const maxAttempts = opts.isFirstHop
    ? FIRST_FETCH_RETRIES
    : FOLLOW_FETCH_RETRIES;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 400));
    }

    const prefer =
      attempt === 0
        ? opts.isFirstHop
          ? FIRST_HOP_PREFER_MS
          : FOLLOW_HOP_PREFER_MS
        : FIRST_HOP_RETRY_PREFER_MS;

    const timeoutMs = budget.allocateFetchMs(prefer);
    if (timeoutMs < MIN_FETCH_SLICE_MS) {
      return { html: "", httpStatus: 0, budgetCutShort: true };
    }

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        signal: ac.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 MagicVacancy/1.0",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ja,en;q=0.8",
          ...(cookieEnabled ? { Cookie: "cookietest=1" } : {}),
        },
        redirect: "follow",
        cache: "no-store",
      });
      if (!res.ok) return { html: "", httpStatus: res.status };
      const html = await res.text();
      return { html, httpStatus: res.status };
    } catch (e) {
      lastError = e;
      const aborted = e instanceof Error && e.name === "AbortError";
      if (
        aborted &&
        attempt < maxAttempts - 1 &&
        opts.isFirstHop &&
        budget.allocateFetchMs(FIRST_HOP_RETRY_PREFER_MS) >= MIN_FETCH_SLICE_MS
      ) {
        continue;
      }
      throw e;
    } finally {
      clearTimeout(t);
    }
  }

  throw lastError;
}

function detectReservationInputError(html: string): boolean {
  return (
    html.includes("お子様の情報の入力内容が正しくありません") ||
    html.includes("小人年齢の入力内容が正しくありません") ||
    html.includes("小人年齢")
  );
}

function extractRedirectTargetFromGateHtml(html: string): string | null {
  // cookie/待ちゲートのJS内にある遷移先を手動で辿る
  // 例: document.location.href = decodeURIComponent('%2F%3Fc%3D...%26t%3Dhttps%253A%252F%252Freserve...');
  const m = html.match(
    /document\.location\.href\s*=\s*decodeURIComponent\((['"])(.+?)\1\)/m
  );
  if (!m) return null;
  const encoded = m[2];
  let decoded: string;
  try {
    decoded = decodeURIComponent(encoded);
  } catch {
    return null;
  }
  // decoded が "/? ... &t=<realUrlEncoded>" のような形式なら t を辿る
  try {
    const asUrl = decoded.startsWith("http")
      ? new URL(decoded)
      : new URL(decoded, "https://reserve.tokyodisneyresort.jp");
    const t = asUrl.searchParams.get("t");
    if (t) {
      // t はさらに URLエンコードされた値
      return decodeURIComponent(t);
    }
  } catch {
    // ignore
  }
  return decoded;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url || !url.startsWith("https://reserve.tokyodisneyresort.jp/")) {
    return NextResponse.json(
      { error: "Valid TDR reserve URL required" },
      { status: 400 }
    );
  }

  try {
    const u = new URL(url);
    const searchHotelCD = u.searchParams.get("searchHotelCD") ?? undefined;

    let currentUrl = url;
    let cookieEnabled = false;
    let status: AvailabilitySignal = "unknown";
    let invalidChildInfo = false;
    let lastReason: string | undefined;

    const steps: Array<{
      size: number;
      cookie: boolean;
      queue: boolean;
      parsed: AvailabilitySignal;
      url: string;
    }> = [];

    const budget = createBudget();
    let budgetCutShort = false;

    const MAX_DEPTH = 4;
    for (let depth = 0; depth < MAX_DEPTH; depth++) {
      const r = await fetchHtml(currentUrl, cookieEnabled, budget, {
        isFirstHop: depth === 0,
      });
      if (r.budgetCutShort) {
        budgetCutShort = true;
        lastReason = "platform-limit";
        break;
      }
      if (!r.html) break;

      const html = r.html;
      invalidChildInfo = detectReservationInputError(html);

      const queueDetected =
        html.includes("queue-it") ||
        html.includes("queueit") ||
        html.includes("待ち時間") ||
        html.includes("オンライン予約");

      const parsed = invalidChildInfo
        ? "unknown"
        : parseAvailabilityFromHtmlWithAnchor(html, searchHotelCD);
      status = parsed;

      steps.push({
        size: html.length,
        cookie: cookieEnabled,
        queue: queueDetected,
        parsed,
        url: currentUrl,
      });

      if (invalidChildInfo) {
        lastReason = "invalid-child-info";
        break;
      }

      if (parsed !== "unknown") {
        lastReason = queueDetected ? "queue-it" : undefined;
        break;
      }

      // JS gate の遷移先を辿る（何段階かあるため、何回か追従）
      const target = extractRedirectTargetFromGateHtml(html);
      if (target) {
        currentUrl = target;
        cookieEnabled = true;
        continue;
      }

      // queue が出ているなら cookieEnabled を有効化して再試行
      if (queueDetected) {
        cookieEnabled = true;
        continue;
      }

      break;
    }

    if (!invalidChildInfo && status === "unknown") {
      if (budgetCutShort) {
        lastReason = "platform-limit";
      } else {
        const anyQueue = steps.some((s) => s.queue);
        lastReason = anyQueue ? "queue-it" : "parse-unknown";
      }
    }

    return NextResponse.json({
      status,
      checkedAt: new Date().toISOString(),
      reason: lastReason,
      debug: {
        searchHotelCD,
        steps,
      },
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return NextResponse.json(
      {
        status: "unknown" as const,
        message: aborted ? "タイムアウトしました" : "チェックエラー",
        reason: aborted ? "timeout" : "check-error",
        checkedAt: new Date().toISOString(),
        debug: { steps: [] },
      },
      { status: 200 }
    );
  }
}
