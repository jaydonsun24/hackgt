import { getSponsorStats } from "@/lib/data/sponsor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getSponsorStats(), { headers: { "Cache-Control": "no-store" } });
}
