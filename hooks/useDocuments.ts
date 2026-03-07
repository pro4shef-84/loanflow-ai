"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database.types";

type Document = Database["public"]["Tables"]["documents"]["Row"];

export function useDocuments(loanFileId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["documents", loanFileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("loan_file_id", loanFileId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Document[];
    },
    enabled: !!loanFileId,
  });
}

export function useUpdateDocument(loanFileId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Database["public"]["Tables"]["documents"]["Update"];
    }) => {
      const { data, error } = await supabase
        .from("documents")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", loanFileId] });
    },
  });
}
