import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

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
    <html lang="en" className="dark">
      <body
        suppressHydrationWarning
        className="min-h-dvh bg-background text-foreground antialiased selection:bg-[var(--lavender)]/30 selection:text-white"
      >
        {children}
      </body>
    </html>
  );
}
