import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Bookkeeper - Zoho Books",
  description: "AI-powered bookkeeping assistant for Zoho Books",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-gray-50">
              <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
