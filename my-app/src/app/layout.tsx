import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "daydream.ai",
  description: "Cute planner for meaningful local adventures",
  icons: {
    icon: "/cute-icon.svg",
    shortcut: "/cute-icon.svg",
    apple: "/cute-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <footer aria-label="Site footer" className="mt-12">
          <div className="mx-auto max-w-5xl px-4 py-3">
            <div className="rounded-2xl border border-pink-200 bg-white shadow-sm px-3 py-2 text-center text-xs text-pink-700">
              ✿ Made by <span className="font-medium">Stella</span> &amp; <span className="font-medium">Vicki</span> © 2025
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
