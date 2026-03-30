"use client";

import { motion } from "framer-motion";
import { TrendingUp, Users } from "lucide-react";

export function SocialProof() {
  return (
    <section className="px-4 py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:justify-center sm:gap-8">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="glass-panel flex flex-1 items-center gap-4 px-5 py-4"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">
              昨日 12件の空室を検知
            </p>
            <p className="text-xs text-slate-500">※デモ指標・実績風表示</p>
          </div>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="glass-panel flex flex-1 items-center gap-4 px-5 py-4"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-gold/20 text-slate-800">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">
              ユーザー数 1,200+
            </p>
            <p className="text-xs text-slate-500">※マーケティング表現</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
