import type { Metadata, Viewport } from "next";
import { Assistant, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Hebrew text font. To try another, swap this import (e.g. Rubik, Noto_Sans_Hebrew, Frank_Ruhl_Libre).
const hebrewFont = Assistant({
  variable: "--font-hebrew-face",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "milim",
  description: "Learn Hebrew through the songs you love.",
};

export const viewport: Viewport = {
  themeColor: "#0b0f17",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${hebrewFont.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
