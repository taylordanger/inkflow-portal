import type { Metadata } from "next";
import { Bebas_Neue, Manrope } from "next/font/google";
import { LiveDateTime } from "@/components/live-date-time";
import "./globals.css";

const displayFont = Bebas_Neue({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Inkflow Portal",
  description:
    "A tattoo studio operating system for intake, deposits, design approval, consent, and aftercare.",
  manifest: "/site.webmanifest",
  themeColor: "#000000",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [{ rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#000000" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable} antialiased`}>
        <div className="pointer-events-none fixed right-3 top-3 z-50 sm:right-4 sm:top-4">
          <LiveDateTime variant="compact" />
        </div>
        {children}
      </body>
    </html>
  );
}
