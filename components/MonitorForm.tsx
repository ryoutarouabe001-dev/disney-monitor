"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { motion } from "framer-motion";
import { CalendarIcon, Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { DISNEY_HOTELS, type HotelId } from "@/lib/urlBuilder";
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

export function MonitorForm() {
  const addMonitor = useMonitorStore((s) => s.addMonitor);
  const monitorCount = useMonitorStore((s) => s.monitors.length);
  const isProUser = useMonitorStore((s) => s.isPro);
  const canAdd = isProUser || monitorCount < 1;

  const [hotelId, setHotelId] = useState<HotelId>(DISNEY_HOTELS[0].id);
  const [date, setDate] = useState<Date | undefined>(
    () => new Date(Date.now() + 86400000 * 30)
  );
  const [nights, setNights] = useState("1");
  const [guests, setGuests] = useState("2");
  const [advanced, setAdvanced] = useState(false);
  const [roomType, setRoomType] = useState("");
  const [notifyLine, setNotifyLine] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const disabledAdd = useMemo(() => !canAdd, [canAdd]);

  const onSubmit = async () => {
    if (!date) {
      toast.error("宿泊日を選んでください");
      return;
    }
    if (notifyEmail && !email.trim()) {
      toast.error("メール通知の場合はアドレスを入力してください");
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 280));
    const result = addMonitor({
      hotelId,
      checkInDate: date,
      nights: Number(nights),
      guests: Number(guests),
      roomType: roomType.trim() || undefined,
      notifyLine,
      notifyEmail,
      notifyEmailAddress: notifyEmail ? email.trim() : undefined,
    });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    toast.success("監視を開始しました", {
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
          <Card className="glass-panel border-white/50 shadow-glass">
            <CardHeader>
              <CardTitle className="text-xl">条件を入れて、あとは待つだけ</CardTitle>
              <CardDescription>
                公式の空室ページをもとに状態を推定します（表示文言の変更に左右される場合があります）。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>ホテル</Label>
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
                <Label>人数（大人）</Label>
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
