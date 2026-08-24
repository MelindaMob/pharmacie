import type { Metadata } from "next";
import { Fraunces, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import Header from "@/components/Header";
import AuthRedirectHandler from "@/components/AuthRedirectHandler";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Secretar.IA",
  description: "Plateforme de gestion pour pharmacies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${fraunces.variable} ${publicSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body
        className={`${fraunces.variable} ${publicSans.variable} ${plexMono.variable} font-[family-name:var(--font-body)] min-h-full flex flex-col`}
      >
        <AuthRedirectHandler />
        <Header />
        {children}
      </body>
    </html>
  );
}
