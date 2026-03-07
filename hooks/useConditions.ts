"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database.types";

type Condition = Database["public"]["Tables"]["conditions"]["Row"];

export function useConditions(loanFileId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["conditions", loanFileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conditions")
        .select("*")
        .eq("loan_file_id", loanFileId)
        .order("priority", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Condition[];
    },
    enabled: !!loanFileId,
  });
}

export function useUpdateCondition(loanFileId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Database["public"]["Tables"]["conditions"]["Update"];
    }) => {
      const { data, error } = await supabase
        .from("conditions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Condition;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conditions", loanFileId] });
    },
  });
}
