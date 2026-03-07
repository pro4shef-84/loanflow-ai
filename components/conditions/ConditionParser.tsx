"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";

interface ConditionParserProps {
  loanFileId: string;
  onParsed?: () => void;
}

export function ConditionParser({ loanFileId, onParsed }: ConditionParserProps) {
  const [conditionText, setConditionText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    if (!conditionText.trim()) return;
    setIsParsing(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/parse-conditions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanFileId, conditionText }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to parse conditions");

      setConditionText("");
      onParsed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parse failed");
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Paste Lender Condition Letter</Label>
        <Textarea
          value={conditionText}
          onChange={(e) => setConditionText(e.target.value)}
          placeholder="Paste the full text of the lender's condition letter here. AI will parse each condition into plain English tasks..."
          className="min-h-[200px] font-mono text-sm"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        onClick={handleParse}
        disabled={isParsing || !conditionText.trim()}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        {isParsing ? "Parsing..." : "Parse Conditions with AI"}
      </Button>
    </div>
  );
}
