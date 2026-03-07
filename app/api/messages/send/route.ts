import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { sendSms } from "@/lib/twilio/client";
import { sendEmail } from "@/lib/resend/client";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const body = await request.json();
  const { channel, content, subject, recipientType, loanFileId, contactId, recipientEmail, recipientPhone } = body;

  if (!channel || !content) {
    return NextResponse.json(errorResponse("channel and content are required"), { status: 400 });
  }

  // Resolve recipient contact info if not provided directly
  let resolvedEmail = recipientEmail;
  let resolvedPhone = recipientPhone;

  if (contactId && (!resolvedEmail || !resolvedPhone)) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("email, phone")
      .eq("id", contactId)
      .single();
    if (contact) {
      resolvedEmail = resolvedEmail ?? contact.email;
      resolvedPhone = resolvedPhone ?? contact.phone;
    }
  }

  let externalId: string | undefined;
  let status: "sent" | "failed" = "sent";

  try {
    if (channel === "sms" && resolvedPhone) {
      externalId = await sendSms(resolvedPhone, content);
    } else if (channel === "email" && resolvedEmail) {
      externalId = await sendEmail({
        to: resolvedEmail,
        subject: subject ?? "Message from your loan officer",
        html: content.replace(/\n/g, "<br/>"),
      });
    }
  } catch {
    status = "failed";
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      loan_file_id: loanFileId ?? null,
      contact_id: contactId ?? null,
      user_id: user.id,
      channel,
      direction: "outbound",
      recipient_type: recipientType ?? null,
      recipient_email: resolvedEmail ?? null,
      recipient_phone: resolvedPhone ?? null,
      subject: subject ?? null,
      content,
      status,
      external_id: externalId ?? null,
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });
  return NextResponse.json(successResponse(data), { status: 201 });
}
