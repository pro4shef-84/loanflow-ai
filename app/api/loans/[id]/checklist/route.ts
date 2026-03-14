import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import type { Database } from "@/lib/types/database.types";

type Params = { params: Promise<{ id: string }> };
type RequirementRow = Database["public"]["Tables"]["document_requirements"]["Row"];
type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];

type RequirementWithDocument = RequirementRow & {
  latest_document: DocumentRow | null;
};

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

  // Fetch requirements
  const { data: requirements, error: reqError } = await supabase
    .from("document_requirements")
    .select("*")
    .eq("loan_file_id", id)
    .order("created_at", { ascending: true });

  if (reqError) return NextResponse.json(errorResponse(reqError.message), { status: 500 });

  // Fetch all documents for this loan to find latest per requirement
  const { data: documents, error: docError } = await supabase
    .from("documents")
    .select("*")
    .eq("loan_file_id", id)
    .order("uploaded_at", { ascending: false });

  if (docError) return NextResponse.json(errorResponse(docError.message), { status: 500 });

  const docRows = (documents ?? []) as DocumentRow[];
  const reqRows = (requirements ?? []) as RequirementRow[];

  // For each requirement, find the latest uploaded document matching the requirement_id
  const result: RequirementWithDocument[] = reqRows.map((req) => {
    const latestDoc = docRows.find((d) => d.requirement_id === req.id) ?? null;
    return { ...req, latest_document: latestDoc };
  });

  return NextResponse.json(successResponse(result));
}
