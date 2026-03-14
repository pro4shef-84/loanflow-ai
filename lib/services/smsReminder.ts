// ============================================================
// SMS REMINDER SERVICE
// Sends document reminder SMS via Twilio and logs to messages table
// ============================================================

import { sendSms } from "@/lib/twilio/client";
import { createServiceClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { RequiredDocType } from "@/lib/domain/enums";
import { DOC_TYPE_LABELS } from "@/lib/domain/labels";

export interface SendDocumentReminderParams {
  phone: string;
  borrowerName: string;
  pendingDocs: RequiredDocType[];
  portalToken: string;
  loanFileId: string;
  userId: string;
  contactId?: string;
}

export interface SendDocumentReminderResult {
  success: boolean;
  messageSid: string | null;
  error?: string;
}

/**
 * Format a list of doc types into human-readable labels.
 */
function formatDocList(docs: RequiredDocType[]): string {
  return docs.map((d) => DOC_TYPE_LABELS[d] ?? d).join(", ");
}

/**
 * Build the portal upload URL from a portal token.
 */
function buildPortalUrl(portalToken: string): string {
  const baseUrl = env.appUrl;
  return `${baseUrl}/portal/${portalToken}`;
}

/**
 * Build the SMS message body for a document reminder.
 */
export function buildReminderMessage(
  borrowerName: string,
  pendingDocs: RequiredDocType[],
  portalToken: string
): string {
  const docList = formatDocList(pendingDocs);
  const portalUrl = buildPortalUrl(portalToken);
  return `Hi ${borrowerName}, your loan officer needs: ${docList}. Upload at: ${portalUrl}`;
}

/**
 * Send an SMS document reminder to a borrower and log it to the messages table.
 */
export async function sendDocumentReminder(
  params: SendDocumentReminderParams
): Promise<SendDocumentReminderResult> {
  const {
    phone,
    borrowerName,
    pendingDocs,
    portalToken,
    loanFileId,
    userId,
    contactId,
  } = params;

  const messageBody = buildReminderMessage(borrowerName, pendingDocs, portalToken);

  try {
    const messageSid = await sendSms(phone, messageBody);

    // Log to messages table
    const serviceClient = await createServiceClient();
    await serviceClient.from("messages").insert({
      loan_file_id: loanFileId,
      contact_id: contactId ?? null,
      user_id: userId,
      channel: "sms",
      direction: "outbound",
      recipient_type: "borrower",
      recipient_phone: phone,
      subject: "Document Reminder",
      content: messageBody,
      status: "sent",
      trigger_type: "document_reminder",
      external_id: messageSid,
      sent_at: new Date().toISOString(),
    });

    // Also log to document_reminders table for tracking
    await serviceClient.from("document_reminders").insert({
      loan_file_id: loanFileId,
      channel: "sms",
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    // Log audit event
    await serviceClient.from("file_completion_events").insert({
      loan_file_id: loanFileId,
      event_type: "reminder_sent",
      actor: "system",
      payload: {
        channel: "sms",
        recipient_phone: phone,
        pending_docs: pendingDocs,
        message_sid: messageSid,
      },
    });

    return { success: true, messageSid };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown SMS error";
    console.error("[smsReminder] Failed to send SMS:", errorMessage);
    return { success: false, messageSid: null, error: errorMessage };
  }
}
