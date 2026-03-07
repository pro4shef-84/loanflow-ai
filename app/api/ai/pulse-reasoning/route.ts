import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic/client";
import { getModelForTask } from "@/lib/anthropic/token-router";
import { buildPulseReasoningPrompt } from "@/lib/anthropic/prompts/pulse-reasoning";
import { maskObject } from "@/lib/utils/pii-masker";
import { trackTokenUsage } from "@/lib/utils/token-tracker";
import { estimateCost } from "@/lib/anthropic/token-router";
import { successResponse, errorResponse } from "@/lib/types/api.types";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

    const body = await request.json();
    const { contactId, eventType, eventData } = body;

    if (!contactId || !eventType) {
      return NextResponse.json(errorResponse("contactId and eventType required"), { status: 400 });
    }

    const { data: contact } = await supabase.from("contacts").select("*").eq("id", contactId).single();
    if (!contact) return NextResponse.json(errorResponse("Contact not found"), { status: 404 });

    const maskedContact = maskObject(contact);
    const model = getModelForTask("pulse-summary");
    const prompt = buildPulseReasoningPrompt(maskedContact, eventType, eventData ?? {});

    const response = await anthropic.messages.create({
      model,
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const parsed = JSON.parse(text);

    // Create pulse event if should reach out
    if (parsed.should_reach_out) {
      await supabase.from("pulse_events").insert({
        contact_id: contactId,
        user_id: user.id,
        event_type: eventType,
        event_data: eventData ?? {},
        reasoning: parsed.reasoning,
        action_taken: "pending",
        detected_at: new Date().toISOString(),
      });
    }

    await trackTokenUsage({
      userId: user.id,
      module: "pulse-reasoning",
      model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      costUsd: estimateCost("pulse-summary", response.usage.input_tokens, response.usage.output_tokens),
    });

    return NextResponse.json(successResponse(parsed));
  } catch (err) {
    console.error("[pulse-reasoning]", err);
    return NextResponse.json(errorResponse("Pulse reasoning failed"), { status: 500 });
  }
}
