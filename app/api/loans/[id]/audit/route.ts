import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse, successResponse } from "@/lib/types/api.types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  // Verify ownership
  const { data: loan } = await supabase
    .from("loan_files")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!loan) return NextResponse.json(errorResponse("Not found"), { status: 404 });

  const { data: events, error } = await supabase
    .from("file_completion_events")
    .select("*")
    .eq("loan_file_id", id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });
  return NextResponse.json(successResponse(events ?? []));
}
