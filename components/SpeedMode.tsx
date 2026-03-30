"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function SpeedMode() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 shadow-sm backdrop-blur-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">チェック間隔</p>
          <p className="text-xs text-slate-500">
            負荷配慮のため、最低60秒間隔で公式ページを確認します。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="default"
            className={cn("rounded-lg px-3 py-1 ring-2 ring-brand/40")}
          >
            60秒
          </Badge>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        空き検知が出たときだけ通知を行います。
      </p>
    </div>
  );
}
