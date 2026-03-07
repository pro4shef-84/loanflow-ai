import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/types/api.types";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const loanFileId = request.nextUrl.searchParams.get("loanFileId");
  if (!loanFileId) return NextResponse.json(errorResponse("loanFileId required"), { status: 400 });

  const { data, error } = await supabase
    .from("conditions")
    .select("*")
    .eq("loan_file_id", loanFileId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });
  return NextResponse.json(successResponse(data));
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const body = await request.json();
  const { data, error } = await supabase
    .from("conditions")
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });
  return NextResponse.json(successResponse(data), { status: 201 });
}
