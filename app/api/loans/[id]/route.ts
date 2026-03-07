import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/types/api.types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const { data, error } = await supabase
    .from("loan_files")
    .select("*, contacts(*), lenders(*), documents(*), conditions(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) return NextResponse.json(errorResponse(error.message), { status: 404 });
  return NextResponse.json(successResponse(data));
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const body = await request.json();
  const { data, error } = await supabase
    .from("loan_files")
    .update(body)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });
  return NextResponse.json(successResponse(data));
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const { error } = await supabase
    .from("loan_files")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });
  return NextResponse.json(successResponse({ deleted: true }));
}
