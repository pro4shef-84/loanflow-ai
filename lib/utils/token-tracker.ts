import { createServiceClient } from "@/lib/supabase/server";

interface TrackTokensParams {
  userId: string;
  loanFileId?: string;
  module: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export async function trackTokenUsage(params: TrackTokensParams): Promise<void> {
  try {
    const supabase = await createServiceClient();
    await supabase.from("token_usage").insert({
      user_id: params.userId,
      loan_file_id: params.loanFileId ?? null,
      module: params.module,
      model: params.model,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      cost_usd: params.costUsd,
    });
  } catch (error) {
    // Non-fatal — log but don't crash the request
    console.error("[token-tracker] Failed to log token usage:", error);
  }
}
