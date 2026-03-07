import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import type { Database } from "@/lib/types/database.types";

type DocumentType = Database["public"]["Tables"]["documents"]["Row"]["type"];

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const loanFileId = formData.get("loanFileId") as string;
  const documentType = formData.get("documentType") as string | null;

  if (!file || !loanFileId) {
    return NextResponse.json(errorResponse("Missing file or loanFileId"), { status: 400 });
  }

  // Upload file to Supabase Storage
  const serviceClient = await createServiceClient();
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${user.id}/${loanFileId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await serviceClient.storage
    .from("loan-documents")
    .upload(path, buffer, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json(errorResponse(uploadError.message), { status: 500 });
  }

  // Create or update document record
  const { data: existingDoc } = await supabase
    .from("documents")
    .select("id")
    .eq("loan_file_id", loanFileId)
    .eq("type", (documentType ?? "other") as DocumentType)
    .eq("status", "pending")
    .single();

  let doc: Database["public"]["Tables"]["documents"]["Row"] | null = null;
  if (existingDoc) {
    const { data, error } = await supabase
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
    if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });
    doc = data as Database["public"]["Tables"]["documents"]["Row"];
  } else {
    const { data, error } = await supabase
      .from("documents")
      .insert({
        loan_file_id: loanFileId,
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
    if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });
    doc = data as Database["public"]["Tables"]["documents"]["Row"];
  }
  if (!doc) return NextResponse.json(errorResponse("Document creation failed"), { status: 500 });

  // Trigger AI classification + extraction in background (fire-and-forget)
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/classify-document`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId: doc.id, filename: file.name }),
  }).catch(() => {});

  return NextResponse.json(successResponse(doc), { status: 201 });
}
