import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse, successResponse } from "@/lib/types/api.types";
import { parseBody } from "@/lib/validation/api-schemas";
import { z } from "zod";

const DEFAULT_TEMPLATES = [
  {
    name: "Missing Document Request",
    category: "documents",
    channel: "email" as const,
    subject: "Action Required: Missing Documents for Your Loan",
    body: "Hi {{borrower_name}},\n\nI hope you're doing well! I'm reaching out because we still need a few documents to move your loan forward:\n\n{{missing_docs}}\n\nPlease upload these at your earliest convenience using your secure portal: {{portal_link}}\n\nIf you have any questions, don't hesitate to reach out.\n\nBest regards,\n{{lo_name}}\n{{lo_phone}}",
    variables: ["borrower_name", "missing_docs", "portal_link", "lo_name", "lo_phone"],
    is_default: true,
  },
  {
    name: "Loan Approved",
    category: "status",
    channel: "email" as const,
    subject: "Congratulations! Your Loan Has Been Approved",
    body: "Hi {{borrower_name}},\n\nGreat news — your loan for {{property_address}} has been approved!\n\nLoan Amount: {{loan_amount}}\nClosing Date: {{closing_date}}\n\nWe still have a few conditions to clear. I'll be in touch shortly with next steps.\n\nCongratulations!\n\n{{lo_name}}",
    variables: ["borrower_name", "property_address", "loan_amount", "closing_date", "lo_name"],
    is_default: true,
  },
  {
    name: "Clear to Close",
    category: "status",
    channel: "sms" as const,
    subject: null,
    body: "Great news {{borrower_name}}! Your loan is Clear to Close. Your closing is scheduled for {{closing_date}}. You'll receive final numbers 3 days before. Call me with any questions: {{lo_phone}}",
    variables: ["borrower_name", "closing_date", "lo_phone"],
    is_default: true,
  },
  {
    name: "Rate Lock Expiring",
    category: "urgent",
    channel: "both" as const,
    subject: "Action Required: Your Rate Lock Expires {{expiry_date}}",
    body: "Hi {{borrower_name}},\n\nYour rate lock of {{rate}}% expires on {{expiry_date}}. To protect your rate, we need to close by this date.\n\nPlease review any outstanding items in your portal and contact me immediately if there are any delays.\n\n{{lo_name}} | {{lo_phone}}",
    variables: ["borrower_name", "rate", "expiry_date", "lo_name", "lo_phone"],
    is_default: true,
  },
  {
    name: "Conditions Received",
    category: "documents",
    channel: "email" as const,
    subject: "Lender Conditions Received for Your Loan",
    body: "Hi {{borrower_name}},\n\nThe lender has issued conditions for your loan approval. Here's what we still need:\n\n{{conditions_list}}\n\nI'll be working through these with you. Some may require your assistance — I'll reach out for each one as needed.\n\nAim to have all conditions cleared by {{target_date}}.\n\n{{lo_name}}",
    variables: ["borrower_name", "conditions_list", "target_date", "lo_name"],
    is_default: true,
  },
];

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(50).default("general"),
  channel: z.enum(["sms", "email", "both"]),
  subject: z.string().max(200).nullable().optional(),
  body: z.string().min(1).max(5000),
  variables: z.array(z.string()).optional(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const { data: templates, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("user_id", user.id)
    .order("category")
    .order("name");

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });

  // Seed defaults if user has no templates
  if (!templates || templates.length === 0) {
    const { data: seeded } = await supabase
      .from("message_templates")
      .insert(DEFAULT_TEMPLATES.map((t) => ({ ...t, user_id: user.id })))
      .select("*");
    return NextResponse.json(successResponse(seeded ?? []));
  }

  return NextResponse.json(successResponse(templates));
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const parsed = parseBody(createTemplateSchema, await request.json());
  if (!parsed.success) return NextResponse.json(errorResponse(parsed.error), { status: 400 });

  // Auto-extract variables from body {{...}}
  const bodyVars = [...(parsed.data.body.matchAll(/\{\{(\w+)\}\}/g))].map((m) => m[1]);
  const variables = [...new Set([...(parsed.data.variables ?? []), ...bodyVars])];

  const { data, error } = await supabase
    .from("message_templates")
    .insert({ ...parsed.data, user_id: user.id, variables })
    .select("*")
    .single();

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });
  return NextResponse.json(successResponse(data), { status: 201 });
}
