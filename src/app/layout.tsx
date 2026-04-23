import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/layout/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { KeyboardShortcuts } from "@/components/shortcuts/keyboard-shortcuts";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "gbr-eval — Annotation Studio",
  description: "Eval-first quality framework for GarantiaBR",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <Providers>
          <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 overflow-auto p-6 pt-20 lg:pt-6">
              {children}
            </main>
          </div>
          <Toaster />
          <KeyboardShortcuts />
        </Providers>
      </body>
    </html>
  );
}
