"use client";

import { ConditionCard } from "./ConditionCard";
import type { Database } from "@/lib/types/database.types";

type Condition = Database["public"]["Tables"]["conditions"]["Row"];

interface ConditionListProps {
  conditions: Condition[];
  onStatusChange?: (id: string, status: Condition["status"]) => void;
}

export function ConditionList({ conditions, onStatusChange }: ConditionListProps) {
  const open = conditions.filter((c) => !["cleared", "waived"].includes(c.status));
  const resolved = conditions.filter((c) => ["cleared", "waived"].includes(c.status));

  return (
    <div className="space-y-6">
      {open.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Open Conditions ({open.length})
          </h3>
          {open.map((condition) => (
            <ConditionCard key={condition.id} condition={condition} onStatusChange={onStatusChange} />
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Resolved ({resolved.length})
          </h3>
          {resolved.map((condition) => (
            <ConditionCard key={condition.id} condition={condition} />
          ))}
        </div>
      )}

      {conditions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No conditions yet. Paste a lender condition letter to get started.</p>
        </div>
      )}
    </div>
  );
}
