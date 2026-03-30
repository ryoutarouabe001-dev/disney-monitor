export type AvailabilitySignal = "available" | "unavailable" | "unknown";

const UNAVAILABLE_MARKERS = [
  "満室",
  "売り切れ",
  "受付を終了",
  "在庫なし",
  "予約できません",
  "お取り扱いしておりません",
];

const AVAILABLE_MARKERS = [
  "予約可能",
  "空き",
  "空室あり",
  "空きあり",
  "ご予約",
  "◯",
  "空室",
  "宿泊可能",
];

/**
 * Heuristic HTML parse — no DOM on Edge; string scan only.
 * TDR markup changes over time; extend marker lists in one place.
 */
export function parseAvailabilityFromHtml(html: string): AvailabilitySignal {
  return parseAvailabilityFromHtmlWithAnchor(html, undefined);
}

function sliceAroundAnchor(normalized: string, anchor?: string) {
  if (!anchor) return normalized;
  const idx = normalized.indexOf(anchor);
  if (idx < 0) return normalized;
  // 周辺だけ見て、テンプレート混入による誤判定を減らす
  return normalized.slice(idx, idx + 25000);
}

/**
 * @param anchor `searchHotelCD` など。ホテル固有領域付近だけ見て判定精度を上げる。
 */
export function parseAvailabilityFromHtmlWithAnchor(
  html: string,
  anchor?: string
): AvailabilitySignal {
  const normalized = html.replace(/\s+/g, " ");
  const scope = sliceAroundAnchor(normalized, anchor);

  const hasAvailable = AVAILABLE_MARKERS.some((m) => scope.includes(m));
  const hasUnavailable = UNAVAILABLE_MARKERS.some((m) => scope.includes(m));

  if (hasAvailable) return "available";
  if (hasUnavailable) return "unavailable";
  return "unknown";
}
