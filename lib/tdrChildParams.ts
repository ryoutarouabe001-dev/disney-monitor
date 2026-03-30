/**
 * 東京ディズニーリゾート公式予約の `childAgeBedInform` 組み立て。
 *
 * 観測例（英語サイトのURL）: `childAgeBedInform=01_3%7C05_3%7C`
 * → デコード後 `01_3|05_3|` … お子さま1人につき `{年齢等2桁}_{ベッド1桁}` を `|` で連結し、末尾にも `|` が付くことがある。
 *
 * 【重要】左2桁の「年齢等コード」は公式の内部区分で、6歳の「未就学/小学生」は別コードになる想定です。
 * ここは **開発者ツール → Network** で実際の予約検索時URLの `childAgeBedInform` を開き、
 * 該当する左2桁を `TDR_SIX_YEAR_AGE_CODE` に転記してください（未確定のままだと公式と不一致になり得ます）。
 */

export type SixYearTrack = "preschool" | "elementary";

/** 6歳の区分 → `childAgeBedInform` 左側2桁（要: 公式URLで確認・更新） */
export const TDR_SIX_YEAR_AGE_CODE: Record<SixYearTrack, string> = {
  /** 6歳・未就学（仮: `06` — ブラウザの実URLで要確認） */
  preschool: "06",
  /**
   * 6歳・小学生（仮: `26` — 7歳が `07` になる前提で衝突回避の仮置き）
   * 必ず公式サイトで実際に生成される2桁に差し替えてください。
   */
  elementary: "26",
};

/** ベッド利用の右1桁。公式の選択肢に合わせてキーを増やせます。 */
export const TDR_CHILD_BED_CODES = {
  /** ベッド利用（子ども用ベッドを使う・要確認） */
  withBed: "1",
  /** 添い寝（ベッドなし・要確認） */
  soine: "2",
  /** その他（英語サイト例では `3` が使われていたためデフォルト候補） */
  defaultExample: "3",
} as const;

export type TdrChildBedKey = keyof typeof TDR_CHILD_BED_CODES;

export type ChildGuestInput = {
  /** 年齢（0〜11: 通常は小学生以下の区分が中心） */
  ageYears: number;
  /** 6歳のとき必須：未就学 / 小学生 */
  sixTrack?: SixYearTrack;
  /** ベッドの扱い */
  bedKey: TdrChildBedKey;
};

function pad2(n: number): string {
  return String(Math.min(Math.max(n, 0), 99)).padStart(2, "0");
}

/**
 * 1人分の左2桁（年齢等コード）
 */
export function getTdrChildAgeCode(slot: ChildGuestInput): string {
  if (slot.ageYears === 6) {
    const t = slot.sixTrack ?? "preschool";
    const code = TDR_SIX_YEAR_AGE_CODE[t];
    return /^\d{2}$/.test(code) ? code : "06";
  }
  return pad2(slot.ageYears);
}

function getBedDigit(slot: ChildGuestInput): string {
  return String(TDR_CHILD_BED_CODES[slot.bedKey]);
}

/**
 * 公式が期待する `childAgeBedInform` 文字列（末尾 `|` 付き）
 */
export function buildChildAgeBedInform(slots: ChildGuestInput[]): string {
  if (slots.length === 0) return "";
  const parts = slots.map((s) => `${getTdrChildAgeCode(s)}_${getBedDigit(s)}`);
  return `${parts.join("|")}|`;
}

export function formatChildSummaryJa(slots: ChildGuestInput[]): string {
  if (slots.length === 0) return "";
  return slots
    .map((s, i) => {
      const agePart =
        s.ageYears === 6
          ? `${s.ageYears}歳（${s.sixTrack === "elementary" ? "小学生" : "未就学"}）`
          : `${s.ageYears}歳`;
      const bedPart =
        s.bedKey === "withBed"
          ? "ベッド利用"
          : s.bedKey === "soine"
            ? "添い寝"
            : "区分例(3)";
      return `${i + 1}人目:${agePart}・${bedPart}`;
    })
    .join(" / ");
}
