import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SupabaseProvider } from "@/components/providers/supabase-provider";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "EnergyLogic - Энергетическая диагностика",
  description: "ИИ, который знает, кто ты. Психоанализ без масок. 20 минут → PDF-отчёт. 21 день → новое «Я»",
  keywords: ["энергетика", "диагностика", "психоанализ", "ИИ", "трансформация личности", "консультация"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} font-sans antialiased`}>
        <SupabaseProvider>
          <PostHogProvider>
            <AuthProvider>
              <div className="min-h-screen">
                {children}
              </div>
            </AuthProvider>
          </PostHogProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
