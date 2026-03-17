import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { parseBody, createLoanSchema } from "@/lib/validation/api-schemas";
import { getLoanFileLimit } from "@/lib/stripe/plan-limits";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const { data, error } = await supabase
    .from("loan_files")
    .select("*, contacts(*), lenders(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });
  return NextResponse.json(successResponse(data));
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const rawBody = await request.json();
  const parsed = parseBody(createLoanSchema, rawBody);
  if (!parsed.success) {
    return NextResponse.json(errorResponse(parsed.error), { status: 400 });
  }

  // Enforce loan file limit based on subscription tier
  const { data: profile } = await supabase
    .from("users")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  const tier = profile?.subscription_tier ?? "trial";
  const limit = getLoanFileLimit(tier);

  if (limit !== null) {
    const { count } = await supabase
      .from("loan_files")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("status", "eq", "withdrawn");

    if (count !== null && count >= limit) {
      return NextResponse.json(
        errorResponse(`Your ${tier} plan allows up to ${limit} active loan files. Upgrade to Pro for unlimited files.`),
        { status: 403 }
      );
    }
  }

  const { data, error } = await supabase
    .from("loan_files")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });
  return NextResponse.json(successResponse(data), { status: 201 });
}
