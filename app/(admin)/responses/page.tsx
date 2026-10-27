import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { buttonClass, cardClass, eyebrowClass, ghostButtonClass } from "@/components/styles";
import { formatDate, requireAdmin } from "@/lib/admin";
import { formatMs, percentile, rate } from "@/lib/observability";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;

type ResponseRow = {
  id: string;
  request_id: string;
  step_order: number;
  model: string;
  response_text: string | null;
  http_status: number | null;
  ok: boolean;
  duration_ms: number | null;
  created_at: string;
};

export default async function ResponsesPage({ searchParams }: PageProps<"/responses">) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const okFilter = params.ok === "true" ? true : params.ok === "false" ? false : null;
  const model = typeof params.model === "string" ? params.model : null;
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("llm_responses")
    .select("id, request_id, step_order, model, response_text, http_status, ok, duration_ms, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (okFilter !== null) query = query.eq("ok", okFilter);
  if (model) query = query.eq("model", model);

  const [{ data, count, error }, { data: all }] = await Promise.all([
    query,
    supabase.from("llm_responses").select("model, ok, http_status, duration_ms").not("duration_ms", "is", null).limit(10000),
  ]);
  const rows = (data ?? []) as ResponseRow[];

  // Per-model health, from calls that were timed (i.e. not backfilled).
  const byModel = new Map<string, { calls: number; ok: number; overloaded: number; durations: number[] }>();
  for (const r of all ?? []) {
    const m = byModel.get(r.model) ?? { calls: 0, ok: 0, overloaded: 0, durations: [] };
    m.calls++;
    if (r.ok) {
      m.ok++;
      m.durations.push(r.duration_ms ?? 0);
    }
    if (r.http_status === 429 || r.http_status === 503) m.overloaded++;
    byModel.set(r.model, m);
  }
  const models = [...byModel.entries()].sort((a, b) => b[1].calls - a[1].calls);

  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const href = (p: number, ok: boolean | null = okFilter, m: string | null = model) =>
    `/responses?${new URLSearchParams({ ...(ok !== null ? { ok: String(ok) } : {}), ...(m ? { model: m } : {}), page: String(p) })}`;

  return (
    <div className="space-y-6">
      <header>
        <p className={eyebrowClass}>Observability · read only</p>
        <h1 className="mt-1 font-display text-5xl uppercase leading-none">LLM responses</h1>
        <p className="mt-2 max-w-2xl font-mono text-sm text-muted">Every call to a model: what it returned, how long it took, and whether it was overloaded.</p>
      </header>
      {error && <p className="font-mono text-sm text-rouge">Couldn&apos;t load responses: {error.message}. Has observability.sql been run?</p>}

      <section className={`${cardClass} overflow-x-auto p-5`}>
        <h2 className="font-display text-2xl uppercase">Model health</h2>
        {models.length ? (
          <table className="mt-3 w-full min-w-[560px] font-mono text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted">
              <tr>
                <th className="pb-2 font-normal">Model</th>
                <th className="pb-2 text-right font-normal">Calls</th>
                <th className="pb-2 text-right font-normal">Success</th>
                <th className="pb-2 text-right font-normal">Overloaded</th>
                <th className="pb-2 text-right font-normal">p50</th>
                <th className="pb-2 text-right font-normal">p95</th>
              </tr>
            </thead>
            <tbody>
              {models.map(([name, m]) => (
                <tr key={name} className="border-t border-rule">
                  <td className="py-2">
                    <Link href={href(1, okFilter, name)} className="underline-offset-4 hover:underline">{name}</Link>
                  </td>
                  <td className="py-2 text-right tabular-nums">{m.calls}</td>
                  <td className="py-2 text-right tabular-nums">{rate(m.ok, m.calls)}</td>
                  <td className="py-2 text-right tabular-nums">{rate(m.overloaded, m.calls)}</td>
                  <td className="py-2 text-right tabular-nums">{formatMs(percentile(m.durations, 50))}</td>
                  <td className="py-2 text-right tabular-nums">{formatMs(percentile(m.durations, 95))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-2 font-mono text-sm text-muted">No timed calls yet. New posts will show up here.</p>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Link href={href(1, null)} className={okFilter === null ? buttonClass : ghostButtonClass}>All</Link>
        <Link href={href(1, true)} className={okFilter === true ? buttonClass : ghostButtonClass}>OK</Link>
        <Link href={href(1, false)} className={okFilter === false ? buttonClass : ghostButtonClass}>Errors</Link>
        {model && (
          <Link href={href(1, okFilter, null)} className="font-mono text-xs underline">
            Clear model filter ({model})
          </Link>
        )}
      </div>

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className={`${cardClass} p-3`}>
            <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
              <StatusBadge status={r.ok ? "ok" : "error"} />
              <span className="font-bold">{r.model}</span>
              <span className="text-muted">step {r.step_order}</span>
              <span className="text-muted">HTTP {r.http_status ?? "—"}</span>
              <span className="text-muted">{formatMs(r.duration_ms)}</span>
              <span className="text-muted">{formatDate(r.created_at)}</span>
              <Link href={`/requests/${r.request_id}`} className="ml-auto underline underline-offset-4">Request →</Link>
            </div>
            <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words font-mono text-xs">{r.response_text ?? "—"}</p>
          </li>
        ))}
        {rows.length === 0 && <li className="font-mono text-sm text-muted">No responses logged yet.</li>}
      </ul>
      <div className="flex items-center gap-3 font-mono text-sm">
        {page > 1 && <Link href={href(page - 1)} className="underline underline-offset-4">← Prev</Link>}
        <span className="text-muted">Page {page} of {pages} · {count ?? 0} responses</span>
        {page < pages && <Link href={href(page + 1)} className="underline underline-offset-4">Next →</Link>}
      </div>
    </div>
  );
}
