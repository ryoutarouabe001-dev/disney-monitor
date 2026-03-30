"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard } from "lucide-react";
import { useMonitorStore } from "@/store/monitorStore";
import { MonitorCard } from "@/components/MonitorCard";
import { Skeleton } from "@/components/ui/skeleton";
import { formatJaDate, formatJaTime } from "@/lib/utils";
import { getHotelLabel } from "@/lib/urlBuilder";

export function Dashboard() {
  const monitors = useMonitorStore((s) => s.monitors);
  const logs = useMonitorStore((s) => s.logs);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <section className="px-4 py-10">
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              監視ダッシュボード
            </h2>
            <p className="text-sm text-slate-500">
              有効な監視が10秒ごとに自動チェックされます。このタブを閉じると監視は停止します。
            </p>
          </div>
        </motion.div>

        {monitors.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-6 text-center shadow-sm backdrop-blur-md">
            <p className="text-sm font-semibold text-slate-900">
              監視ダッシュボードはまだ空です
            </p>
            <p className="mt-1 text-xs text-slate-500">
              右上の「この条件で空きを監視」から監視を追加すると、
              ここにカードとチェックログが表示されます。
            </p>
          </div>
        ) : (
        <div className="space-y-4">
          {monitors.map((m) => (
            <MonitorCard key={m.id} monitor={m} />
          ))}
        </div>
        )}

        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-md">
          <h3 className="text-sm font-semibold text-slate-900">
            直近のチェックログ（最大10件）
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {logs.slice(0, 10).map((log) => {
              const mon = monitors.find((x) => x.id === log.monitorId);
              const label = mon
                ? getHotelLabel(mon.hotelId)
                : "不明な監視";
              const resultJa =
                log.result === "available"
                  ? "空き"
                  : log.result === "unavailable"
                    ? "満室"
                    : "不明";
              return (
                <li
                  key={log.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-slate-50/80 px-3 py-2"
                >
                  <span className="font-medium text-slate-800">{label}</span>
                  <span className="text-xs text-slate-500">
                    {formatJaDate(log.at)} {formatJaTime(log.at)}
                  </span>
                  <span className="w-full text-xs sm:w-auto sm:text-right">
                    結果:{" "}
                    <span
                      className={
                        log.result === "available"
                          ? "font-semibold text-emerald-700"
                          : log.result === "unavailable"
                            ? "font-semibold text-red-600"
                            : "font-medium text-slate-500"
                      }
                    >
                      {resultJa}
                    </span>
                  </span>
                  {(log.reason || log.htmlSize) && (
                    <span className="w-full text-[11px] text-slate-500 sm:w-auto sm:text-right">
                      {log.reason ? `理由: ${log.reason}` : ""}
                      {log.reason && log.htmlSize ? " / " : ""}
                      {typeof log.htmlSize === "number" ? `HTML: ${log.htmlSize}` : ""}
                    </span>
                  )}
                </li>
              );
            })}
            {logs.length === 0 && (
              <li className="text-xs text-slate-400">
                まだログがありません。しばらくお待ちください。
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
