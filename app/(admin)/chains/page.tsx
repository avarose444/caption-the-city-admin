import Link from "next/link";
import { cardClass, eyebrowClass } from "@/components/styles";
import { requireAdmin } from "@/lib/admin";
import { formatMs, percentile, rate } from "@/lib/observability";

export const dynamic = "force-dynamic";

type Chain = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  prompt_chain_mix: { weight: number } | null;
  llm_prompt_chain_steps: { step_order: number; title: string; include_image: boolean; llm_models: { name: string } | null }[];
};

export default async function ChainsPage() {
  const { supabase } = await requireAdmin();
  const [{ data, error }, { data: requests }] = await Promise.all([
    supabase
      .from("llm_prompt_chains")
      .select("id, name, description, is_active, prompt_chain_mix (weight), llm_prompt_chain_steps (step_order, title, include_image, llm_models (name))")
      .order("name"),
    supabase.from("generation_requests").select("chain_id, status, duration_ms").neq("source", "backfill").limit(5000),
  ]);
  const chains = (data ?? []) as unknown as Chain[];
  const totalWeight = chains.reduce((s, c) => s + (c.is_active ? (c.prompt_chain_mix?.weight ?? 0) : 0), 0);

  return (
    <div className="space-y-6">
      <header>
        <p className={eyebrowClass}>AI pipeline · read only</p>
        <h1 className="mt-1 font-display text-5xl uppercase leading-none">Prompt chains</h1>
        <p className="mt-2 max-w-2xl font-mono text-sm text-muted">
          Each time someone posts, Caption the City picks one chain (by the <Link href="/mix" className="underline">chain mix</Link> weights) and runs its steps in order. Each step&apos;s output feeds the next as <code>{"{{previous}}"}</code>; the last step returns the captions.
        </p>
      </header>
      {error && <p className="font-mono text-sm text-rouge">Couldn&apos;t load chains: {error.message}. Has observability.sql been run?</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {chains.map((chain) => {
          const runs = (requests ?? []).filter((r) => r.chain_id === chain.id);
          const ok = runs.filter((r) => r.status === "succeeded");
          const weight = chain.prompt_chain_mix?.weight ?? 0;
          const steps = [...chain.llm_prompt_chain_steps].sort((a, b) => a.step_order - b.step_order);
          return (
            <Link key={chain.id} href={`/chains/${chain.id}`} className={`${cardClass} block p-5 transition-shadow hover:shadow-[6px_6px_0_0_#111]`}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-2xl uppercase">{chain.name}</h2>
                <span className={`shrink-0 px-2 py-0.5 font-mono text-[11px] uppercase ${chain.is_active ? "bg-black text-white" : "bg-rule"}`}>
                  {chain.is_active ? `${rate(weight, totalWeight)} of posts` : "inactive"}
                </span>
              </div>
              <p className="mt-1 font-mono text-sm text-muted">{chain.description}</p>
              <ol className="mt-4 space-y-1 font-mono text-xs">
                {steps.map((s) => (
                  <li key={s.step_order} className="flex gap-2">
                    <span className="font-display text-base leading-none">{s.step_order}</span>
                    <span>
                      {s.title} <span className="text-muted">· {s.llm_models?.name ?? "best active model"}{s.include_image ? " · sees photo" : ""}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 border-t border-rule pt-2 font-mono text-xs text-muted">
                {runs.length} logged runs · {rate(ok.length, runs.length)} succeeded · p50 {formatMs(percentile(ok.map((r) => r.duration_ms ?? 0), 50))}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
