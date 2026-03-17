import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { z } from "zod";
import { parseBody } from "@/lib/validation/api-schemas";

type Params = { params: Promise<{ token: string }> };

const signSchema = z.object({
  disclosureId: z.string().uuid(),
  signatureDataUrl: z.string().startsWith("data:image/"),
});

export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;
  const supabase = await createServiceClient();

  const { data: loan } = await supabase
    .from("loan_files")
    .select("id, portal_expires_at")
    .eq("portal_token", token)
    .single();

  if (!loan) return NextResponse.json(errorResponse("Invalid portal link"), { status: 404 });
  if (loan.portal_expires_at && new Date(loan.portal_expires_at) < new Date()) {
    return NextResponse.json(errorResponse("Portal link expired"), { status: 410 });
  }

  const parsed = parseBody(signSchema, await request.json());
  if (!parsed.success) return NextResponse.json(errorResponse(parsed.error), { status: 400 });

  // Verify the disclosure belongs to this loan
  const { data: disclosure } = await supabase
    .from("disclosures")
    .select("id, status, disclosure_type")
    .eq("id", parsed.data.disclosureId)
    .eq("loan_file_id", loan.id)
    .single();

  if (!disclosure) return NextResponse.json(errorResponse("Disclosure not found"), { status: 404 });
  if (disclosure.status === "signed") {
    return NextResponse.json(errorResponse("Already signed"), { status: 409 });
  }

  // Convert base64 data URL to buffer and upload to Supabase Storage
  const base64Data = parsed.data.signatureDataUrl.split(",")[1];
  if (!base64Data) return NextResponse.json(errorResponse("Invalid signature data"), { status: 400 });

  const signatureBuffer = Buffer.from(base64Data, "base64");
  const signaturePath = `signatures/${loan.id}/${parsed.data.disclosureId}.png`;

  const { error: storageError } = await supabase.storage
    .from("documents")
    .upload(signaturePath, signatureBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (storageError) {
    console.error("[portal/sign] Storage upload failed:", storageError.message);
    return NextResponse.json(errorResponse("Failed to save signature"), { status: 500 });
  }

  // Update disclosure to signed
  const now = new Date().toISOString();
  await supabase
    .from("disclosures")
    .update({
      status: "signed" as const,
      signed_at: now,
      method: "electronic" as const,
      updated_at: now,
    })
    .eq("id", parsed.data.disclosureId);

  // Log event
  await supabase.from("file_completion_events").insert({
    loan_file_id: loan.id,
    event_type: "disclosure_signed",
    actor: "borrower",
    payload: {
      disclosure_id: parsed.data.disclosureId,
      disclosure_type: disclosure.disclosure_type,
      signature_path: signaturePath,
      signed_at: now,
    },
  });

  return NextResponse.json(successResponse({ signed: true, signedAt: now }));
}
