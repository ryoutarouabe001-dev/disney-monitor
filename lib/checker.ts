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
  const normalized = html.replace(/\s+/g, " ");

  const unavailableHits = UNAVAILABLE_MARKERS.filter((m) =>
    normalized.includes(m)
  ).length;

  const availableHits = AVAILABLE_MARKERS.filter((m) =>
    normalized.includes(m)
  ).length;

  if (unavailableHits > 0 && availableHits === 0) {
    return "unavailable";
  }
  if (availableHits > 0 && unavailableHits === 0) {
    return "available";
  }
  if (availableHits > unavailableHits) {
    return "available";
  }
  if (unavailableHits > availableHits) {
    return "unavailable";
  }
  return "unknown";
}
