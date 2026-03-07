"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database.types";

type LoanFileRow = Database["public"]["Tables"]["loan_files"]["Row"];
type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type LenderRow = Database["public"]["Tables"]["lenders"]["Row"];
type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
type ConditionRow = Database["public"]["Tables"]["conditions"]["Row"];

export type LoanWithRelations = LoanFileRow & {
  contacts?: ContactRow | null;
  lenders?: LenderRow | null;
  documents?: DocumentRow[];
  conditions?: ConditionRow[];
};

export function useLoans() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["loans"],
    queryFn: async (): Promise<LoanWithRelations[]> => {
      const { data, error } = await supabase
        .from("loan_files")
        .select("*, contacts(*), lenders(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as LoanWithRelations[];
    },
  });
}

export function useLoan(id: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["loans", id],
    queryFn: async (): Promise<LoanWithRelations | null> => {
      const { data, error } = await supabase
        .from("loan_files")
        .select("*, contacts(*), lenders(*), documents(*), conditions(*)")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as LoanWithRelations;
    },
    enabled: !!id,
  });
}

export function useCreateLoan() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (loan: Database["public"]["Tables"]["loan_files"]["Insert"]): Promise<LoanFileRow> => {
      const { data, error } = await supabase
        .from("loan_files")
        .insert(loan)
        .select()
        .single();

      if (error) throw error;
      return data as LoanFileRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
    },
  });
}

export function useUpdateLoan(id: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Database["public"]["Tables"]["loan_files"]["Update"]): Promise<LoanFileRow> => {
      const { data, error } = await supabase
        .from("loan_files")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as LoanFileRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans", id] });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
    },
  });
}
