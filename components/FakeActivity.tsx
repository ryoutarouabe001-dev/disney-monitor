"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";

export function FakeActivity() {
  const [watchers, setWatchers] = useState(3);
  const [pings, setPings] = useState(12);

  useEffect(() => {
    const jitter = () => {
      setWatchers(2 + Math.floor(Math.random() * 4));
      setPings(8 + Math.floor(Math.random() * 9));
    };
    jitter();
    const id = window.setInterval(jitter, 14_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm text-slate-600 shadow-sm backdrop-blur-md"
    >
      <Activity className="h-4 w-4 text-brand" />
      <span>
        現在 <strong className="text-slate-900">{watchers}人</strong> が監視中
      </span>
      <span className="hidden h-3 w-px bg-slate-200 sm:inline" />
      <span>
        本日 <strong className="text-slate-900">{pings}件</strong> 検知（参考値）
      </span>
    </motion.div>
  );
}
