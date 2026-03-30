import { Hero } from "@/components/Hero";
import { SocialProof } from "@/components/SocialProof";
import { Problem } from "@/components/Problem";
import { MonitorForm } from "@/components/MonitorForm";
import { Dashboard } from "@/components/Dashboard";
import { Pricing } from "@/components/Pricing";

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-hero-gradient">
      <Hero />
      <SocialProof />
      <Problem />
      <MonitorForm />
      <Dashboard />
      <Pricing />
      <footer className="border-t border-slate-200/60 bg-white/50 px-4 py-10 text-center text-xs text-slate-500 backdrop-blur-md">
        <p>
          Magic Vacancy は東京ディズニーリゾート公式サイトをユーザーに代わって参照します。
          利用規約・ロボット排除ポリシーに従い、適切な間隔・タイムアウトでアクセスします。
        </p>
        <p className="mt-2">
          © {new Date().getFullYear()} Magic Vacancy · 非公式ファン向けツール
        </p>
      </footer>
    </main>
  );
}
