import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { z } from "zod";
import { parseBody } from "@/lib/validation/api-schemas";

const createContactSchema = z.object({
  type: z.enum(["borrower", "realtor", "title", "other"]),
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  email: z.string().email().optional().or(z.literal("")).or(z.literal(null)),
  phone: z.string().max(20).optional().or(z.literal(null)),
  address: z.string().max(200).optional().or(z.literal(null)),
  city: z.string().max(100).optional().or(z.literal(null)),
  state: z.string().max(2).optional().or(z.literal(null)),
  zip: z.string().max(10).optional().or(z.literal(null)),
  property_value: z.number().positive().optional().or(z.literal(null)),
  loan_balance: z.number().min(0).optional().or(z.literal(null)),
  note_rate: z.number().min(0).optional().or(z.literal(null)),
  loan_close_date: z.string().optional().or(z.literal(null)),
  pulse_active: z.boolean().optional(),
});

const updateContactSchema = createContactSchema.partial();

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", user.id)
    .order("last_name", { ascending: true });

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });
  return NextResponse.json(successResponse(data));
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const rawBody = await request.json();
  const parsed = parseBody(createContactSchema, rawBody);
  if (!parsed.success) {
    return NextResponse.json(errorResponse(parsed.error), { status: 400 });
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });
  return NextResponse.json(successResponse(data), { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const rawBody = await request.json();
  const { id, ...rest } = rawBody;

  if (!id || typeof id !== "string") {
    return NextResponse.json(errorResponse("Contact id is required"), { status: 400 });
  }

  const parsed = parseBody(updateContactSchema, rest);
  if (!parsed.success) {
    return NextResponse.json(errorResponse(parsed.error), { status: 400 });
  }

  const { data, error } = await supabase
    .from("contacts")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });
  return NextResponse.json(successResponse(data));
}
