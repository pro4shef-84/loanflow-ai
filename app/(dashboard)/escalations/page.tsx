"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle,
  X,
  Loader2,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { EscalationSeverityBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  useAllEscalations,
  useResolveEscalation,
  useDismissEscalation,
} from "@/hooks/useEscalations";
import type { EscalationWithLoan } from "@/hooks/useEscalations";
import { ESCALATION_CATEGORY_LABELS } from "@/lib/domain";
import type { EscalationCategory, EscalationSeverity, EscalationStatus } from "@/lib/domain";

type SortField = "severity" | "created_at";
type SortDir = "asc" | "desc";

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  warning: 2,
  info: 3,
};

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  open: "destructive",
  acknowledged: "default",
  resolved: "secondary",
  dismissed: "outline",
};

export default function EscalationsPage() {
  const { data: escalations, isLoading } = useAllEscalations();
  const resolveEscalation = useResolveEscalation();
  const dismissEscalation = useDismissEscalation();

  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("severity");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [resolveTarget, setResolveTarget] = useState<EscalationWithLoan | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const filtered = useMemo(() => {
    if (!escalations) return [];

    return escalations
      .filter((e) => {
        if (statusFilter !== "all" && e.status !== statusFilter) return false;
        if (severityFilter !== "all" && e.severity !== severityFilter) return false;
        if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortField === "severity") {
          const diff = (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99);
          return sortDir === "asc" ? diff : -diff;
        }
        const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return sortDir === "asc" ? diff : -diff;
      });
  }, [escalations, statusFilter, severityFilter, categoryFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const handleResolve = async () => {
    if (!resolveTarget) return;
    await resolveEscalation.mutateAsync({
      escalationId: resolveTarget.id,
      resolutionNotes,
    });
    setResolveTarget(null);
    setResolutionNotes("");
  };

  const handleDismiss = async (esc: EscalationWithLoan) => {
    await dismissEscalation.mutateAsync({ escalationId: esc.id });
  };

  const borrowerName = (esc: EscalationWithLoan): string => {
    const c = esc.loan_files?.contacts;
    if (c) return `${c.first_name} ${c.last_name}`;
    return "Unknown";
  };

  const uniqueCategories = useMemo(() => {
    if (!escalations) return [];
    return [...new Set(escalations.map((e) => e.category))];
  }, [escalations]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Escalations</h1>
        <p className="text-muted-foreground">Manage escalations across all loans</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {ESCALATION_CATEGORY_LABELS[cat as EscalationCategory] ?? cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-xs text-muted-foreground ml-auto">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No escalations found for the selected filters.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loan #</TableHead>
                <TableHead>Borrower</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 -ml-3 text-xs font-medium text-muted-foreground"
                    onClick={() => toggleSort("severity")}
                  >
                    Severity
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 -ml-3 text-xs font-medium text-muted-foreground"
                    onClick={() => toggleSort("created_at")}
                  >
                    Created
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((esc) => (
                <TableRow
                  key={esc.id}
                  className="cursor-pointer"
                  onClick={() => {
                    if (esc.loan_files?.id) {
                      window.location.href = `/loans/${esc.loan_files.id}`;
                    }
                  }}
                >
                  <TableCell className="font-mono text-xs">
                    {esc.loan_files?.file_number ?? "-"}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {borrowerName(esc)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {ESCALATION_CATEGORY_LABELS[esc.category as EscalationCategory] ??
                      esc.category.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>
                    <EscalationSeverityBadge severity={esc.severity} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[esc.status] ?? "outline"}>
                      {esc.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(esc.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {(esc.status === "open" || esc.status === "acknowledged") && (
                        <>
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
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

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
              {resolveTarget?.loan_files?.file_number && (
                <span className="ml-1">(Loan #{resolveTarget.loan_files.file_number})</span>
              )}
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
            <Button variant="outline" onClick={() => setResolveTarget(null)}>
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
    </div>
  );
}
