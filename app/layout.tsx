import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SupabaseProvider } from "@/components/providers/supabase-provider";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { StructuredData } from "@/components/seo/StructuredData";
import { GoogleAnalytics } from "@/components/seo/GoogleAnalytics";
import { generateSEOMetadata } from "@/components/seo/SEOHead";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// SEO-optimized metadata for EnergyLogic AI Life Navigation System
export const metadata: Metadata = generateSEOMetadata({
  title: "EnergyLogic – AI Life Navigation System for Adults 25–45",
  description: "EnergyLogic is an AI-powered life navigation system that helps adults 25–45 escape debt, burnout, and career chaos with a daily adaptive path.",
  keywords: [
    "AI life navigation system",
    "personal life GPS",
    "financial stability app",
    "burnout recovery",
    "life navigation software",
    "personal growth platform",
    "financial stress management",
    "career guidance AI",
    "life path planning",
    "debt recovery app",
    "AI personal development",
    "life coaching technology",
    "financial wellness platform",
  ],
  ogImage: "/og-image-1200x630.png",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {/* Structured Data for SEO */}
        <StructuredData type="SoftwareApplication" />
        <StructuredData type="Organization" />
        <StructuredData type="WebSite" />
        {/* Google Analytics */}
        <GoogleAnalytics />
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
