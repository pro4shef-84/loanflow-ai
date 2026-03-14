// ============================================================
// ESCALATION AGENT
// Manages escalation lifecycle: create, resolve, dismiss, query
// ============================================================

import { createServiceClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { WorkflowEngine } from "@/lib/workflow/workflowEngine";
import type {
  EscalationCategory,
  EscalationSeverity,
  EscalationStatus,
} from "@/lib/domain/enums";
import type { Escalation } from "@/lib/domain/entities";

export class EscalationAgent {
  /**
   * Create a new escalation for a loan file.
   */
  async create(params: {
    loanFileId: string;
    category: EscalationCategory;
    severity: EscalationSeverity;
    description: string;
    documentId?: string;
  }): Promise<string | null> {
    const db = await createServiceClient();
    const engine = new WorkflowEngine(db);

    return engine.createEscalation(
      params.loanFileId,
      params.category,
      params.severity,
      params.description,
      params.documentId
    );
  }

  /**
   * Create an escalation using a provided Supabase client.
   */
  async createWithClient(
    db: SupabaseClient<Database>,
    params: {
      loanFileId: string;
      category: EscalationCategory;
      severity: EscalationSeverity;
      description: string;
      documentId?: string;
    }
  ): Promise<string | null> {
    const engine = new WorkflowEngine(db);
    return engine.createEscalation(
      params.loanFileId,
      params.category,
      params.severity,
      params.description,
      params.documentId
    );
  }

  /**
   * Resolve an escalation with officer notes.
   */
  async resolve(params: {
    escalationId: string;
    notes: string;
    userId: string;
  }): Promise<{ success: boolean; error?: string }> {
    const db = await createServiceClient();
    const engine = new WorkflowEngine(db);

    return engine.resolveEscalation(
      params.escalationId,
      params.notes,
      params.userId
    );
  }

  /**
   * Dismiss an escalation (mark as not requiring action).
   */
  async dismiss(params: {
    escalationId: string;
    notes: string;
    userId: string;
  }): Promise<{ success: boolean; error?: string }> {
    const db = await createServiceClient();

    const { data: esc, error: fetchError } = await db
      .from("escalations")
      .select("loan_file_id, status")
      .eq("id", params.escalationId)
      .single();

    if (fetchError || !esc) {
      return { success: false, error: "Escalation not found" };
    }

    const currentStatus = esc.status as EscalationStatus;
    if (currentStatus === "resolved" || currentStatus === "dismissed") {
      return { success: false, error: `Escalation is already ${currentStatus}` };
    }

    const { error } = await db
      .from("escalations")
      .update({
        status: "dismissed",
        resolution_notes: params.notes,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.escalationId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Log event
    await db.from("file_completion_events").insert({
      loan_file_id: esc.loan_file_id,
      event_type: "escalation_dismissed",
      actor: params.userId,
      payload: {
        escalation_id: params.escalationId,
        notes: params.notes,
      },
    });

    return { success: true };
  }

  /**
   * Get all open (and acknowledged) escalations for a loan file.
   */
  async getOpen(loanFileId: string): Promise<Escalation[]> {
    const db = await createServiceClient();

    const { data, error } = await db
      .from("escalations")
      .select("*")
      .eq("loan_file_id", loanFileId)
      .in("status", ["open", "acknowledged"])
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error("[EscalationAgent] Failed to fetch open escalations:", error?.message);
      return [];
    }

    return data as unknown as Escalation[];
  }

  /**
   * Get all escalations for a loan file (all statuses).
   */
  async getAll(loanFileId: string): Promise<Escalation[]> {
    const db = await createServiceClient();

    const { data, error } = await db
      .from("escalations")
      .select("*")
      .eq("loan_file_id", loanFileId)
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error("[EscalationAgent] Failed to fetch escalations:", error?.message);
      return [];
    }

    return data as unknown as Escalation[];
  }
}
