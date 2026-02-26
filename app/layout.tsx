import type { Metadata, Viewport } from "next";
import "./globals.scss";
import "./typography.scss";
import localFont from "next/font/local";
import Providers from "./providers";

const lineSeedSansTH = localFont({
  src: "../public/fonts/LINESeedSansTH_A_Rg.ttf", // path จากไฟล์นี้
  weight: "400", // Rg = Regular ปกติคือ 400
  style: "normal",
  display: "swap",
  variable: "--font-line-seed", // ถ้าจะใช้ร่วมกับ CSS/Tailwind
});

export const metadata: Metadata = {
  title: "Ping",
  description: "Ping - AI-powered Coversational Banking Assistant.",
  icons: {
    icon: [
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [
      {
        rel: "android-chrome",
        url: "/favicon/android-chrome-192x192.png",
      },
      {
        rel: "android-chrome",
        url: "/favicon/android-chrome-512x512.png",
      },
    ],
  },
  openGraph: {
    title: "Ping",
    description: "Ping - AI-powered Coversational Banking Assistant.",
    images: [
      {
        url: "/ping_cover.png",
        width: 1200,
        height: 630,
        alt: "Ping cover image",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ping",
    description: "Ping - Coversational Banking Assistant.",
    images: ["/ping_cover.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${lineSeedSansTH.variable} `}>
      <body className={`${lineSeedSansTH.className} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
