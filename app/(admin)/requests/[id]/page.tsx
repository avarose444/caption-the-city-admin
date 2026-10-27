import Link from "next/link";
import { notFound } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import { cardClass, eyebrowClass } from "@/components/styles";
import { displayName, formatDate, requireAdmin } from "@/lib/admin";
import { formatMs } from "@/lib/observability";

export const dynamic = "force-dynamic";

type Response = {
  id: string;
  step_order: number;
  model: string;
  prompt: string;
  response_text: string | null;
  http_status: number | null;
  ok: boolean;
  duration_ms: number | null;
  created_at: string;
};

export default async function RequestPage({ params }: PageProps<"/requests/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: request } = await supabase
    .from("generation_requests")
    .select("*, photos (id, image_url, neighborhood)")
    .eq("id", id)
    .maybeSingle();
  if (!request) notFound();

  const [{ data }, { data: person }] = await Promise.all([
    supabase.from("llm_responses").select("*").eq("request_id", id).order("created_at"),
    supabase.from("profiles").select("email, first_name, last_name").eq("id", request.user_id).maybeSingle(),
  ]);
  const responses = (data ?? []) as Response[];
  const photo = request.photos as { id: string; image_url: string; neighborhood: string | null } | null;

  return (
    <div className="space-y-6">
      <Link href="/requests" className="font-mono text-sm underline underline-offset-4">← All requests</Link>
      <header className="flex flex-wrap items-start gap-5">
        {photo && (
          <Link href={`/media/${photo.id}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.image_url} alt="" className="h-28 w-36 border-2 border-black object-cover" />
          </Link>
        )}
        <div>
          <p className={eyebrowClass}>Generation request</p>
          <h1 className="mt-1 font-display text-4xl uppercase leading-none">{request.chain_name ?? "Unknown chain"}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-xs text-muted">
            <StatusBadge status={request.status} />
            <span>{formatDate(request.created_at)}</span>
            <span>source: {request.source}</span>
            <span>
              by <Link href={`/users/${request.user_id}`} className="underline">{displayName(person)}</Link>
            </span>
            <span>{request.caption_count}/{request.requested_count} captions</span>
            <span>total {formatMs(request.duration_ms)}</span>
          </div>
          {request.error && <p className="mt-2 font-mono text-sm text-rouge">{request.error}</p>}
        </div>
      </header>

      <section>
        <h2 className="font-display text-2xl uppercase">LLM calls ({responses.length})</h2>
        <p className="font-mono text-xs text-muted">Every model call in order, including ones that failed and fell back to the next model.</p>
        <ol className="mt-3 space-y-3">
          {responses.map((r) => (
            <li key={r.id} className={`${cardClass} p-4 ${r.ok ? "" : "border-rouge"}`}>
              <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                <span className="font-display text-xl leading-none">Step {r.step_order}</span>
                <StatusBadge status={r.ok ? "ok" : "error"} />
                <span className="font-bold">{r.model}</span>
                <span className="text-muted">HTTP {r.http_status ?? "—"}</span>
                <span className="text-muted">{formatMs(r.duration_ms)}</span>
                <span className="text-muted">{formatDate(r.created_at)}</span>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer font-mono text-xs underline underline-offset-4">Prompt</summary>
                <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap bg-white p-3 font-mono text-xs">{r.prompt}</pre>
              </details>
              <p className={`${eyebrowClass} mt-3`}>Response</p>
              <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap bg-white p-3 font-mono text-xs">{prettify(r.response_text)}</pre>
            </li>
          ))}
          {responses.length === 0 && <li className="font-mono text-sm text-muted">No model calls were logged for this request.</li>}
        </ol>
      </section>
    </div>
  );
}

function prettify(text: string | null) {
  if (!text) return "—";
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}
