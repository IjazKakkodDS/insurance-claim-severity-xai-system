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
      <body className="h-full">
        <div className="flex h-full">

          {/* Sidebar */}
          <Sidebar />

          {/* Main Content Area */}
          <main className="flex-1 bg-neutral-950 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>

        </div>
      </body>
    </html>
  );
}