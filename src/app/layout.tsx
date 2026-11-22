import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const bodyFont = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});
const headingFont = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: {
    default: "CapItUp",
    template: "%s · CapItUp",
  },
  description: "Private publicity caption workspace",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`dark ${bodyFont.variable} ${headingFont.variable}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-dvh bg-background text-foreground antialiased selection:bg-[var(--lavender)]/30 selection:text-[var(--canvas)]"
      >
        {children}
      </body>
    </html>
  );
}
