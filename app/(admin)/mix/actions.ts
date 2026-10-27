"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";

// UPDATE every chain's weight from one form (fields named weight-<chainId>).
export async function updateMix(_prev: { error?: string; success?: string }, formData: FormData) {
  const { supabase } = await requireAdmin();
  const updates: { chain_id: string; weight: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("weight-")) continue;
    const weight = Number(value);
    if (!Number.isInteger(weight) || weight < 0 || weight > 100) return { error: "Weights must be whole numbers from 0 to 100." };
    updates.push({ chain_id: key.slice("weight-".length), weight });
  }
  if (!updates.some((u) => u.weight > 0)) return { error: "At least one chain needs a weight above 0, or nothing can be generated." };

  for (const u of updates) {
    const { error } = await supabase
      .from("prompt_chain_mix")
      .update({ weight: u.weight, updated_at: new Date().toISOString() })
      .eq("chain_id", u.chain_id);
    if (error) return { error: error.message };
  }
  revalidatePath("/mix");
  revalidatePath("/chains");
  return { success: "Mix saved. New posts use it right away." };
}
