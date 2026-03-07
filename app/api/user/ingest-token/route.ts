import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHmac } from "crypto";

function generateIngestToken(userId: string): string {
  const secret = process.env.INGEST_TOKEN_SECRET ?? "changeme-set-INGEST_TOKEN_SECRET";
  return createHmac("sha256", secret).update(userId).digest("hex").slice(0, 32);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = generateIngestToken(user.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://loanflow-ai-six.vercel.app";
  const webhookUrl = `${appUrl}/api/webhooks/email-inbound?uid=${user.id}&token=${token}`;

  return NextResponse.json({ webhookUrl, userId: user.id, token });
}
