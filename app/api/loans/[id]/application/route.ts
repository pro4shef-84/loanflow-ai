import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { parseBody, saveApplicationSchema } from "@/lib/validation/api-schemas";
import type { Database } from "@/lib/types/database.types";

type ApplicationRow = Database["public"]["Tables"]["loan_applications"]["Row"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  // Verify the loan belongs to this user first
  const { data: loan } = await supabase
    .from("loan_files")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!loan) return NextResponse.json(errorResponse("Not found"), { status: 404 });

  const { data: application, error } = await supabase
    .from("loan_applications")
    .select("*")
    .eq("loan_file_id", id)
    .maybeSingle();

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });

  return NextResponse.json(successResponse(application));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  // Validate request body
  const rawBody = await request.json();
  const parsed = parseBody(saveApplicationSchema, rawBody);
  if (!parsed.success) {
    return NextResponse.json(errorResponse(parsed.error), { status: 400 });
  }

  // Verify the loan belongs to this user
  const { data: loan } = await supabase
    .from("loan_files")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!loan) return NextResponse.json(errorResponse("Not found"), { status: 404 });

  // Upsert — creates on first save, updates on subsequent saves
  const payload: Database["public"]["Tables"]["loan_applications"]["Insert"] = {
    ...parsed.data,
    loan_file_id: id,
    other_assets: (parsed.data.other_assets ?? []) as Database["public"]["Tables"]["loan_applications"]["Insert"]["other_assets"],
    liabilities: (parsed.data.liabilities ?? []) as Database["public"]["Tables"]["loan_applications"]["Insert"]["liabilities"],
    co_borrower: (parsed.data.co_borrower ?? null) as Database["public"]["Tables"]["loan_applications"]["Insert"]["co_borrower"],
  };

  const { data, error } = await supabase
    .from("loan_applications")
    .upsert(payload, { onConflict: "loan_file_id" })
    .select()
    .single();

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });

  const result = data as ApplicationRow;
  return NextResponse.json(successResponse(result));
}
