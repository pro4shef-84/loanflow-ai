import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { parseBody, createDisclosureSchema, updateDisclosureSchema } from "@/lib/validation/api-schemas";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const { data: loan } = await supabase
    .from("loan_files")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!loan) return NextResponse.json(errorResponse("Not found"), { status: 404 });

  const { data, error } = await supabase
    .from("disclosures")
    .select("*")
    .eq("loan_file_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });
  return NextResponse.json(successResponse(data));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const rawBody = await request.json();
  const parsed = parseBody(createDisclosureSchema, rawBody);
  if (!parsed.success) {
    return NextResponse.json(errorResponse(parsed.error), { status: 400 });
  }

  const { data: loan } = await supabase
    .from("loan_files")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!loan) return NextResponse.json(errorResponse("Not found"), { status: 404 });

  // Set timestamp fields based on initial status
  const timestamps: Record<string, string | null> = {};
  const { status } = parsed.data;
  if (status === "sent") timestamps.sent_at = new Date().toISOString();
  if (status === "viewed") timestamps.viewed_at = new Date().toISOString();
  if (status === "signed") timestamps.signed_at = new Date().toISOString();
  if (status === "waived") timestamps.waived_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("disclosures")
    .insert({ ...parsed.data, ...timestamps, loan_file_id: id })
    .select()
    .single();

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });
  return NextResponse.json(successResponse(data), { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const rawBody = await request.json();
  const parsed = parseBody(updateDisclosureSchema, rawBody);
  if (!parsed.success) {
    return NextResponse.json(errorResponse(parsed.error), { status: 400 });
  }

  const { data: loan } = await supabase
    .from("loan_files")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!loan) return NextResponse.json(errorResponse("Not found"), { status: 404 });

  const { disclosureId, status, notes } = parsed.data;

  const timestampField: Record<string, string | null> = {};
  if (status === "sent") timestampField.sent_at = new Date().toISOString();
  if (status === "viewed") timestampField.viewed_at = new Date().toISOString();
  if (status === "signed") timestampField.signed_at = new Date().toISOString();
  if (status === "waived") timestampField.waived_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("disclosures")
    .update({ status, notes: notes ?? null, ...timestampField })
    .eq("id", disclosureId)
    .eq("loan_file_id", id)
    .select()
    .single();

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });
  return NextResponse.json(successResponse(data));
}
