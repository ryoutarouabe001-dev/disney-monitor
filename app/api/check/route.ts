import { NextResponse } from "next/server";
import { parseAvailabilityFromHtml } from "@/lib/checker";

export const runtime = "edge";

const FETCH_TIMEOUT_MS = 15_000;

type Body = {
  url?: string;
};

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
      },
      redirect: "follow",
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          status: "unknown" as const,
          httpStatus: res.status,
          message: "取得に失敗しました",
        },
        { status: 200 }
      );
    }

    const html = await res.text();
    const status = parseAvailabilityFromHtml(html);

    return NextResponse.json({
      status,
      checkedAt: new Date().toISOString(),
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
  } finally {
    clearTimeout(t);
  }
}
