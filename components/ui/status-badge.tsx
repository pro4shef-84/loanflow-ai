"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  DocWorkflowState,
  DocumentRequirementState,
  EscalationSeverity,
} from "@/lib/domain";
import {
  DOC_WORKFLOW_STATE_LABELS,
  REQUIREMENT_STATE_LABELS,
  ESCALATION_SEVERITY_LABELS,
} from "@/lib/domain";

// ── Color maps ───────────────────────────────────────────────

const DOC_WORKFLOW_COLORS: Record<DocWorkflowState, string> = {
  checklist_pending: "bg-slate-100 text-slate-700 border-slate-200",
  awaiting_documents: "bg-amber-100 text-amber-800 border-amber-200",
  documents_in_review: "bg-blue-100 text-blue-700 border-blue-200",
  corrections_needed: "bg-orange-100 text-orange-800 border-orange-200",
  borrower_unresponsive: "bg-red-100 text-red-700 border-red-200",
  officer_review_needed: "bg-purple-100 text-purple-700 border-purple-200",
  review_ready: "bg-cyan-100 text-cyan-700 border-cyan-200",
  file_complete: "bg-green-100 text-green-700 border-green-200",
};

const REQUIREMENT_STATE_COLORS: Record<DocumentRequirementState, string> = {
  required: "bg-slate-100 text-slate-700 border-slate-200",
  awaiting_upload: "bg-amber-100 text-amber-800 border-amber-200",
  uploaded_pending_validation: "bg-blue-100 text-blue-700 border-blue-200",
  tentatively_satisfied: "bg-emerald-100 text-emerald-700 border-emerald-200",
  correction_required: "bg-orange-100 text-orange-800 border-orange-200",
  needs_officer_review: "bg-purple-100 text-purple-700 border-purple-200",
  confirmed_by_officer: "bg-green-100 text-green-700 border-green-200",
  waived_by_officer: "bg-gray-100 text-gray-600 border-gray-200",
};

const ESCALATION_SEVERITY_COLORS: Record<EscalationSeverity, string> = {
  info: "bg-blue-100 text-blue-700 border-blue-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

// ── Components ───────────────────────────────────────────────

interface DocWorkflowBadgeProps {
  state: DocWorkflowState;
  className?: string;
}

export function DocWorkflowBadge({ state, className }: DocWorkflowBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(DOC_WORKFLOW_COLORS[state], className)}
    >
      {DOC_WORKFLOW_STATE_LABELS[state]}
    </Badge>
  );
}

interface RequirementStateBadgeProps {
  state: DocumentRequirementState;
  className?: string;
}

export function RequirementStateBadge({ state, className }: RequirementStateBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(REQUIREMENT_STATE_COLORS[state], className)}
    >
      {REQUIREMENT_STATE_LABELS[state]}
    </Badge>
  );
}

interface EscalationSeverityBadgeProps {
  severity: EscalationSeverity;
  className?: string;
}

export function EscalationSeverityBadge({ severity, className }: EscalationSeverityBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(ESCALATION_SEVERITY_COLORS[severity], className)}
    >
      {ESCALATION_SEVERITY_LABELS[severity]}
    </Badge>
  );
}
