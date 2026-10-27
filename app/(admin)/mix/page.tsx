import Link from "next/link";
import ActionForm, { SubmitButton } from "@/components/ActionForm";
import { cardClass, eyebrowClass, inputClass } from "@/components/styles";
import { formatDate, requireAdmin } from "@/lib/admin";
import { updateMix } from "./actions";

export const dynamic = "force-dynamic";

type MixRow = {
  chain_id: string;
  weight: number;
  updated_at: string;
  llm_prompt_chains: { name: string; description: string | null; is_active: boolean } | null;
};

export default async function MixPage() {
  const { supabase } = await requireAdmin();
  const [{ data, error }, { data: requests }] = await Promise.all([
    supabase.from("prompt_chain_mix").select("chain_id, weight, updated_at, llm_prompt_chains (name, description, is_active)").order("weight", { ascending: false }),
    supabase.from("generation_requests").select("chain_id").neq("source", "backfill").limit(5000),
  ]);
  const rows = (data ?? []) as unknown as MixRow[];
  const total = rows.reduce((s, r) => s + (r.llm_prompt_chains?.is_active ? r.weight : 0), 0);
  const runs = requests ?? [];

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <p className={eyebrowClass}>AI pipeline · read & update</p>
        <h1 className="mt-1 font-display text-5xl uppercase leading-none">Prompt chain mix</h1>
        <p className="mt-2 font-mono text-sm text-muted">
          How often each <Link href="/chains" className="underline">prompt chain</Link> is picked when someone posts. Weights are relative: 70 and 30 means 70% and 30%. Set a chain to 0 to stop using it. Compare against what actually ran.
        </p>
      </header>
      {error && <p className="font-mono text-sm text-rouge">Couldn&apos;t load the mix: {error.message}. Has observability.sql been run?</p>}

      <ActionForm action={updateMix} className={`${cardClass} space-y-5 p-5`}>
        {rows.map((r) => {
          const target = total && r.llm_prompt_chains?.is_active ? r.weight / total : 0;
          const actual = runs.length ? runs.filter((x) => x.chain_id === r.chain_id).length / runs.length : 0;
          return (
            <div key={r.chain_id} className="grid items-center gap-3 sm:grid-cols-[1fr_6rem]">
              <div>
                <p className="font-bold">
                  {r.llm_prompt_chains?.name}
                  {!r.llm_prompt_chains?.is_active && <span className="ml-2 font-mono text-xs text-muted">(inactive)</span>}
                </p>
                <div className="mt-2 space-y-1 font-mono text-[11px] text-muted">
                  <div className="flex items-center gap-2">
                    <span className="w-14">Target</span>
                    <span className="h-2 flex-1 bg-rule/50"><span className="block h-full rounded-r bg-bleu" style={{ width: `${target * 100}%` }} /></span>
                    <span className="w-10 text-right tabular-nums">{Math.round(target * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-14">Actual</span>
                    <span className="h-2 flex-1 bg-rule/50"><span className="block h-full rounded-r bg-muted" style={{ width: `${actual * 100}%` }} /></span>
                    <span className="w-10 text-right tabular-nums">{runs.length ? `${Math.round(actual * 100)}%` : "—"}</span>
                  </div>
                </div>
                <p className="mt-1 font-mono text-[11px] text-muted">Updated {formatDate(r.updated_at)}</p>
              </div>
              <label className="block">
                <span className="sr-only">Weight for {r.llm_prompt_chains?.name}</span>
                <input type="number" name={`weight-${r.chain_id}`} defaultValue={r.weight} min={0} max={100} step={1} required className={`${inputClass} text-right text-lg`} />
              </label>
            </div>
          );
        })}
        {rows.length > 0 && <SubmitButton pendingLabel="Saving…">Save mix</SubmitButton>}
      </ActionForm>
    </div>
  );
}
