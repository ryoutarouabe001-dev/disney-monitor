import { NextResponse } from "next/server";
import {
  parseAvailabilityFromHtml,
  parseAvailabilityFromHtmlWithAnchor,
  type AvailabilitySignal,
} from "@/lib/checker";

export const runtime = "nodejs";

const FETCH_TIMEOUT_MS = 15_000;

type Body = {
  url?: string;
};

async function fetchHtml(url: string, cookieEnabled: boolean) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: {
        "User-Agent":
          "MagicVacancy/1.0 (+https://magic-vacancy.local; availability check)",
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
  } finally {
    clearTimeout(t);
  }
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

    const MAX_DEPTH = 4;
    for (let depth = 0; depth < MAX_DEPTH; depth++) {
      const r = await fetchHtml(currentUrl, cookieEnabled);
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
      const anyQueue = steps.some((s) => s.queue);
      lastReason = anyQueue ? "queue-it" : "parse-unknown";
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
        debug: { steps: [] as never[] },
      },
      { status: 200 }
    );
  }
}
