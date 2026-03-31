"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { MIN_INTERVAL_MS, useMonitorStore } from "@/store/monitorStore";
import { requestNotify } from "@/lib/notifier";
import { getHotelLabel } from "@/lib/urlBuilder";
import { formatJaDate } from "@/lib/utils";
import type { AvailabilitySignal } from "@/lib/checker";
import { formatChildSummaryJa } from "@/lib/tdrChildParams";
import { sendBrowserAlert } from "@/lib/clientAlerts";

export function useMonitorEngine() {
  const inFlight = useRef(false);
  const lastRunAt = useRef(0);
  const tickNonce = useMonitorStore((s) => s.tickNonce);
  const lastInvalidToastAt = useRef(0);
  const lastPlatformLimitToastAt = useRef(0);
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

          const reason = data.reason;
          const debugSteps = (data as any).debug?.steps as
            | Array<{ size?: number }>
            | undefined;
          const lastStep = debugSteps?.[debugSteps.length - 1];
          const htmlSize = lastStep?.size;

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
          } else if (data.reason === "platform-limit") {
            const nowPl = Date.now();
            if (nowPl - lastPlatformLimitToastAt.current > 90_000) {
              lastPlatformLimitToastAt.current = nowPl;
              toast.error("実行時間の上限に達しました（Vercel Hobby）", {
                description:
                  "無料プランではサーバー処理が約10秒で打ち切られます。公式ページの取得が間に合わないことがあります。安定運用には Pro（最大実行時間の拡大）や自前サーバー（Docker）でのホストを検討してください。",
              });
            }
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
          reason,
          htmlSize,
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
          const notifyBrowser = m.notifyBrowser ?? true;
          const notifySound = m.notifySound ?? true;

          // Hobby前提: ブラウザ通知をまず試す（サーバー側依存を減らす）
          const browserTitle = "空きが出ました！";
          const browserBody = summary;
          let browser: {
            notified: boolean;
            sounded: boolean;
            permission: NotificationPermission | "unsupported";
          } = { notified: false, sounded: false, permission: "unsupported" };

          if (notifyBrowser || notifySound) {
            try {
              browser = await sendBrowserAlert({
                title: browserTitle,
                body: browserBody,
                url: m.bookingUrl,
                tag: `mv_${m.id}`,
                sound: Boolean(notifySound),
              });
            } catch {
              browser = { notified: false, sounded: false, permission: "unsupported" };
            }
          }

          const useServerNotify = Boolean(m.notifyLine || m.notifyEmail);
          const notifyRes = useServerNotify
            ? await requestNotify({
                bookingUrl: m.bookingUrl,
                summary,
                methods: {
                  line: m.notifyLine,
                  email: m.notifyEmail,
                },
                emailTo: m.notifyEmailAddress,
              })
            : { ok: true as const };

          const clientOk = browser.notified || browser.sounded;
          const serverOk = notifyRes.ok === true;

          if (clientOk || serverOk) {
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
            const warn = (notifyRes as { warning?: string }).warning;
            if (warn) toast.message(warn);
            if (useServerNotify && !serverOk) {
              toast.message("LINE/メール通知だけ失敗しました", {
                description:
                  typeof notifyRes.error === "string"
                    ? notifyRes.error
                    : "トークン・SMTPの環境変数を確認してください。ブラウザ通知は届いています。",
              });
            }
            if (
              (notifyBrowser || notifySound) &&
              !browser.notified &&
              browser.permission === "denied"
            ) {
              toast.message("ブラウザ通知がブロックされています", {
                description: "ブラウザのサイト設定で通知を許可してください。",
              });
            }
          } else {
            toast.error(
              typeof notifyRes.error === "string"
                ? notifyRes.error
                : "通知に失敗しました",
              {
                description:
                  "ブラウザ通知の許可/音の有効化を確認するか、予約URLを手動で開いてください。",
              }
            );
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
