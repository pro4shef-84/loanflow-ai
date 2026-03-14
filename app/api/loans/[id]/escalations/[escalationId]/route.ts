import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseBody, resolveEscalationSchema } from "@/lib/validation/api-schemas";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import type { Database } from "@/lib/types/database.types";

type Params = { params: Promise<{ id: string; escalationId: string }> };
type EscalationUpdate = Database["public"]["Tables"]["escalations"]["Update"];

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id, escalationId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  // Verify ownership on the loan
  const { data: loan } = await supabase
    .from("loan_files")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!loan) return NextResponse.json(errorResponse("Not found"), { status: 404 });

  // Validate body
  const body = await request.json();
  const parsed = parseBody(resolveEscalationSchema, body);
  if (!parsed.success) return NextResponse.json(errorResponse(parsed.error), { status: 400 });

  const { action, resolution } = parsed.data;

  // Resolve requires resolution text
  if (action === "resolve" && !resolution) {
    return NextResponse.json(errorResponse("Resolution text is required when resolving"), { status: 400 });
  }

  // Build update
  const now = new Date().toISOString();
  const update: EscalationUpdate = action === "resolve"
    ? { status: "resolved", resolution_notes: resolution ?? null, resolved_at: now, updated_at: now }
    : { status: "dismissed", updated_at: now };

  const { data: updated, error } = await supabase
    .from("escalations")
    .update(update)
    .eq("id", escalationId)
    .eq("loan_file_id", id)
    .select()
    .single();

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });
  if (!updated) return NextResponse.json(errorResponse("Escalation not found"), { status: 404 });

  // Log event
  const eventType = action === "resolve" ? "escalation_resolved" : "escalation_dismissed";
  await supabase.from("file_completion_events").insert({
    loan_file_id: id,
    event_type: eventType,
    actor: "officer",
    payload: { escalation_id: escalationId, action, resolution: resolution ?? null },
  });

  return NextResponse.json(successResponse(updated));
}
