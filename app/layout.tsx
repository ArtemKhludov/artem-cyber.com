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
  title: "EnergyLogic - Energy Diagnostics & Personal Transformation",
  description: "AI that knows who you are. Psychoanalysis without masks. 20 minutes → PDF report. 21 days → new 'You'",
  keywords: ["energy", "diagnostics", "psychoanalysis", "AI", "personal transformation", "consultation", "self-discovery"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
