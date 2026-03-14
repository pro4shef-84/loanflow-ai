// ============================================================
// FOLLOW-UP AGENT
// Handles borrower reminders for outstanding documents.
// Idempotent: won't send if sent within 3 days.
// After 3 reminders → transition to borrower_unresponsive + escalation.
// ============================================================

import { createServiceClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { sendEmail } from "@/lib/resend/client";
import { WorkflowEngine } from "@/lib/workflow/workflowEngine";
import type { DocWorkflowState } from "@/lib/domain/enums";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_REMINDERS = 3;

interface FollowUpResult {
  loanFileId: string;
  action: "reminder_sent" | "marked_unresponsive" | "skipped";
  reminderNumber?: number;
  error?: string;
}

export class FollowUpAgent {
  /**
   * Check all loan files in awaiting_documents or corrections_needed state
   * and send reminders to borrowers as needed.
   */
  async processAllPendingLoans(): Promise<FollowUpResult[]> {
    const db = await createServiceClient();
    const results: FollowUpResult[] = [];

    const targetStates: DocWorkflowState[] = ["awaiting_documents", "corrections_needed"];

    const { data: loanFiles, error } = await db
      .from("loan_files")
      .select("id, borrower_id, doc_workflow_state")
      .in("doc_workflow_state", targetStates);

    if (error || !loanFiles) {
      console.error("[FollowUpAgent] Failed to fetch pending loans:", error?.message);
      return results;
    }

    for (const loan of loanFiles) {
      const result = await this.processLoanFile(db, loan.id, loan.borrower_id);
      results.push(result);
    }

    return results;
  }

  /**
   * Process a single loan file for follow-up reminders.
   */
  async processLoanFile(
    db: SupabaseClient<Database>,
    loanFileId: string,
    borrowerId: string | null
  ): Promise<FollowUpResult> {
    const engine = new WorkflowEngine(db);

    // Get the most recent reminder for this loan
    const { data: reminders } = await db
      .from("document_reminders")
      .select("id, reminder_number, sent_at")
      .eq("loan_file_id", loanFileId)
      .order("reminder_number", { ascending: false })
      .limit(1);

    const lastReminder = reminders?.[0] ?? null;
    const lastReminderNumber = lastReminder?.reminder_number ?? 0;

    // Check if we already hit the max
    if (lastReminderNumber >= MAX_REMINDERS) {
      // Transition to borrower_unresponsive
      await engine.transitionDocWorkflow(loanFileId, "borrower_unresponsive", "system");

      await engine.createEscalation(
        loanFileId,
        "borrower_unresponsive",
        "high",
        `Borrower has not responded after ${MAX_REMINDERS} reminders.`
      );

      return {
        loanFileId,
        action: "marked_unresponsive",
        reminderNumber: lastReminderNumber,
      };
    }

    // Check idempotency: don't send if last reminder was within 3 days
    if (lastReminder?.sent_at) {
      const lastSentAt = new Date(lastReminder.sent_at).getTime();
      if (Date.now() - lastSentAt < THREE_DAYS_MS) {
        return {
          loanFileId,
          action: "skipped",
          reminderNumber: lastReminderNumber,
        };
      }
    }

    // Resolve borrower email
    const borrowerEmail = await this.getBorrowerEmail(db, loanFileId, borrowerId);
    if (!borrowerEmail) {
      return {
        loanFileId,
        action: "skipped",
        error: "No borrower email found",
      };
    }

    // Get outstanding requirements
    const { data: requirements } = await db
      .from("document_requirements")
      .select("doc_type, state")
      .eq("loan_file_id", loanFileId)
      .in("state", ["required", "awaiting_upload", "correction_required"]);

    const outstandingDocs = (requirements ?? []).map((r) => r.doc_type);
    if (outstandingDocs.length === 0) {
      return { loanFileId, action: "skipped" };
    }

    // Send the reminder email
    const nextReminderNumber = lastReminderNumber + 1;
    try {
      await sendEmail({
        to: borrowerEmail,
        subject: `[Action Required] Documents needed for your mortgage application`,
        html: this.buildReminderHtml(outstandingDocs, nextReminderNumber),
      });
    } catch (emailError) {
      console.error("[FollowUpAgent] Failed to send reminder email:", {
        loanFileId,
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
      return {
        loanFileId,
        action: "skipped",
        error: "Failed to send email",
      };
    }

    // Log the reminder
    await db.from("document_reminders").insert({
      loan_file_id: loanFileId,
      reminder_number: nextReminderNumber,
      channel: "email" as const,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    // Log event
    await db.from("file_completion_events").insert({
      loan_file_id: loanFileId,
      event_type: "reminder_sent",
      actor: "system",
      payload: {
        reminder_number: nextReminderNumber,
        channel: "email",
        outstanding_docs: outstandingDocs,
      },
    });

    return {
      loanFileId,
      action: "reminder_sent",
      reminderNumber: nextReminderNumber,
    };
  }

  private async getBorrowerEmail(
    db: SupabaseClient<Database>,
    loanFileId: string,
    borrowerId: string | null
  ): Promise<string | null> {
    // Try getting email from loan_applications first
    const { data: app } = await db
      .from("loan_applications")
      .select("borrower_email")
      .eq("loan_file_id", loanFileId)
      .single();

    if (app?.borrower_email) {
      return app.borrower_email;
    }

    // Fall back to contacts table
    if (borrowerId) {
      const { data: contact } = await db
        .from("contacts")
        .select("email")
        .eq("id", borrowerId)
        .single();

      if (contact?.email) {
        return contact.email;
      }
    }

    return null;
  }

  private buildReminderHtml(outstandingDocs: string[], reminderNumber: number): string {
    const docList = outstandingDocs
      .map((doc) => `<li>${doc.replace(/_/g, " ")}</li>`)
      .join("\n");

    const urgency = reminderNumber >= MAX_REMINDERS
      ? "<p><strong>This is your final reminder.</strong> If we don't receive these documents, your application may be delayed.</p>"
      : "";

    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Documents Still Needed</h2>
        <p>We're still waiting on the following documents to continue processing your mortgage application:</p>
        <ul>${docList}</ul>
        ${urgency}
        <p>Please upload your documents through the secure borrower portal at your earliest convenience.</p>
        <p>If you have any questions, please reach out to your loan officer.</p>
        <br/>
        <p style="color: #666; font-size: 12px;">— LoanFlow AI</p>
      </div>
    `;
  }
}
