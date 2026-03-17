import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse, successResponse } from "@/lib/types/api.types";
import { parseBody } from "@/lib/validation/api-schemas";
import { z } from "zod";
import { UnderwritingNarrativeAgent } from "@/lib/agents/underwritingNarrativeAgent";
import { canAccess } from "@/lib/stripe/plan-limits";

const schema = z.object({
  loanFileId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

    // Gate to Pro+ plans
    const { data: profile } = await supabase
      .from("users")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    if (!canAccess(profile?.subscription_tier ?? "trial", "underwriting_narrative")) {
      return NextResponse.json(
        errorResponse("Underwriting Narrative requires a Pro or Team plan."),
        { status: 403 }
      );
    }

    const parsed = parseBody(schema, await request.json());
    if (!parsed.success) return NextResponse.json(errorResponse(parsed.error), { status: 400 });

    const agent = new UnderwritingNarrativeAgent();
    const result = await agent.generate(parsed.data.loanFileId, user.id);

    return NextResponse.json(successResponse(result));
  } catch (err) {
    console.error("[underwriting-narrative]", err);
    return NextResponse.json(errorResponse("Narrative generation failed"), { status: 500 });
  }
}
