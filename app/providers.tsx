"use client";

import { Toaster } from "sonner";
import { useMonitorEngine } from "@/hooks/useMonitorEngine";

export function Providers({ children }: { children: React.ReactNode }) {
  useMonitorEngine();

  return (
    <>
      {children}
      <Toaster richColors position="top-center" className="font-sans" />
    </>
  );
}
