"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { EscalationSeverityBadge } from "@/components/ui/status-badge";
import { useEscalations, useResolveEscalation, useDismissEscalation } from "@/hooks/useEscalations";
import type { TypedEscalation } from "@/hooks/useEscalations";
import { ESCALATION_CATEGORY_LABELS } from "@/lib/domain";
import type { EscalationCategory } from "@/lib/domain";
import { cn } from "@/lib/utils";

interface EscalationBannerProps {
  loanFileId: string;
}

export function EscalationBanner({ loanFileId }: EscalationBannerProps) {
  const { data: escalations } = useEscalations(loanFileId);
  const resolveEscalation = useResolveEscalation();
  const dismissEscalation = useDismissEscalation();

  const [expanded, setExpanded] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<TypedEscalation | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const openEscalations = escalations?.filter(
    (e) => e.status === "open" || e.status === "acknowledged"
  ) ?? [];

  if (openEscalations.length === 0) return null;

  const critical = openEscalations.filter((e) => e.severity === "critical");
  const hasCritical = critical.length > 0;

  const handleResolve = async () => {
    if (!resolveTarget) return;
    await resolveEscalation.mutateAsync({
      escalationId: resolveTarget.id,
      resolutionNotes,
    });
    setResolveTarget(null);
    setResolutionNotes("");
  };

  const handleDismiss = async (escalation: TypedEscalation) => {
    await dismissEscalation.mutateAsync({ escalationId: escalation.id });
  };

  const displayList = expanded ? openEscalations : openEscalations.slice(0, 3);

  return (
    <>
      <div
        className={cn(
          "rounded-lg border p-4",
          hasCritical
            ? "bg-red-50 border-red-200"
            : "bg-amber-50 border-amber-200"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={cn(
                "h-5 w-5 shrink-0",
                hasCritical ? "text-red-500" : "text-amber-500"
              )}
            />
            <p className="text-sm font-semibold">
              {openEscalations.length} Open Escalation{openEscalations.length !== 1 ? "s" : ""}
            </p>
          </div>
          {openEscalations.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  Show Less <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  Show All <ChevronDown className="h-3 w-3" />
                </>
              )}
            </Button>
          )}
        </div>

        <div className="mt-3 space-y-2">
          {displayList.map((esc) => (
            <div
              key={esc.id}
              className="flex items-start justify-between gap-3 bg-white/80 rounded-md p-2.5 border border-white"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">
                    {ESCALATION_CATEGORY_LABELS[esc.category as EscalationCategory] ??
                      esc.category.replace(/_/g, " ")}
                  </span>
                  <EscalationSeverityBadge severity={esc.severity} />
                </div>
                {esc.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {esc.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(esc.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => {
                    setResolveTarget(esc);
                    setResolutionNotes("");
                  }}
                >
                  <CheckCircle className="h-3 w-3" />
                  Resolve
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleDismiss(esc)}
                  disabled={dismissEscalation.isPending}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resolve Dialog */}
      <Dialog
        open={resolveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setResolveTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Escalation</DialogTitle>
            <DialogDescription>
              {resolveTarget &&
                (ESCALATION_CATEGORY_LABELS[resolveTarget.category as EscalationCategory] ??
                  resolveTarget.category.replace(/_/g, " "))}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {resolveTarget?.description && (
              <p className="text-sm text-muted-foreground">{resolveTarget.description}</p>
            )}
            <Textarea
              placeholder="Resolution notes..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResolveTarget(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={!resolutionNotes.trim() || resolveEscalation.isPending}
            >
              {resolveEscalation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
