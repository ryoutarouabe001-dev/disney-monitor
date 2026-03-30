"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function SpeedMode() {
  // 実機能は「Pro制限なし」で常時有効のため、表示もPro前提に寄せます。
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 shadow-sm backdrop-blur-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">チェック間隔</p>
          <p className="text-xs text-slate-500">
            10秒ごとに公式ページを確認します（この画面はPro制限なし設定）。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="default"
            className={cn("rounded-lg px-3 py-1 ring-2 ring-brand/40")}
          >
            Pro · 10秒
          </Badge>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        優先通知・高速チェックは全機能として有効化しています（決済連携は未実装）。
      </p>
    </div>
  );
}
