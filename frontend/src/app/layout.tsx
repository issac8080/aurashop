import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { ChatWidgetDynamic } from "@/components/ChatWidgetDynamic";
import { BackendOfflineBanner } from "@/components/BackendOfflineBanner";
import { Providers } from "./providers";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  weight: ["300", "700"],
});

export const metadata: Metadata = {
  title: "AuraShop – AI-Powered Shopping Assistant",
  description: "Personalized product recommendations and real-time AI assistant for e-commerce.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f3f1" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={manrope.variable}>
      <body className="min-h-screen min-h-[100dvh] antialiased font-sans font-light text-foreground">
        <Providers>
          <BackendOfflineBanner />
          <Header />
          <main className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl min-w-0 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
            {children}
          </main>
          <ChatWidgetDynamic />
        </Providers>
      </body>
    </html>
  );
}
