import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Shell } from "@/components/Shell";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "TrialPath — Clinical trials for every clinic",
    template: "%s — TrialPath",
  },
  description:
    "TrialPath helps doctors at rural and underserved clinics find recruiting clinical trials from a de-identified note. Nothing is stored.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
