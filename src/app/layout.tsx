import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { ClientProviders } from "@/components/ClientProviders";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Waitless — Smart Queue & Token Management",
  description:
    "Take a token from your phone, track the live queue, and get notified when it's your turn. No app download needed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><ClientProviders>{children}</ClientProviders></body>
    </html>
  );
}
