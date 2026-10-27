import Link from "next/link";
import { StatTile } from "@/components/charts";
import StatusBadge from "@/components/StatusBadge";
import { buttonClass, cardClass, eyebrowClass, ghostButtonClass } from "@/components/styles";
import { displayName, formatDate, requireAdmin } from "@/lib/admin";
import { daysAgo, formatMs, percentile, rate } from "@/lib/observability";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;
const STATUSES = ["succeeded", "failed", "pending"] as const;

type RequestRow = {
  id: string;
  user_id: string;
  photo_id: string | null;
  chain_id: string | null;
  chain_name: string | null;
  source: string;
  requested_count: number;
  status: string;
  error: string | null;
  caption_count: number;
  duration_ms: number | null;
  created_at: string;
  photos: { image_url: string } | null;
};

export default async function RequestsPage({ searchParams }: PageProps<"/requests">) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const status = STATUSES.find((s) => s === params.status) ?? null;
  const chain = typeof params.chain === "string" ? params.chain : null;
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("generation_requests")
    .select("id, user_id, photo_id, chain_id, chain_name, source, requested_count, status, error, caption_count, duration_ms, created_at, photos (image_url)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (status) query = query.eq("status", status);
  if (chain) query = query.eq("chain_id", chain);

  const since = daysAgo(7);
  const [{ data, count, error }, { data: recent }] = await Promise.all([
    query,
    supabase.from("generation_requests").select("status, duration_ms, caption_count").neq("source", "backfill").gte("created_at", since).limit(5000),
  ]);
  const rows = (data ?? []) as unknown as RequestRow[];

  const { data: people } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .in("id", [...new Set(rows.map((r) => r.user_id))]);
  const personById = new Map((people ?? []).map((p) => [p.id, p]));

  const week = recent ?? [];
  const ok = week.filter((r) => r.status === "succeeded");
  const durations = ok.map((r) => r.duration_ms ?? 0);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const href = (p: number, s = status) =>
    `/requests?${new URLSearchParams({ ...(s ? { status: s } : {}), ...(chain ? { chain } : {}), page: String(p) })}`;

  return (
    <div className="space-y-6">
      <header>
        <p className={eyebrowClass}>Observability · read only</p>
        <h1 className="mt-1 font-display text-5xl uppercase leading-none">Generation requests</h1>
        <p className="mt-2 max-w-2xl font-mono text-sm text-muted">
          One row every time someone asks for captions: in the app (post, more) or here (admin). Open one to see each model call it made.
        </p>
      </header>
      {error && <p className="font-mono text-sm text-rouge">Couldn&apos;t load requests: {error.message}. Has observability.sql been run?</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Requests · 7 days" value={`${week.length}`} />
        <StatTile label="Success rate" value={rate(ok.length, week.length)} sub={`${week.length - ok.length} failed or stuck`} />
        <StatTile label="p50 latency" value={formatMs(percentile(durations, 50))} />
        <StatTile label="p95 latency" value={formatMs(percentile(durations, 95))} />
        <StatTile label="Captions made" value={`${ok.reduce((s, r) => s + r.caption_count, 0)}`} sub="last 7 days" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={href(1, null)} className={status === null ? buttonClass : ghostButtonClass}>All</Link>
        {STATUSES.map((s) => (
          <Link key={s} href={href(1, s)} className={status === s ? buttonClass : ghostButtonClass}>{s}</Link>
        ))}
        {chain && <Link href="/requests" className="self-center font-mono text-xs underline">Clear chain filter</Link>}
      </div>

      <div className={`${cardClass} overflow-x-auto`}>
        <table className="w-full min-w-[820px] font-mono text-sm">
          <thead className="border-b-2 border-black text-left text-xs uppercase tracking-widest text-muted">
            <tr>
              <th className="p-3 font-normal">When</th>
              <th className="p-3 font-normal">Status</th>
              <th className="p-3 font-normal">Photo</th>
              <th className="p-3 font-normal">Chain</th>
              <th className="p-3 font-normal">Source</th>
              <th className="p-3 font-normal">Who</th>
              <th className="p-3 text-right font-normal">Captions</th>
              <th className="p-3 text-right font-normal">Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-rule align-top hover:bg-white">
                <td className="whitespace-nowrap p-3 text-xs">
                  <Link href={`/requests/${r.id}`} className="underline underline-offset-4">{formatDate(r.created_at)}</Link>
                </td>
                <td className="p-3">
                  <StatusBadge status={r.status} />
                  {r.error && <p className="mt-1 max-w-[16rem] text-xs text-rouge">{r.error}</p>}
                </td>
                <td className="p-3">
                  {r.photos ? (
                    <Link href={`/media/${r.photo_id}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.photos.image_url} alt="" className="h-10 w-14 border border-black object-cover" />
                    </Link>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="p-3 text-xs">{r.chain_name ?? "—"}</td>
                <td className="p-3 text-xs">{r.source}</td>
                <td className="p-3 text-xs">
                  <Link href={`/users/${r.user_id}`} className="underline-offset-4 hover:underline">{displayName(personById.get(r.user_id) ?? null)}</Link>
                </td>
                <td className="p-3 text-right tabular-nums">
                  {r.caption_count}/{r.requested_count}
                </td>
                <td className="p-3 text-right tabular-nums">{formatMs(r.duration_ms)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted">No requests logged yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 font-mono text-sm">
        {page > 1 && <Link href={href(page - 1)} className="underline underline-offset-4">← Prev</Link>}
        <span className="text-muted">Page {page} of {pages} · {count ?? 0} requests</span>
        {page < pages && <Link href={href(page + 1)} className="underline underline-offset-4">Next →</Link>}
      </div>
    </div>
  );
}
