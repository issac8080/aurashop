import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { ChatWidget } from "@/components/ChatWidget";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={manrope.variable}>
      <body className="min-h-screen antialiased font-sans font-light text-foreground">
        <Providers>
          <BackendOfflineBanner />
          <Header />
          <main className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl pb-28 sm:pb-24">
            {children}
          </main>
          <ChatWidget />
        </Providers>
      </body>
    </html>
  );
}
