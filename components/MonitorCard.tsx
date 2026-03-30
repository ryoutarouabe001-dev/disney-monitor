"use client";

import { motion } from "framer-motion";
import { ExternalLink, Trash2 } from "lucide-react";
import { useMonitorStore, type Monitor } from "@/store/monitorStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatJaDate, formatJaTime } from "@/lib/utils";
import { getHotelLabel } from "@/lib/urlBuilder";
import type { AvailabilitySignal } from "@/lib/checker";

function statusBadge(status: AvailabilitySignal | null) {
  if (status === "available") {
    return <Badge variant="success">空きあり</Badge>;
  }
  if (status === "unavailable") {
    return <Badge variant="destructive">満室</Badge>;
  }
  return <Badge variant="secondary">確認中 / 不明</Badge>;
}

export function MonitorCard({ monitor }: { monitor: Monitor }) {
  const updateMonitor = useMonitorStore((s) => s.updateMonitor);
  const removeMonitor = useMonitorStore((s) => s.removeMonitor);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-md backdrop-blur-xl"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {statusBadge(monitor.currentStatus)}
            <span className="text-xs text-slate-400">
              前回:{" "}
              {monitor.previousStatus === "available"
                ? "空き"
                : monitor.previousStatus === "unavailable"
                  ? "満室"
                  : monitor.previousStatus === "unknown"
                    ? "不明"
                    : "—"}
            </span>
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            {getHotelLabel(monitor.hotelId)}
          </h3>
          <p className="text-sm text-slate-600">
            {formatJaDate(monitor.checkIn)} · {monitor.nights}泊 ·{" "}
            {monitor.guests}名
            {monitor.roomType ? ` · ${monitor.roomType}` : ""}
          </p>
          <p className="text-xs text-slate-500">
            最終確認:{" "}
            {monitor.lastChecked
              ? `${formatJaDate(monitor.lastChecked)} ${formatJaTime(monitor.lastChecked)}`
              : "—"}
          </p>
        </div>
        <div className="flex flex-row items-center gap-3 sm:flex-col sm:items-end">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">監視</span>
            <Switch
              checked={monitor.enabled}
              onCheckedChange={(v) => updateMonitor(monitor.id, { enabled: v })}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" asChild>
              <a
                href={monitor.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="gap-1"
              >
                予約ページ
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-red-600 hover:bg-red-50"
              onClick={() => removeMonitor(monitor.id)}
              aria-label="削除"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
