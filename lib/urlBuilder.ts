import { format } from "date-fns";
import {
  buildChildAgeBedInform,
  TDR_CHILD_BED_CODES,
  type ChildGuestInput,
} from "@/lib/tdrChildParams";

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
  /** 子どもの人数（0〜4） */
  childGuests?: number;
  /**
   * 子どもは人数ぶんスロットを渡す（年齢・6歳区分・ベッド）。
   * `childAgeBedInform` は `lib/tdrChildParams.ts` で組み立て。
   */
  childSlots?: ChildGuestInput[];
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
  const {
    hotelId,
    date,
    nights,
    guests,
    childGuests,
    childSlots,
    roomType,
  } = params;
  const hotel = DISNEY_HOTELS.find((h) => h.id === hotelId);
  if (!hotel) {
    throw new Error(`Unknown hotel: ${hotelId}`);
  }

  const useDate = format(date, "yyyyMMdd");
  const stayingDays = Math.min(Math.max(nights, 1), 3);
  const adultNum = Math.min(Math.max(guests, 1), 4);
  const childNum = Math.min(Math.max(childGuests ?? 0, 0), 4);

  const search = new URLSearchParams({
    // 公式URLの実例に合わせる（空き判定のHTMLが変わるため）
    displayType: "data-hotel",
    hotelSearchDetail: "true",
    reservationStatus: "1",
    useDate,
    stayingDays: String(stayingDays),
    adultNum: String(adultNum),
    searchHotelCD: hotel.searchHotelCD,
    childNum: String(childNum),
    detailOpenFlg: "0",
    hotelChangeFlg: "false",
    removeSessionFlg: "true",
    returnFlg: "false",
    showWay: "",
    cpListStr: "",
    searchHotelDiv: "",
    hotelName: "",
    searchHotelName: "",
    searchLayer: "",
    searchRoomName: "",
    checkPointStr: "",
    hotelShowFlg: "",
    roomsNum: "1",
  });

  if (childNum > 0) {
    const slots = (childSlots ?? []).slice(0, childNum);
    const inform = buildChildAgeBedInform(slots);
    if (inform) {
      search.set("childAgeBedInform", inform);
    }
    // 公式URLの観測例に合わせて bed_1.. を付与（childAgeBedInform と合わせる）
    // 例: bed_1=3 (添い寝), bed_2=1 (ベッドあり)
    slots.forEach((s, idx) => {
      const key = `bed_${idx + 1}`;
      const bedDigit = TDR_CHILD_BED_CODES[s.bedKey] ?? TDR_CHILD_BED_CODES.soine;
      search.set(key, bedDigit);
    });
  }

  if (roomType?.trim()) {
    search.set("searchRoomName", roomType.trim());
  }

  return `${RESERVE_BASE}?${search.toString()}`;
}

export function getHotelLabel(id: string): string {
  return DISNEY_HOTELS.find((h) => h.id === id)?.name ?? id;
}

export type { ChildGuestInput } from "@/lib/tdrChildParams";
