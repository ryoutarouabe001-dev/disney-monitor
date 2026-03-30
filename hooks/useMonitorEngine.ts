"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { MIN_INTERVAL_MS, useMonitorStore } from "@/store/monitorStore";
import { requestNotify } from "@/lib/notifier";
import { getHotelLabel } from "@/lib/urlBuilder";
import { formatJaDate } from "@/lib/utils";
import type { AvailabilitySignal } from "@/lib/checker";
import { formatChildSummaryJa } from "@/lib/tdrChildParams";

export function useMonitorEngine() {
  const inFlight = useRef(false);
  const lastRunAt = useRef(0);
  const tickNonce = useMonitorStore((s) => s.tickNonce);
  const lastInvalidToastAt = useRef(0);
  // Safety: 最低60秒間隔で実行（サイト側ゲート/ブロック悪化を防ぐ）
  const intervalMs = MIN_INTERVAL_MS;

  const runTick = async () => {
    if (inFlight.current) return;

    const { monitors, setStatuses, pushLog } = useMonitorStore.getState();

    const active = monitors.filter((m) => m.enabled);
    if (active.length === 0) return;

    const now = Date.now();
    if (now - lastRunAt.current < intervalMs) return;
    lastRunAt.current = now;

    inFlight.current = true;
    for (const m of active) {
      try {
        const res = await fetch("/api/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: m.bookingUrl }),
        });
          const data = (await res.json()) as {
            status?: AvailabilitySignal;
            checkedAt?: string;
            reason?: string;
          };

          const next = data.status ?? "unknown";
        const checkedAt = data.checkedAt ?? new Date().toISOString();
        const prev = m.currentStatus;

          if (data.reason === "invalid-child-info") {
            // 同じ間違いが繰り返されるので、かなり強いメッセージにする
            const nowTs = Date.now();
            if (nowTs - lastInvalidToastAt.current > 60_000) {
              lastInvalidToastAt.current = nowTs;
              toast.error(
                "子ども情報の入力が不正です（公式に合わせて調整が必要）",
                {
                  description:
                    "アプリのデバッグ欄で `childAgeBedInform` を確認してください（例: `06U_1|01_3|`）。",
                }
              );
            }
          } else if (data.reason === "parse-unknown") {
            toast.error("空き判定が取得できませんでした", {
              description:
                "公式予約サイト側がゲート/JS依存でHTMLにデータを含めない場合があります。しばらく待って再試行してください。",
            });
          } else if (
            next === "unknown" &&
            data.reason === "queue-it" &&
            prev !== "unknown"
          ) {
            toast.error("予約サイト側の待ち/ゲートにより取得できませんでした", {
              description:
                "空き判定（不明）が続く場合、headlessブラウザ（Playwright）等が必要です。",
            });
          }

        setStatuses(m.id, {
          previousStatus: prev,
          currentStatus: next,
          lastChecked: checkedAt,
        });

        pushLog({
          monitorId: m.id,
          at: checkedAt,
          result: next,
        });

        // UX優先: 最初から空きが出ている場合（prev が null/unknown）でも通知する
        const shouldNotify = next === "available" && prev !== "available";

        if (shouldNotify) {
            const childText =
              m.childGuests > 0
                ? ` / 子ども${m.childGuests}名（${formatChildSummaryJa(
                    (m.childSlots ?? []).slice(0, m.childGuests)
                  )}）`
                : "";
          const summary = `${getHotelLabel(m.hotelId)} / ${formatJaDate(m.checkIn)} / ${m.nights}泊 / 大人${m.guests}名${childText}`;
          const notifyRes = await requestNotify({
            bookingUrl: m.bookingUrl,
            summary,
            methods: {
              line: m.notifyLine,
              email: m.notifyEmail,
            },
            emailTo: m.notifyEmailAddress,
          });

          if (notifyRes.ok) {
            toast.success("空きを検知しました！", {
              description: "この条件で予約ページへ進めます。",
              action: {
                label: "今すぐ予約",
                onClick: () => {
                  window.open(
                    m.bookingUrl,
                    "_blank",
                    "noopener,noreferrer"
                  );
                },
              },
            });
            if (notifyRes.warning) {
              toast.message(notifyRes.warning);
            }
          } else {
            toast.error(notifyRes.error ?? "通知に失敗しました", {
              description:
                "設定を確認するか、画面から直接予約URLを開いてください。",
            });
          }
        }
      } catch {
        const checkedAt = new Date().toISOString();
        const st = useMonitorStore.getState();
        st.setStatuses(m.id, {
          previousStatus: m.currentStatus,
          currentStatus: "unknown",
          lastChecked: checkedAt,
        });
        st.pushLog({
          monitorId: m.id,
          at: checkedAt,
          result: "unknown",
        });
      }
    }
    inFlight.current = false;
  };

  useEffect(() => {
    void runTick();
    const id = window.setInterval(() => void runTick(), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  useEffect(() => {
    if (!tickNonce) return;
    void runTick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickNonce, intervalMs]);
}
