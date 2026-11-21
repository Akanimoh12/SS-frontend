import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { AppErrorBoundary } from "@/components/ErrorBoundary";
import { Navbar, Footer } from "@/components/layout";
import { MobileNav } from "@/components/layout/MobileNav";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NetworkBanner } from "@/components/network/NetworkBanner";
import { EscapeBanner } from "@/components/escape/EscapeBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "StellarSettle",
  description: "Modern web interface for decentralized invoice financing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <TooltipProvider>
          <Providers>
            {/* #443 — shown on every page while the testnet is selected */}
            <NetworkBanner />
            {/* #592 — protocol pause / escape hatch countdown */}
            <EscapeBanner />
            <Navbar />
            {children}
            <Footer />
            <Toaster />
          </Providers>
        </TooltipProvider>
      </body>
    </html>
  );
}
