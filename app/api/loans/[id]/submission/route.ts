import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { parseBody, createSubmissionSchema, updateSubmissionSchema } from "@/lib/validation/api-schemas";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  // Verify loan belongs to user before returning its submissions
  const { data: loan } = await supabase
    .from("loan_files")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!loan) return NextResponse.json(errorResponse("Not found"), { status: 404 });

  const { data, error } = await supabase
    .from("lender_submissions")
    .select("*, lenders(name, type)")
    .eq("loan_file_id", id)
    .order("submitted_at", { ascending: false });

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
  const parsed = parseBody(createSubmissionSchema, rawBody);
  if (!parsed.success) {
    return NextResponse.json(errorResponse(parsed.error), { status: 400 });
  }

  // Verify loan belongs to user
  const { data: loan } = await supabase
    .from("loan_files")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!loan) return NextResponse.json(errorResponse("Not found"), { status: 404 });

  const { lenderId, submissionType, documentsIncluded, notes } = parsed.data;

  const { data, error } = await supabase
    .from("lender_submissions")
    .insert({
      loan_file_id: id,
      lender_id: lenderId,
      submitted_by: user.id,
      submission_type: submissionType,
      status: "submitted",
      documents_included: documentsIncluded,
      notes: notes ?? null,
      submitted_at: new Date().toISOString(),
    })
    .select("*, lenders(name, type)")
    .single();

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });

  await supabase
    .from("loan_files")
    .update({ status: "submitted" })
    .eq("id", id);

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
  const parsed = parseBody(updateSubmissionSchema, rawBody);
  if (!parsed.success) {
    return NextResponse.json(errorResponse(parsed.error), { status: 400 });
  }

  // Verify loan belongs to user
  const { data: loan } = await supabase
    .from("loan_files")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!loan) return NextResponse.json(errorResponse("Not found"), { status: 404 });

  const { submissionId, status, lenderLoanNumber } = parsed.data;

  const { data, error } = await supabase
    .from("lender_submissions")
    .update({
      status,
      lender_loan_number: lenderLoanNumber ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
    .eq("loan_file_id", id)
    .select()
    .single();

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });
  return NextResponse.json(successResponse(data));
}
