import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Claim Severity Intelligence Platform",
  description: "Enterprise ML Decision Intelligence System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full bg-black text-white`}
    >
      <body className="min-h-screen bg-black text-white">
        <div className="flex min-h-screen bg-black">
          {/* Sidebar */}
          <Sidebar />

          {/* Main Content Area */}
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-neutral-950">
            <div className="mx-auto w-full max-w-7xl px-4 pb-6 pt-20 sm:px-6 sm:pb-8 md:pt-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}