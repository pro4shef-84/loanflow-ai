import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import type { Database } from "@/lib/types/database.types";

type LoanFileRow = Database["public"]["Tables"]["loan_files"]["Row"];
type DocumentType = Database["public"]["Tables"]["documents"]["Row"]["type"];

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { token } = await params;
  const supabase = await createServiceClient();

  const { data: loan, error } = await supabase
    .from("loan_files")
    .select("*, documents(*)")
    .eq("portal_token", token)
    .single();

  if (error || !loan) return NextResponse.json(errorResponse("Not found"), { status: 404 });

  const loanData = loan as unknown as LoanFileRow & { documents: Database["public"]["Tables"]["documents"]["Row"][] };

  // Check expiry
  if (loanData.portal_expires_at && new Date(loanData.portal_expires_at) < new Date()) {
    return NextResponse.json(errorResponse("Portal link expired"), { status: 410 });
  }

  return NextResponse.json(successResponse(loanData));
}

export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;
  const supabase = await createServiceClient();

  // Verify token
  const { data: loan } = await supabase
    .from("loan_files")
    .select("id, portal_expires_at")
    .eq("portal_token", token)
    .single();

  if (!loan) return NextResponse.json(errorResponse("Invalid portal link"), { status: 404 });
  const loanPost = loan as unknown as Pick<LoanFileRow, "id" | "portal_expires_at">;
  if (loanPost.portal_expires_at && new Date(loanPost.portal_expires_at) < new Date()) {
    return NextResponse.json(errorResponse("Portal link expired"), { status: 410 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const documentType = formData.get("documentType") as string | null;

  if (!file) return NextResponse.json(errorResponse("No file provided"), { status: 400 });

  const ext = file.name.split(".").pop() ?? "bin";
  const path = `portal/${loanPost.id}/${Date.now()}.${ext}`;

  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("loan-documents")
    .upload(path, buffer, { contentType: file.type });

  if (uploadError) return NextResponse.json(errorResponse(uploadError.message), { status: 500 });

  type DocRow = Database["public"]["Tables"]["documents"]["Row"];

  // Find existing pending document of this type
  const { data: existing } = await supabase
    .from("documents")
    .select("id")
    .eq("loan_file_id", loanPost.id)
    .eq("type", (documentType ?? "other") as DocumentType)
    .eq("status", "pending")
    .single();

  const existingDoc = existing as { id: string } | null;
  let doc: DocRow | null = null;
  if (existingDoc) {
    const { data } = await supabase
      .from("documents")
      .update({
        status: "uploaded",
        file_path: path,
        original_filename: file.name,
        file_size_bytes: file.size,
        mime_type: file.type,
        uploaded_at: new Date().toISOString(),
      })
      .eq("id", existingDoc.id)
      .select()
      .single();
    doc = data as DocRow;
  } else {
    const { data } = await supabase
      .from("documents")
      .insert({
        loan_file_id: loanPost.id,
        type: (documentType ?? "other") as DocumentType,
        status: "uploaded",
        file_path: path,
        original_filename: file.name,
        file_size_bytes: file.size,
        mime_type: file.type,
        uploaded_at: new Date().toISOString(),
        required: false,
      })
      .select()
      .single();
    doc = data as DocRow;
  }

  return NextResponse.json(successResponse(doc), { status: 201 });
}
