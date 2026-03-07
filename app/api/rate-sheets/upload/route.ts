import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/lib/anthropic/client";
import type { Json } from "@/lib/types/database.types";
import { successResponse, errorResponse } from "@/lib/types/api.types";

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
- Return ONLY the JSON, no markdown, no explanation.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const lenderName = (formData.get("lenderName") as string | null)?.trim() ?? "Unknown Lender";

  if (!file) return NextResponse.json(errorResponse("No file provided"), { status: 400 });
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json(errorResponse("Only PDF files are supported"), { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json(errorResponse("File too large (max 20MB)"), { status: 400 });
  }

  // Store to Supabase Storage
  const serviceClient = await createServiceClient();
  const path = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await serviceClient.storage
    .from("rate-sheets")
    .upload(path, buffer, { contentType: "application/pdf", upsert: false });

  if (uploadError) {
    return NextResponse.json(errorResponse(`Storage error: ${uploadError.message}`), { status: 500 });
  }

  // Create DB record immediately so UI shows "processing" state
  const { data: sheetRecord, error: insertError } = await supabase
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
    return NextResponse.json(errorResponse("Failed to create rate sheet record"), { status: 500 });
  }

  // Send PDF to Claude for parsing
  const pdfBase64 = Buffer.from(buffer).toString("base64");

  let parsedRates: Json | null = null;
  let parseError: string | null = null;
  let effectiveDate: string | null = null;
  let expiresAt: string | null = null;
  let parsedLenderName = lenderName;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            } as Anthropic.DocumentBlockParam,
            {
              type: "text",
              text: PARSE_PROMPT,
            } as Anthropic.TextBlockParam,
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "{}";
    const parsed = JSON.parse(text);

    parsedRates = parsed as Json;
    parsedLenderName = parsed.lender_name ?? lenderName;
    effectiveDate = parsed.effective_date ?? null;
    if (parsed.expires_date) {
      expiresAt = new Date(parsed.expires_date).toISOString();
    }
  } catch (err) {
    parseError = err instanceof Error ? err.message : "Failed to parse rate sheet";
  }

  // Update DB record with results
  const { data: updated, error: updateError } = await supabase
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
    return NextResponse.json(errorResponse("Parse completed but failed to save"), { status: 500 });
  }

  return NextResponse.json(successResponse(updated), { status: 201 });
}
