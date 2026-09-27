import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Shell } from "@/components/Shell";
import "./globals.css";

const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-sans" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], display: "swap", variable: "--font-mono" });

export const metadata: Metadata = {
  title: {
    default: "Refera — Clinical trials for every clinic",
    template: "%s — Refera",
  },
  description:
    "Refera helps doctors at rural and underserved clinics find recruiting clinical trials from a de-identified note. Nothing is stored.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="font-sans">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
