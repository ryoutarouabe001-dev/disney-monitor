"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:pt-16">
      <div className="pointer-events-none absolute inset-0 bg-hero-gradient" />
      <div className="relative mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-white/80 px-3 py-1 text-xs font-medium text-brand shadow-sm backdrop-blur-md"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Tokyo Disney Resort 公式予約ページ対応
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl"
        >
          キャンセル拾い、
          <br className="sm:hidden" />
          もう張り付かない。
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12 }}
          className="mt-5 text-base text-slate-600 sm:text-lg"
        >
          ディズニーホテルの空室を
          <span className="font-semibold text-slate-800">
            {" "}
            自動検知→即通知
          </span>
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2 }}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
          <Button
            size="lg"
            className="w-full min-w-[240px] sm:w-auto"
            onClick={() =>
              document
                .getElementById("monitor-tool")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            無料で今すぐ始める
          </Button>
          <p className="text-xs text-slate-500">
            クレカ登録なし・この場で完結
          </p>
        </motion.div>
        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-600"
        >
          {["登録不要", "完全無料", "10秒で設定完了"].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-gold shadow-sm" />
              {t}
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
