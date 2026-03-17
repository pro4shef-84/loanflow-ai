import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { z } from "zod";
import { parseBody } from "@/lib/validation/api-schemas";

type Params = { params: Promise<{ token: string }> };

const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});

async function getLoanByToken(token: string) {
  const supabase = await createServiceClient();
  const { data: loan } = await supabase
    .from("loan_files")
    .select("id, portal_expires_at, user_id")
    .eq("portal_token", token)
    .single();

  if (!loan) return null;
  if (loan.portal_expires_at && new Date(loan.portal_expires_at) < new Date()) return null;
  return { loan, supabase };
}

// GET — fetch portal message thread for this loan
export async function GET(_request: NextRequest, { params }: Params) {
  const { token } = await params;
  const ctx = await getLoanByToken(token);
  if (!ctx) return NextResponse.json(errorResponse("Invalid or expired portal link"), { status: 404 });

  const { data: messages, error } = await ctx.supabase
    .from("messages")
    .select("id, direction, content, created_at, status")
    .eq("loan_file_id", ctx.loan.id)
    .eq("channel", "in_app")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });
  return NextResponse.json(successResponse(messages ?? []));
}

// POST — borrower sends a message
export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;
  const ctx = await getLoanByToken(token);
  if (!ctx) return NextResponse.json(errorResponse("Invalid or expired portal link"), { status: 404 });

  const parsed = parseBody(sendMessageSchema, await request.json());
  if (!parsed.success) return NextResponse.json(errorResponse(parsed.error), { status: 400 });

  const { data, error } = await ctx.supabase
    .from("messages")
    .insert({
      loan_file_id: ctx.loan.id,
      user_id: ctx.loan.user_id, // LO's user_id for RLS
      channel: "in_app" as const,
      direction: "inbound" as const,
      recipient_type: "lo" as const,
      content: parsed.data.content,
      status: "delivered" as const,
      sent_at: new Date().toISOString(),
    })
    .select("id, direction, content, created_at, status")
    .single();

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });

  // Log event
  await ctx.supabase.from("file_completion_events").insert({
    loan_file_id: ctx.loan.id,
    event_type: "borrower_message_sent",
    actor: "borrower",
    payload: { message_id: data?.id },
  });

  return NextResponse.json(successResponse(data), { status: 201 });
}
