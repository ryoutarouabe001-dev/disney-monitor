import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "react-day-picker/dist/style.css";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Magic Vacancy | ディズニーホテル空室通知",
  description:
    "東京ディズニーリゾート公式予約の空室変化を自動検知。張り付き作業から解放され、最適なタイミングで通知を受け取れます。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={inter.variable}>
      <body className="min-h-dvh font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
