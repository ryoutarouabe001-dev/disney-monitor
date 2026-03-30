"use client";

import { motion } from "framer-motion";
import { BellRing, RefreshCw } from "lucide-react";

export function Problem() {
  return (
    <section className="px-4 py-14">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="glass-panel p-8"
        >
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <RefreshCw className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">いつもの課題</h2>
          <ul className="mt-4 space-y-3 text-slate-600">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
              何度も更新してしまい、時間とストレスが溶ける
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
              気づいたら満室に戻っていた…という見逃し
            </li>
          </ul>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="glass-panel p-8 ring-1 ring-brand/15"
        >
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <BellRing className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Magic Vacancy</h2>
          <ul className="mt-4 space-y-3 text-slate-600">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              公式予約ページを一定間隔で自動チェック
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              満室→空きの変化だけを検知し、すぐ通知
            </li>
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
