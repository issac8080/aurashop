import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { ChatWidget } from "@/components/ChatWidget";
import { BackendOfflineBanner } from "@/components/BackendOfflineBanner";
import { Providers } from "./providers";

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
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased font-sans">
        <Providers>
          <BackendOfflineBanner />
          <Header />
          <main className="container mx-auto px-4 pb-24">
            {children}
          </main>
          <ChatWidget />
        </Providers>
      </body>
    </html>
  );
}
