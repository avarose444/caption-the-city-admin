import Link from "next/link";
import Avatar from "@/components/Avatar";
import { StatTile } from "@/components/charts";
import { buttonClass, cardClass, eyebrowClass, ghostButtonClass } from "@/components/styles";
import { displayName, formatDate, requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function VotesPage({ searchParams }: PageProps<"/votes">) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const filter = params.type === "up" ? 1 : params.type === "down" ? -1 : null;
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("caption_votes")
    .select("id, vote, user_id, created_at, captions (id, body, photo_id, score, photos (image_url))", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (filter) query = query.eq("vote", filter);

  const count = (vote?: number) => {
    let q = supabase.from("caption_votes").select("id", { count: "exact", head: true });
    if (vote) q = q.eq("vote", vote);
    return q;
  };

  const [{ data, count: filtered }, { count: total }, { count: ups }, { data: mostVoted }] = await Promise.all([
    query,
    count(),
    count(1),
    supabase
      .from("captions")
      .select("id, body, photo_id, upvotes, downvotes, score")
      .order("upvotes", { ascending: false })
      .limit(50),
  ]);

  const votes = (data ?? []) as unknown as {
    id: string;
    vote: 1 | -1;
    user_id: string;
    created_at: string;
    captions: { id: string; body: string; photo_id: string; score: number; photos: { image_url: string } | null } | null;
  }[];

  const { data: voters } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, avatar_url")
    .in("id", [...new Set(votes.map((v) => v.user_id))]);
  const voterById = new Map((voters ?? []).map((p) => [p.id, p]));

  const downs = (total ?? 0) - (ups ?? 0);
  const ratings = (mostVoted ?? [])
    .map((c) => ({ ...c, total: c.upvotes + c.downvotes }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
  const pages = Math.max(1, Math.ceil((filtered ?? 0) / PAGE_SIZE));
  const href = (p: number) => `/votes?${new URLSearchParams({ ...(filter ? { type: filter === 1 ? "up" : "down" } : {}), page: String(p) })}`;

  return (
    <div className="space-y-6">
      <header>
        <p className={eyebrowClass}>Votes · read only</p>
        <h1 className="mt-1 font-display text-5xl uppercase leading-none">Upvotes, downvotes & ratings</h1>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="All votes" value={(total ?? 0).toLocaleString()} />
        <StatTile label="Upvotes ▲" value={(ups ?? 0).toLocaleString()} />
        <StatTile label="Downvotes ▼" value={downs.toLocaleString()} />
        <StatTile label="Up : down" value={downs ? `${((ups ?? 0) / downs).toFixed(1)} : 1` : "—"} sub="upvotes per downvote" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="space-y-3">
          <div className="flex gap-2">
            <Link href="/votes" className={filter === null ? buttonClass : ghostButtonClass}>All</Link>
            <Link href="/votes?type=up" className={filter === 1 ? buttonClass : ghostButtonClass}>▲ Up</Link>
            <Link href="/votes?type=down" className={filter === -1 ? buttonClass : ghostButtonClass}>▼ Down</Link>
          </div>
          <div className={`${cardClass} overflow-x-auto`}>
            <table className="w-full min-w-[640px] font-mono text-sm">
              <thead className="border-b-2 border-black text-left text-xs uppercase tracking-widest text-muted">
                <tr>
                  <th className="p-3 font-normal">Vote</th>
                  <th className="p-3 font-normal">Voter</th>
                  <th className="p-3 font-normal">Caption</th>
                  <th className="p-3 font-normal">When</th>
                </tr>
              </thead>
              <tbody>
                {votes.map((v) => {
                  const voter = voterById.get(v.user_id) ?? null;
                  const name = displayName(voter);
                  return (
                    <tr key={v.id} className="border-b border-rule align-top hover:bg-white">
                      <td className={`p-3 text-lg ${v.vote === 1 ? "text-bleu" : "text-rouge"}`} aria-label={v.vote === 1 ? "upvote" : "downvote"}>
                        {v.vote === 1 ? "▲" : "▼"}
                      </td>
                      <td className="p-3">
                        <Link href={`/users/${v.user_id}`} className="flex items-center gap-2 underline-offset-4 hover:underline">
                          <Avatar url={voter?.avatar_url ?? null} name={name} size={24} />
                          <span className="truncate">{name}</span>
                        </Link>
                      </td>
                      <td className="p-3">
                        {v.captions ? (
                          <Link href={`/media/${v.captions.photo_id}#caption-${v.captions.id}`} className="flex items-start gap-2 underline-offset-4 hover:underline">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {v.captions.photos && <img src={v.captions.photos.image_url} alt="" className="h-9 w-12 shrink-0 border border-black object-cover" />}
                            <span>{v.captions.body}</span>
                          </Link>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap p-3 text-xs text-muted">{formatDate(v.created_at)}</td>
                    </tr>
                  );
                })}
                {votes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted">No votes yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 font-mono text-sm">
            {page > 1 && <Link href={href(page - 1)} className="underline underline-offset-4">← Prev</Link>}
            <span className="text-muted">Page {page} of {pages} · {filtered ?? 0} votes</span>
            {page < pages && <Link href={href(page + 1)} className="underline underline-offset-4">Next →</Link>}
          </div>
        </section>

        <section className={`${cardClass} h-fit p-5`}>
          <p className={eyebrowClass}>Ratings</p>
          <h2 className="font-display text-2xl uppercase">Most-rated captions</h2>
          <p className="mt-1 font-mono text-xs text-muted">Bar shows the up/down split.</p>
          <ol className="mt-4 space-y-4">
            {ratings.map((c) => (
              <li key={c.id} className="font-mono text-xs">
                <Link href={`/media/${c.photo_id}#caption-${c.id}`} className="line-clamp-2 underline-offset-4 hover:underline">{c.body}</Link>
                <div className="mt-1 flex h-2 gap-[2px]" title={`${c.upvotes} up, ${c.downvotes} down`}>
                  {c.upvotes > 0 && <span className="rounded-l bg-bleu" style={{ flex: c.upvotes }} />}
                  {c.downvotes > 0 && <span className="rounded-r bg-rouge" style={{ flex: c.downvotes }} />}
                </div>
                <p className="mt-1 text-muted">
                  ▲ {c.upvotes} · ▼ {c.downvotes} · net {c.score > 0 ? "+" : ""}
                  {c.score}
                </p>
              </li>
            ))}
            {ratings.length === 0 && <li className="font-mono text-sm text-muted">No ratings yet.</li>}
          </ol>
        </section>
      </div>
    </div>
  );
}
