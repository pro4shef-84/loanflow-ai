import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/types/api.types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const { id } = await params;
  const body = await request.json() as { status: "applied" | "dismissed" };

  if (!["applied", "dismissed"].includes(body.status)) {
    return NextResponse.json(errorResponse("Invalid status"), { status: 400 });
  }

  const serviceDb = await createServiceClient();
  const { error } = await serviceDb
    .from("heal_actions")
    .update({ status: body.status })
    .eq("id", id);

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });
  return NextResponse.json(successResponse({ id, status: body.status }));
}
