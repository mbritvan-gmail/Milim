import type { Metadata, Viewport } from "next";
import { Assistant, Heebo, Inter } from "next/font/google";
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

// The Home screen title. A named web font so it looks the same on every device (system fonts differ).
const titleFont = Heebo({
  variable: "--font-title",
  subsets: ["hebrew"],
  weight: "800",
});

export const metadata: Metadata = {
  title: "milim",
  description: "Learn Hebrew through the songs you love.",
};

export const viewport: Viewport = {
  themeColor: "#0b0f17",
  colorScheme: "dark light",
};

// Sets the saved theme (System / Light / Dark; dark by default) before the first paint so there is no flash.
const THEME_SCRIPT = `try{var t=localStorage.getItem("milim-theme");document.documentElement.dataset.theme=t==="light"||t==="system"?t:"dark"}catch(e){document.documentElement.dataset.theme="dark"}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${inter.variable} ${hebrewFont.variable} ${titleFont.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
