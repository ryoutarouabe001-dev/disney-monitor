import { format } from "date-fns";

/**
 * Tokyo Disney Resort official hotel reservation (Japanese) — list/search entry.
 * Codes align with `searchHotelCD` used on the reserve site; update here when the site changes.
 */
export const DISNEY_HOTELS = [
  {
    id: "hma",
    name: "ディズニー・アンバサダー®ホテル",
    /** 英語予約画面では DAH が使われる例あり — 変更時は公式URLをブラウザで確認 */
    searchHotelCD: "DAH",
  },
  {
    id: "dhl",
    name: "東京ディズニーランド®ホテル",
    /** 公式予約の hotel-search で確認された例: searchHotelCD=DHM */
    searchHotelCD: "DHM",
  },
  {
    id: "mir",
    name: "東京ディズニーシー・ホテルミラコスタ®",
    searchHotelCD: "MIR",
  },
  {
    id: "tch",
    name: "東京ディズニーセレブレーションホテル®",
    searchHotelCD: "TCH",
  },
  {
    id: "tsh",
    name: "東京ディズニーリゾート・トイ・ストーリーホテル®",
    searchHotelCD: "TSH",
  },
  {
    id: "fsh",
    name: "東京ディズニーシー・ファンタジースプリングスホテル®",
    searchHotelCD: "FSH",
  },
] as const;

export type HotelId = (typeof DISNEY_HOTELS)[number]["id"];

export type BuildDisneyUrlParams = {
  hotelId: HotelId;
  /** Check-in date */
  date: Date;
  nights: number;
  guests: number;
  /** Reserved for future room-type deep links */
  roomType?: string;
};

const RESERVE_BASE =
  "https://reserve.tokyodisneyresort.jp/sp/hotel/list/";

/**
 * Builds a maintainable booking deep-link for vacancy monitoring.
 * Fragment after pathname may change — centralize tweaks in this module only.
 */
export function buildDisneyUrl(params: BuildDisneyUrlParams): string {
  const { hotelId, date, nights, guests, roomType } = params;
  const hotel = DISNEY_HOTELS.find((h) => h.id === hotelId);
  if (!hotel) {
    throw new Error(`Unknown hotel: ${hotelId}`);
  }

  const useDate = format(date, "yyyyMMdd");
  const stayingDays = Math.min(Math.max(nights, 1), 3);
  const adultNum = Math.min(Math.max(guests, 1), 4);

  const search = new URLSearchParams({
    displayType: "hotel-search",
    hotelSearchDetail: "true",
    reservationStatus: "1",
    useDate,
    stayingDays: String(stayingDays),
    adultNum: String(adultNum),
    searchHotelCD: hotel.searchHotelCD,
    childNum: "0",
    roomsNum: "1",
  });

  if (roomType?.trim()) {
    search.set("searchRoomName", roomType.trim());
  }

  return `${RESERVE_BASE}?${search.toString()}`;
}

export function getHotelLabel(id: string): string {
  return DISNEY_HOTELS.find((h) => h.id === id)?.name ?? id;
}
