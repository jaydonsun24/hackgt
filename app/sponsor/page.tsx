import type { Metadata } from "next";
import { SponsorDashboard } from "@/components/SponsorDashboard";
import { getSponsorStats } from "@/lib/data/sponsor";

export const metadata: Metadata = {
  title: "Sponsor dashboard",
  description: "Simulated referral stats for the Refera sponsor story.",
};

export default function SponsorPage() {
  return <SponsorDashboard stats={getSponsorStats()} />;
}
