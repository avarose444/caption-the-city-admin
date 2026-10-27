import Link from "next/link";
import { notFound } from "next/navigation";
import { cardClass, eyebrowClass } from "@/components/styles";
import { formatDate, requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

type Step = {
  id: string;
  step_order: number;
  title: string;
  include_image: boolean;
  output_json: boolean;
  prompt_template: string;
  created_at: string;
  llm_models: { name: string; api_model_id: string } | null;
};

export default async function ChainPage({ params }: PageProps<"/chains/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: chain } = await supabase
    .from("llm_prompt_chains")
    .select("id, name, description, is_active, created_at, prompt_chain_mix (weight)")
    .eq("id", id)
    .maybeSingle();
  if (!chain) notFound();

  const { data } = await supabase
    .from("llm_prompt_chain_steps")
    .select("id, step_order, title, include_image, output_json, prompt_template, created_at, llm_models (name, api_model_id)")
    .eq("chain_id", id)
    .order("step_order");
  const steps = (data ?? []) as unknown as Step[];
  const mix = chain.prompt_chain_mix as unknown as { weight: number } | null;

  return (
    <div className="space-y-6">
      <Link href="/chains" className="font-mono text-sm underline underline-offset-4">← All prompt chains</Link>
      <header>
        <p className={eyebrowClass}>Prompt chain steps · read only</p>
        <h1 className="mt-1 font-display text-5xl uppercase leading-none">{chain.name}</h1>
        <p className="mt-2 max-w-2xl font-mono text-sm text-muted">{chain.description}</p>
        <p className="mt-1 font-mono text-xs text-muted">
          {chain.is_active ? "Active" : "Inactive"} · mix weight {mix?.weight ?? 0} · created {formatDate(chain.created_at)} ·{" "}
          <Link href={`/requests?chain=${chain.id}`} className="underline">see its runs</Link>
        </p>
      </header>

      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={s.id} className={`${cardClass} p-5`}>
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-display text-4xl leading-none text-rouge">{s.step_order}</span>
              <h2 className="font-display text-2xl uppercase">{s.title}</h2>
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-1 font-mono text-xs sm:grid-cols-[9rem_1fr]">
              <dt className="text-muted">Model</dt>
              <dd>{s.llm_models ? `${s.llm_models.name} (${s.llm_models.api_model_id})` : "Best active model, by priority"}</dd>
              <dt className="text-muted">Sees the photo</dt>
              <dd>{s.include_image ? "Yes" : "No"}</dd>
              <dt className="text-muted">Output</dt>
              <dd>{s.output_json || i === steps.length - 1 ? "JSON array of captions" : "Free text → {{previous}} in the next step"}</dd>
            </dl>
            <p className={`${eyebrowClass} mt-4`}>Prompt template</p>
            <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap border border-rule bg-white p-3 font-mono text-xs">{s.prompt_template}</pre>
          </li>
        ))}
        {steps.length === 0 && <li className="font-mono text-sm text-muted">This chain has no steps.</li>}
      </ol>
    </div>
  );
}
