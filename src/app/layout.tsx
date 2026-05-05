import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cosmos Finder — Point your phone at the sky",
  description:
    "A mobile-first sky identifier. Find stars, planets, constellations, and deep-sky objects above you, in real time.",
};

export const viewport: Viewport = {
  themeColor: "#03050b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
