"use client";

import { FileText, CheckCircle, AlertCircle, Clock, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/lib/types/database.types";
import { cn } from "@/lib/utils";

type Document = Database["public"]["Tables"]["documents"]["Row"];

const STATUS_ICONS = {
  pending: Clock,
  uploaded: Clock,
  processing: Clock,
  verified: CheckCircle,
  needs_attention: AlertCircle,
  rejected: XCircle,
  expired: XCircle,
};

const STATUS_COLORS = {
  pending: "text-muted-foreground",
  uploaded: "text-blue-500",
  processing: "text-yellow-500",
  verified: "text-green-500",
  needs_attention: "text-orange-500",
  rejected: "text-red-500",
  expired: "text-red-500",
};

const STATUS_BADGE: Record<Document["status"], string> = {
  pending: "bg-slate-100 text-slate-600",
  uploaded: "bg-blue-50 text-blue-600",
  processing: "bg-yellow-50 text-yellow-600",
  verified: "bg-green-50 text-green-600",
  needs_attention: "bg-orange-50 text-orange-600",
  rejected: "bg-red-50 text-red-600",
  expired: "bg-red-50 text-red-600",
};

interface DocumentCardProps {
  document: Document;
  onView?: () => void;
}

export function DocumentCard({ document, onView }: DocumentCardProps) {
  const Icon = STATUS_ICONS[document.status];
  const label = document.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={onView}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("shrink-0", STATUS_COLORS[document.status])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{document.original_filename ?? label}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <Badge variant="outline" className={cn("text-xs shrink-0", STATUS_BADGE[document.status])}>
          {document.status.replace(/_/g, " ")}
        </Badge>
      </CardContent>
    </Card>
  );
}
