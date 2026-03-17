import { NextRequest, NextResponse } from "next/server";
import { FollowUpAgent } from "@/lib/agents/followUpAgent";

/**
 * Vercel Cron Route — runs daily at 9am UTC.
 * Secured with CRON_SECRET header (set in Vercel env vars).
 */
export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized invocation
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const agent = new FollowUpAgent();
    const results = await agent.processAllPendingLoans();

    const summary = {
      total: results.length,
      reminders_sent: results.filter((r) => r.action === "reminder_sent").length,
      marked_unresponsive: results.filter((r) => r.action === "marked_unresponsive").length,
      skipped: results.filter((r) => r.action === "skipped").length,
      errors: results.filter((r) => r.error).length,
    };

    console.log("[cron/follow-up] Completed:", summary);
    return NextResponse.json({ success: true, summary, results });
  } catch (err) {
    console.error("[cron/follow-up] Fatal error:", err);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
