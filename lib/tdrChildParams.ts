/**
 * 東京ディズニーリゾート公式予約の `childAgeBedInform` 組み立て。
 *
 * 観測例（今回いただいたURL）:
 * `childAgeBedInform=06U_1%7C01_3%7C`
 * → デコード後 `06U_1|01_3|`。
 *
 * 子ども1人につき、`{年齢区分}_{ベッド区分}` を `|` で連結し、末尾にも `|` が付く形式です。
 *
 * 【重要】左側（年齢区分コード）は「2桁だけ」とは限らず、6歳の未就学が `06U` のように
 * 文字を含むケースがあります。まずはあなたのURLに一致するように 6歳 と ベッド を定義します。
 */

export type SixYearTrack = "preschool" | "elementary";

/** 6歳の区分 → `childAgeBedInform` 左側2桁（要: 公式URLで確認・更新） */
export const TDR_SIX_YEAR_AGE_CODE: Record<SixYearTrack, string> = {
  /** 6歳・未就学（公式URL例: `06U`） */
  preschool: "06U",
  /** 6歳・小学生（未就学の `U` に対応して `E` を使う前提の仮置き。必要ならURLで合わせてください） */
  elementary: "06E",
};

/** ベッド利用の右1桁。公式の選択肢に合わせてキーを増やせます。 */
export const TDR_CHILD_BED_CODES = {
  /** ベッド利用（子ども用ベッドを使う・要確認） */
  withBed: "1",
  /** 添い寝（ベッドなし・要確認） */
  soine: "3",
  /** その他（調整用） */
  defaultExample: "2",
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
    return code;
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
            ? "添い寝（ベッドなし）"
            : "その他（区分コード2）";
      return `${i + 1}人目:${agePart}・${bedPart}`;
    })
    .join(" / ");
}
