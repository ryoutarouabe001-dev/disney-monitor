"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { motion } from "framer-motion";
import { CalendarIcon, Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import {
  DISNEY_HOTELS,
  type HotelId,
  getHotelLabel,
  buildDisneyUrl,
} from "@/lib/urlBuilder";
import {
  formatChildSummaryJa,
  buildChildAgeBedInform,
  type ChildGuestInput,
  type SixYearTrack,
  type TdrChildBedKey,
} from "@/lib/tdrChildParams";
import { useMonitorStore } from "@/store/monitorStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { SpeedMode } from "@/components/SpeedMode";
import { FakeActivity } from "@/components/FakeActivity";

function defaultChildSlot(): ChildGuestInput {
  return { ageYears: 5, bedKey: "soine", sixTrack: undefined };
}

export function MonitorForm() {
  const addMonitor = useMonitorStore((s) => s.addMonitor);
  const canAdd = useMonitorStore((s) => s.canAddMonitor());
  const [hotelMode, setHotelMode] = useState<"single" | "all">("single");

  const [hotelId, setHotelId] = useState<HotelId>(DISNEY_HOTELS[0].id);
  const [date, setDate] = useState<Date | undefined>(
    () => new Date(Date.now() + 86400000 * 30)
  );
  const [nights, setNights] = useState("1");
  const [guests, setGuests] = useState("2");
  const [childGuests, setChildGuests] = useState("0");
  const [childSlots, setChildSlots] = useState<ChildGuestInput[]>([]);
  const [advanced, setAdvanced] = useState(false);
  const [roomType, setRoomType] = useState("");
  const [notifyLine, setNotifyLine] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const disabledAdd = useMemo(() => !canAdd, [canAdd]);

  const previewUrl = useMemo(() => {
    if (!date) return null;
    try {
      const targetHotelId = hotelMode === "all" ? DISNEY_HOTELS[0].id : hotelId;
      return buildDisneyUrl({
        hotelId: targetHotelId,
        date,
        nights: Number(nights),
        guests: Number(guests),
        childGuests: Number(childGuests),
        childSlots: childSlots.slice(0, Number(childGuests)),
        roomType: roomType.trim() || undefined,
      });
    } catch {
      return null;
    }
  }, [
    date,
    hotelId,
    hotelMode,
    nights,
    guests,
    childGuests,
    childSlots,
    roomType,
  ]);

  const debugChildAgeBedInform = useMemo(() => {
    const cn = Math.min(Math.max(Number(childGuests), 0), 4);
    if (cn <= 0) return "";
    try {
      return buildChildAgeBedInform(childSlots.slice(0, cn));
    } catch {
      return "";
    }
  }, [childGuests, childSlots]);

  useEffect(() => {
    const n = Math.min(Math.max(Number(childGuests), 0), 4);
    setChildSlots((prev) => {
      const next = [...prev];
      while (next.length < n) next.push(defaultChildSlot());
      return next.slice(0, n);
    });
  }, [childGuests]);

  const onSubmit = async () => {
    if (!date) {
      toast.error("宿泊日を選んでください");
      return;
    }
    if (notifyEmail && !email.trim()) {
      toast.error("メール通知の場合はアドレスを入力してください");
      return;
    }
    const cn = Math.min(Math.max(Number(childGuests), 0), 4);
    if (cn > 0) {
      for (let i = 0; i < cn; i++) {
        const s = childSlots[i];
        if (!s) {
          toast.error(`子ども${i + 1}の情報を入力してください`);
          return;
        }
        if (s.ageYears === 6 && !s.sixTrack) {
          toast.error(`子ども${i + 1}は6歳のため「未就学」か「小学生」を選んでください`);
          return;
        }
        if (s.ageYears !== 6 && s.sixTrack) {
          toast.error(`子ども${i + 1}: 未就学/小学生の区分は6歳のときだけ選べます`);
          return;
        }
      }
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 280));

    const baseInput = {
      checkInDate: date,
      nights: Number(nights),
      guests: Number(guests),
      childGuests: Number(childGuests),
      childSlots: childSlots.slice(0, cn),
      roomType: roomType.trim() || undefined,
      notifyLine,
      notifyEmail,
      notifyEmailAddress: notifyEmail ? email.trim() : undefined,
    };

    let lastResult: { ok: true } | { ok: false; reason: string } | undefined;

    if (hotelMode === "all") {
      for (const h of DISNEY_HOTELS) {
        lastResult = addMonitor({
          hotelId: h.id,
          ...baseInput,
        });
        if (!lastResult.ok) break;
      }
    } else {
      lastResult = addMonitor({
        hotelId,
        ...baseInput,
      });
    }
    setBusy(false);
    if (!lastResult || !lastResult.ok) {
      toast.error(lastResult?.reason ?? "監視を開始できませんでした");
      return;
    }

    toast.success(hotelMode === "all" ? "全ホテルで監視を開始しました" : "監視を開始しました", {
      description: "このタブを開いたままにするとチェックが継続します。",
    });
  };

  return (
    <section id="monitor-tool" className="scroll-mt-24 px-4 py-12">
      <div className="mx-auto max-w-xl space-y-4">
        <FakeActivity />
        <SpeedMode />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card className="glass-panel border-white/50 shadow-glass relative overflow-hidden">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-brand/15 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-28 right-0 h-64 w-64 rounded-full bg-accent-gold-muted blur-2xl" />
            <CardHeader>
              <CardTitle className="text-xl">条件を入れて、あとは待つだけ</CardTitle>
              <CardDescription>
                公式の空室ページをもとに状態を推定します（表示文言の変更に左右される場合があります）。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-xl border border-slate-200/70 bg-white/60 px-4 py-3 shadow-sm">
                <p className="text-xs font-medium text-slate-500">
                  いまの条件（プレビュー）
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {hotelMode === "all" ? "全ホテル" : getHotelLabel(hotelId)} ·{" "}
                  {date ? format(date, "PPP", { locale: ja }) : "日付未選択"} ·{" "}
                  {nights}泊 · 大人{guests}名
                  {Number(childGuests) > 0 ? (
                    <>
                      {" "}
                      ・子ども{childGuests}名（
                      {formatChildSummaryJa(
                        childSlots.slice(0, Number(childGuests))
                      )}
                      ）
                    </>
                  ) : null}
                </p>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!previewUrl}
                    className="rounded-xl"
                    onClick={() => {
                      if (!previewUrl) return;
                      window.open(previewUrl, "_blank", "noopener,noreferrer");
                    }}
                  >
                    {hotelMode === "all"
                      ? "代表ホテルの予約ページへ"
                      : "この条件で予約ページへ"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!previewUrl}
                    className="rounded-xl"
                    onClick={async () => {
                      if (!previewUrl) return;
                      try {
                        await navigator.clipboard.writeText(previewUrl);
                        toast.success("予約URLをコピーしました");
                      } catch {
                        toast.error("コピーに失敗しました");
                      }
                    }}
                  >
                    {hotelMode === "all" ? "代表URLをコピー" : "URLをコピー"}
                  </Button>
                </div>

                {Number(childGuests) > 0 && (
                  <div className="mt-3 rounded-lg bg-slate-900/5 p-3">
                    <p className="text-xs font-medium text-slate-600">
                      デバッグ：公式パラメータ `childAgeBedInform`
                    </p>
                    <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <code className="break-all rounded bg-white/70 px-2 py-1 text-xs text-slate-800 ring-1 ring-slate-200/80">
                        {debugChildAgeBedInform}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl"
                        disabled={!debugChildAgeBedInform}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              debugChildAgeBedInform
                            );
                            toast.success("childAgeBedInform をコピーしました");
                          } catch {
                            toast.error("コピーに失敗しました");
                          }
                        }}
                      >
                        コピー
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>ホテル対象</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    type="button"
                    variant={hotelMode === "single" ? "default" : "secondary"}
                    className="rounded-xl"
                    onClick={() => setHotelMode("single")}
                  >
                    ホテル別
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    variant={hotelMode === "all" ? "default" : "secondary"}
                    className="rounded-xl"
                    onClick={() => setHotelMode("all")}
                  >
                    全ホテル
                  </Button>
                </div>

                {hotelMode === "single" ? (
                  <Select
                    value={hotelId}
                    onValueChange={(v) => setHotelId(v as HotelId)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="ホテルを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISNEY_HOTELS.map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="rounded-xl border border-slate-200/70 bg-white/50 p-3">
                    <p className="text-sm font-semibold text-slate-900">
                      対象ホテル：{DISNEY_HOTELS.length}件
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      監視はこの条件で全ホテルを作成します。
                      予約URLは各監視カードの「今すぐ予約」から開けます。
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {DISNEY_HOTELS.map((h) => (
                        <span
                          key={h.id}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                        >
                          {h.name.replace("®", "")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>チェックイン</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="secondary"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-slate-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date
                          ? format(date, "PPP", { locale: ja })
                          : "日付を選択"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        disabled={(d) => d < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>泊数</Label>
                  <Select value={nights} onValueChange={setNights}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["1", "2", "3"].map((n) => (
                        <SelectItem key={n} value={n}>
                          {n}泊
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>大人（1〜4）</Label>
                <Select value={guests} onValueChange={setGuests}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["1", "2", "3", "4"].map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}名
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <button
                type="button"
                onClick={() => setAdvanced((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <span className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-brand" />
                  詳細オプション
                </span>
                <span className="text-xs text-slate-400">
                  {advanced ? "閉じる" : "開く"}
                </span>
              </button>

              {advanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="space-y-2">
                    <Label>子ども（任意）</Label>
                    <Select value={childGuests} onValueChange={setChildGuests}>
                      <SelectTrigger>
                        <SelectValue placeholder="0" />
                      </SelectTrigger>
                      <SelectContent>
                        {["0", "1", "2", "3", "4"].map((n) => (
                          <SelectItem key={n} value={n}>
                            {n}名
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {Number(childGuests) > 0 && (
                      <div className="mt-2 space-y-4">
                        {Array.from({ length: Number(childGuests) }).map(
                          (_, idx) => {
                            const slot = childSlots[idx] ?? defaultChildSlot();
                            const patchSlot = (p: Partial<ChildGuestInput>) => {
                              setChildSlots((prev) => {
                                const next = [...prev];
                                const cur = { ...(next[idx] ?? defaultChildSlot()), ...p };
                                if (cur.ageYears !== 6) {
                                  cur.sixTrack = undefined;
                                } else if (!cur.sixTrack) {
                                  cur.sixTrack = "preschool";
                                }
                                next[idx] = cur;
                                return next;
                              });
                            };
                            return (
                              <div
                                key={idx}
                                className="rounded-xl border border-slate-200/70 bg-white/50 p-3 shadow-sm"
                              >
                                <p className="mb-3 text-xs font-semibold text-slate-800">
                                  お子さま {idx + 1}
                                </p>
                                <p className="mb-3 text-[11px] text-slate-500">
                                  この順（お子さま1→2→…）が `childAgeBedInform` の並びに反映されます。
                                </p>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label className="text-xs">年齢</Label>
                                    <Select
                                      value={String(slot.ageYears)}
                                      onValueChange={(v) =>
                                        patchSlot({ ageYears: Number(v) })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Array.from({ length: 12 }).map(
                                          (_, a) => (
                                            <SelectItem key={a} value={String(a)}>
                                              {a}歳
                                            </SelectItem>
                                          )
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {slot.ageYears === 6 && (
                                    <div className="space-y-2">
                                      <Label className="text-xs">
                                        6歳の区分
                                      </Label>
                                      <Select
                                        value={slot.sixTrack ?? "preschool"}
                                        onValueChange={(v) =>
                                          patchSlot({
                                            sixTrack: v as SixYearTrack,
                                          })
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="preschool">
                                            未就学
                                          </SelectItem>
                                          <SelectItem value="elementary">
                                            小学生
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
                                  <div className="space-y-2 sm:col-span-2">
                                    <Label className="text-xs">
                                      ベッドまわり（公式区分）
                                    </Label>
                                    <Select
                                      value={slot.bedKey}
                                      onValueChange={(v) =>
                                        patchSlot({
                                          bedKey: v as TdrChildBedKey,
                                        })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="withBed">
                                          ベッドあり（コード1）
                                        </SelectItem>
                                        <SelectItem value="soine">
                                          ベッドなし（コード3）
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <p className="text-[11px] leading-relaxed text-slate-500">
                                      表示は公式サイトの文言と完全一致ではない場合があります。
                                      6歳区分の内部コードは{" "}
                                      <code className="rounded bg-slate-100 px-1">
                                        lib/tdrChildParams.ts
                                      </code>{" "}
                                      を実URLに合わせて更新してください。
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>ルームタイプ（任意）</Label>
                    <Input
                      placeholder="例：スーペリアルーム"
                      value={roomType}
                      onChange={(e) => setRoomType(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white/80 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        LINE Notify
                      </p>
                      <p className="text-xs text-slate-500">
                        サーバー側トークンが必要です
                      </p>
                    </div>
                    <Switch checked={notifyLine} onCheckedChange={setNotifyLine} />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white/80 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        メール
                      </p>
                      <p className="text-xs text-slate-500">
                        Gmail + アプリパスワード推奨
                      </p>
                    </div>
                    <Switch
                      checked={notifyEmail}
                      onCheckedChange={setNotifyEmail}
                    />
                  </div>
                  {notifyEmail && (
                    <div className="space-y-2">
                      <Label>通知先メール</Label>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  )}
                </motion.div>
              )}

              <Button
                size="lg"
                className="w-full rounded-2xl"
                onClick={() => void onSubmit()}
                disabled={busy || disabledAdd}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    設定中…
                  </>
                ) : (
                  "この条件で空きを監視"
                )}
              </Button>
              {disabledAdd && (
                <p className="text-center text-xs text-amber-700">
                  無料プランは1件まで。下の料金プランでProを確認できます。
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
