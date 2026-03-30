"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { MIN_INTERVAL_MS, useMonitorStore } from "@/store/monitorStore";
import { requestNotify } from "@/lib/notifier";
import { getHotelLabel } from "@/lib/urlBuilder";
import { formatJaDate } from "@/lib/utils";
import type { AvailabilitySignal } from "@/lib/checker";

export function useMonitorEngine() {
  const inFlight = useRef(false);

  useEffect(() => {
    /** 本番セーフティ: 最低60秒。Proの10秒は課金導線としてUIのみ表示。 */
    const intervalMs = MIN_INTERVAL_MS;

    const runTick = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      const {
        monitors,
        setStatuses,
        pushLog,
      } = useMonitorStore.getState();

      const active = monitors.filter((m) => m.enabled);
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
          };

          const next = data.status ?? "unknown";
          const checkedAt = data.checkedAt ?? new Date().toISOString();
          const prev = m.currentStatus;

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

          const shouldNotify =
            prev === "unavailable" && next === "available";

          if (shouldNotify) {
            const summary = `${getHotelLabel(m.hotelId)} / ${formatJaDate(m.checkIn)} / ${m.nights}泊 / ${m.guests}名`;
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
              toast.success("空きを検知しました。通知を送りました。", {
                description: "予約ページをすぐ開いてください。",
              });
              if (notifyRes.warning) {
                toast.message(notifyRes.warning);
              }
            } else {
              toast.error(notifyRes.error ?? "通知に失敗しました", {
                description: "設定を確認するか、画面から直接予約URLを開いてください。",
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

    void runTick();
    const id = window.setInterval(() => void runTick(), intervalMs);
    return () => window.clearInterval(id);
  }, []);
}
