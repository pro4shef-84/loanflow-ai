import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { flashModel, extractJson } from "@/lib/ai/client";
import type { Json } from "@/lib/types/database.types";
import { successResponse, errorResponse } from "@/lib/types/api.types";

// Vercel serverless function timeout — 60s for Pro, 10s for Hobby
export const maxDuration = 60;

const PARSE_PROMPT = `You are parsing a mortgage lender rate sheet PDF.
Extract all rate pricing data and return ONLY a valid JSON object in this exact structure:

{
  "lender_name": "string (lender name from the document)",
  "effective_date": "YYYY-MM-DD or null",
  "expires_date": "YYYY-MM-DD or null",
  "programs": [
    {
      "key": "30yr_fixed | 20yr_fixed | 15yr_fixed | 10yr_fixed | 7_1_arm | 5_1_arm",
      "label": "human-readable program name",
      "rates": [
        { "rate": 6.875, "par_price": 100.125, "points": -0.125 }
      ]
    }
  ],
  "base_adjustments": {
    "description": "brief text summary of key pricing adjustors found (LTV hits, credit score tiers, etc.)"
  }
}

Rules:
- "points" is negative when the lender pays the broker (premium pricing), positive when borrower pays
- par_price 100.000 = 0 points. 100.5 = -0.5 points (credit). 99.5 = +0.5 points (cost)
- Include ALL programs found. Map them to the closest key above.
- If you cannot parse a program, skip it.
- Return ONLY the JSON, no markdown, no explanation, no code blocks.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(errorResponse("Invalid form data"), { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const lenderName = (formData.get("lenderName") as string | null)?.trim() ?? "Unknown Lender";

  if (!file) return NextResponse.json(errorResponse("No file provided"), { status: 400 });
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json(errorResponse("Only PDF files are supported"), { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json(errorResponse("File too large (max 20MB)"), { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const path = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  // Use service client for BOTH storage and DB to avoid RLS issues
  const serviceClient = await createServiceClient();

  // Step 1: Upload to storage
  const { error: uploadError } = await serviceClient.storage
    .from("rate-sheets")
    .upload(path, buffer, { contentType: "application/pdf", upsert: false });

  if (uploadError) {
    console.error("[rate-sheets/upload] Storage error:", uploadError);
    return NextResponse.json(errorResponse(`Storage error: ${uploadError.message}`), { status: 500 });
  }

  // Step 2: Create DB record (use service client to bypass RLS)
  const { data: sheetRecord, error: insertError } = await serviceClient
    .from("rate_sheets")
    .insert({
      user_id: user.id,
      lender_name: lenderName,
      file_path: path,
      original_filename: file.name,
      status: "processing",
    })
    .select("id")
    .single();

  if (insertError || !sheetRecord) {
    console.error("[rate-sheets/upload] DB insert error:", insertError);
    return NextResponse.json(
      errorResponse(`Failed to create rate sheet record: ${insertError?.message ?? "unknown"}`),
      { status: 500 }
    );
  }

  // Step 3: Parse with Gemini
  const pdfBase64 = Buffer.from(buffer).toString("base64");

  let parsedRates: Json | null = null;
  let parseError: string | null = null;
  let effectiveDate: string | null = null;
  let expiresAt: string | null = null;
  let parsedLenderName = lenderName;

  try {
    const result = await flashModel.generateContent([
      { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
      { text: PARSE_PROMPT },
    ]);

    const rawText = result.response.text();
    const jsonText = extractJson(rawText);
    const parsed = JSON.parse(jsonText);

    parsedRates = parsed as Json;
    parsedLenderName = parsed.lender_name ?? lenderName;
    effectiveDate = parsed.effective_date ?? null;
    if (parsed.expires_date) {
      expiresAt = new Date(parsed.expires_date).toISOString();
    }
  } catch (err: unknown) {
    let msg = "Failed to parse rate sheet";
    if (err instanceof Error) {
      msg = err.message;
    }

    // Detect billing / quota errors and surface a user-friendly message
    const errString = String(err);
    if (
      errString.includes("quota") ||
      errString.includes("billing") ||
      errString.includes("RESOURCE_EXHAUSTED")
    ) {
      msg = "AI parsing is temporarily unavailable (quota limit reached). The file was uploaded — parsing will be retried.";
    }

    console.error("[rate-sheets/upload] Parse error:", errString);
    parseError = msg;
  }

  // Step 4: Update DB with results (use service client)
  const { data: updated, error: updateError } = await serviceClient
    .from("rate_sheets")
    .update({
      lender_name: parsedLenderName,
      effective_date: effectiveDate,
      expires_at: expiresAt,
      parsed_rates: parsedRates,
      parse_error: parseError,
      status: parsedRates ? "parsed" : "failed",
    })
    .eq("id", sheetRecord.id)
    .select()
    .single();

  if (updateError) {
    console.error("[rate-sheets/upload] Update error:", updateError);
    return NextResponse.json(errorResponse("Parse completed but failed to save results"), { status: 500 });
  }

  return NextResponse.json(successResponse(updated), { status: 201 });
}
