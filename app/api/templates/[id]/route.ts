import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse, successResponse } from "@/lib/types/api.types";
import { parseBody } from "@/lib/validation/api-schemas";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  category: z.string().min(1).max(50).optional(),
  channel: z.enum(["sms", "email", "both"]).optional(),
  subject: z.string().max(200).nullable().optional(),
  body: z.string().min(1).max(5000).optional(),
  variables: z.array(z.string()).optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const parsed = parseBody(updateTemplateSchema, await request.json());
  if (!parsed.success) return NextResponse.json(errorResponse(parsed.error), { status: 400 });

  // Auto-extract variables if body changed
  let variables = parsed.data.variables;
  if (parsed.data.body) {
    const bodyVars = [...(parsed.data.body.matchAll(/\{\{(\w+)\}\}/g))].map((m) => m[1]);
    variables = [...new Set([...(variables ?? []), ...bodyVars])];
  }

  const { data, error } = await supabase
    .from("message_templates")
    .update({ ...parsed.data, variables, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });
  if (!data) return NextResponse.json(errorResponse("Template not found"), { status: 404 });
  return NextResponse.json(successResponse(data));
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const { error } = await supabase
    .from("message_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });
  return NextResponse.json(successResponse({ deleted: true }));
}
