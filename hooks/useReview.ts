"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database.types";
import type { OfficerReviewSummary, ReviewDecision } from "@/lib/domain";

type ReviewDecisionRow = Database["public"]["Tables"]["review_decisions"]["Row"];

export function useReviewSummary(loanFileId: string) {
  return useQuery({
    queryKey: ["review-summary", loanFileId],
    queryFn: async (): Promise<OfficerReviewSummary> => {
      const res = await fetch(`/api/loans/${loanFileId}/review/summary`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load review summary");
      return json.data as OfficerReviewSummary;
    },
    enabled: !!loanFileId,
    staleTime: 60_000,
  });
}

export function useReviewHistory(loanFileId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["review-history", loanFileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_decisions")
        .select("*")
        .eq("loan_file_id", loanFileId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as ReviewDecisionRow[];
    },
    enabled: !!loanFileId,
  });
}

export function useSubmitReview(loanFileId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      decision,
      notes,
    }: {
      decision: ReviewDecisionRow["decision"];
      notes: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("review_decisions")
        .insert({
          loan_file_id: loanFileId,
          user_id: user.id,
          decision,
          notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ReviewDecisionRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-summary", loanFileId] });
      queryClient.invalidateQueries({ queryKey: ["review-history", loanFileId] });
      queryClient.invalidateQueries({ queryKey: ["loans", loanFileId] });
    },
  });
}
