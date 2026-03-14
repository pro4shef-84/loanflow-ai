import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { flashModel, extractJson } from "@/lib/ai/client";
import { createHmac, timingSafeEqual } from "crypto";
import type { Json } from "@/lib/types/database.types";

// Same prompt as the upload route
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

function generateIngestToken(userId: string): string {
  const secret = process.env.INGEST_TOKEN_SECRET ?? "changeme-set-INGEST_TOKEN_SECRET";
  return createHmac("sha256", secret).update(userId).digest("hex").slice(0, 32);
}

function verifyToken(token: string, userId: string): boolean {
  const expected = generateIngestToken(userId);
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const userId = searchParams.get("uid");

  if (!token || !userId || !verifyToken(token, userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = await createServiceClient();

  // Verify user exists
  const { data: userRow } = await serviceClient
    .from("users")
    .select("id")
    .eq("id", userId)
    .single();

  if (!userRow) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Parse SendGrid multipart form
  const formData = await request.formData();
  const subject = (formData.get("subject") as string | null) ?? "Email Rate Sheet";
  const attachmentCount = parseInt((formData.get("attachments") as string | null) ?? "0", 10);

  if (attachmentCount === 0) {
    return NextResponse.json({ message: "No attachments found — nothing to process" });
  }

  const results: Array<{ filename: string; status: string; sheetId?: string }> = [];

  // SendGrid attaches files as attachment1, attachment2, etc.
  for (let i = 1; i <= attachmentCount; i++) {
    const file = formData.get(`attachment${i}`) as File | null;
    if (!file) continue;

    const filename = file.name ?? `attachment${i}`;
    if (!filename.toLowerCase().endsWith(".pdf")) {
      results.push({ filename, status: "skipped — not a PDF" });
      continue;
    }

    const buffer = await file.arrayBuffer();
    const path = `${userId}/${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    // Upload to storage
    const { error: uploadError } = await serviceClient.storage
      .from("rate-sheets")
      .upload(path, buffer, { contentType: "application/pdf", upsert: false });

    if (uploadError) {
      results.push({ filename, status: `storage error: ${uploadError.message}` });
      continue;
    }

    // Create DB record
    const { data: sheetRecord, error: insertError } = await serviceClient
      .from("rate_sheets")
      .insert({
        user_id: userId,
        lender_name: subject,
        file_path: path,
        original_filename: filename,
        status: "processing",
      })
      .select("id")
      .single();

    if (insertError || !sheetRecord) {
      results.push({ filename, status: "db insert error" });
      continue;
    }

    // Parse with Gemini
    const pdfBase64 = Buffer.from(buffer).toString("base64");
    let parsedRates: Json | null = null;
    let parseError: string | null = null;
    let parsedLenderName = subject;
    let effectiveDate: string | null = null;
    let expiresAt: string | null = null;

    try {
      const result = await flashModel.generateContent([
        { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
        { text: PARSE_PROMPT },
      ]);

      const text = result.response.text().trim();
      const parsed = JSON.parse(extractJson(text));
      parsedRates = parsed as Json;
      parsedLenderName = parsed.lender_name ?? subject;
      effectiveDate = parsed.effective_date ?? null;
      if (parsed.expires_date) expiresAt = new Date(parsed.expires_date).toISOString();
    } catch (err) {
      parseError = err instanceof Error ? err.message : "Parse failed";
    }

    await serviceClient
      .from("rate_sheets")
      .update({
        lender_name: parsedLenderName,
        effective_date: effectiveDate,
        expires_at: expiresAt,
        parsed_rates: parsedRates,
        parse_error: parseError,
        status: parsedRates ? "parsed" : "failed",
      })
      .eq("id", sheetRecord.id);

    results.push({ filename, status: parsedRates ? "parsed" : "failed", sheetId: sheetRecord.id });
  }

  return NextResponse.json({ processed: results.length, results });
}
