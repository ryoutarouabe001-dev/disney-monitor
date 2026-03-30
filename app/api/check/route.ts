import { NextResponse } from "next/server";
import { parseAvailabilityFromHtml } from "@/lib/checker";

export const runtime = "edge";

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
    /document\.location\.href\s*=\s*decodeURIComponent\('([^']+)'\)/m
  );
  if (!m) return null;
  const encoded = m[1];
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
    // 1) 通常取得
    const r1 = await fetchHtml(url, false);
    if (!r1.html) {
      return NextResponse.json(
        {
          status: "unknown" as const,
          httpStatus: r1.httpStatus,
          message: "取得に失敗しました",
        },
        { status: 200 }
      );
    }

    const queueDetected1 =
      r1.html.includes("queue-it") ||
      r1.html.includes("queueit") ||
      r1.html.includes("待ち時間") ||
      r1.html.includes("オンライン予約");

    let html = r1.html;
    let status = parseAvailabilityFromHtml(html);

    // 2) Cookie/JS gate の場合は、HTML内の遷移先を辿って再取得
    const gateTarget = extractRedirectTargetFromGateHtml(html);
    if (gateTarget && (queueDetected1 || status === "unknown")) {
      const rGate = await fetchHtml(gateTarget, true);
      if (rGate.html) {
        html = rGate.html;
        status = parseAvailabilityFromHtml(html);
      }
    }

    // queue/待ち画面っぽい場合は cookietest cookie を付けて再取得（Playwright不要）
    if (queueDetected1 || status === "unknown") {
      const r2 = await fetchHtml(url, true);
      if (r2.html) {
        html = r2.html;
        status = parseAvailabilityFromHtml(html);
      }
    }

    const invalidChildInfo = detectReservationInputError(html);
    return NextResponse.json({
      status,
      checkedAt: new Date().toISOString(),
      reason: queueDetected1 ? "queue-it" : undefined,
      ...(invalidChildInfo ? { reason: "invalid-child-info" as const } : {}),
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return NextResponse.json(
      {
        status: "unknown" as const,
        message: aborted ? "タイムアウトしました" : "チェックエラー",
      },
      { status: 200 }
    );
  }
}
