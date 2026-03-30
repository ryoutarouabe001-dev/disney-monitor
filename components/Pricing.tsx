"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const freeFeatures = [
  "1件まで同時監視",
  "60秒ごとの自動チェック",
  "満室→空きの変化検知",
  "LINE / メール通知（サーバー設定時）",
];

const proFeatures = [
  "監視条件 無制限",
  "高頻度チェック（10秒）",
  "優先通知ルート",
  "履歴エクスポート（予定）",
];

export function Pricing() {
  return (
    <section className="px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            シンプルな料金
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            まずは無料で価値を実感。拡張はProで。
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
          >
            <Card className="h-full border-slate-200/80 bg-white/90 shadow-lg backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-xl">Free</CardTitle>
                <CardDescription>今すぐ始められる常時無料枠</CardDescription>
                <p className="pt-2 text-3xl font-bold text-slate-900">
                  ¥0
                  <span className="text-base font-normal text-slate-500">
                    / ずっと
                  </span>
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-slate-600">
                  {freeFeatures.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="secondary"
                  className="w-full rounded-xl"
                  onClick={() =>
                    document
                      .getElementById("monitor-tool")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  無料で開始
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
          >
            <Card className="relative h-full overflow-hidden border-brand/25 bg-gradient-to-b from-white to-brand/5 shadow-glass backdrop-blur-xl ring-1 ring-brand/20">
              <div className="absolute right-4 top-4 rounded-full bg-accent-gold/25 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
                有効化済み
              </div>
              <CardHeader>
                <CardTitle className="text-xl">Pro</CardTitle>
                <CardDescription>集中ホテル取得向けの加速プラン</CardDescription>
                <p className="pt-2 text-3xl font-bold text-slate-900">
                  ¥980
                  <span className="text-base font-normal text-slate-500">
                    / 月（目安）
                  </span>
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-slate-600">
                  {proFeatures.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-gold" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="gold"
                  className="w-full rounded-xl"
                  onClick={() =>
                    toast.message("Proはすでに有効です。監視を追加してお使いください。")
                  }
                >
                  Pro（全機能）を利用中
                </Button>
                <p className="text-center text-[11px] text-slate-500">
                  決済連携はStripe等で後から接続可能な構造です。
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
