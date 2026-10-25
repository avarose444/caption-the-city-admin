import Link from "next/link";
import { buttonClass, cardClass, eyebrowClass, ghostButtonClass, inputClass } from "@/components/styles";
import { displayName, formatDate, requireAdmin } from "@/lib/admin";
import { CAPTION_FIELDS, PHOTO_FIELDS, type CaptionRow, type PhotoRow } from "@/lib/data";
import { NEIGHBORHOODS } from "@/lib/neighborhoods";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;
const SORTS = {
  newest: { column: "created_at", ascending: false, label: "Newest" },
  oldest: { column: "created_at", ascending: true, label: "Oldest" },
  top: { column: "score", ascending: false, label: "Top score" },
  bottom: { column: "score", ascending: true, label: "Lowest score" },
} as const;

export default async function MediaPage({ searchParams }: PageProps<"/media">) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const view = params.view === "captions" ? "captions" : "photos";
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={eyebrowClass}>Les Médias · create, read, update, delete</p>
          <h1 className="mt-1 font-display text-5xl uppercase leading-none">AI-generated media</h1>
          <p className="mt-2 max-w-xl font-mono text-sm text-muted">
            Every photo and the Gemini-written captions on it. Open a photo to edit or delete it, rewrite captions, or have Gemini write more.
          </p>
        </div>
        <Link href="/media/new" className={buttonClass}>+ New photo</Link>
      </header>

      <div className="flex gap-2">
        <Link href="/media" className={view === "photos" ? buttonClass : ghostButtonClass}>Photos</Link>
        <Link href="/media?view=captions" className={view === "captions" ? buttonClass : ghostButtonClass}>Captions</Link>
      </div>

      {view === "photos" ? (
        <PhotoGrid supabase={supabase} from={from} page={page} neighborhood={typeof params.n === "string" ? params.n : ""} />
      ) : (
        <CaptionTable
          supabase={supabase}
          from={from}
          page={page}
          q={typeof params.q === "string" ? params.q.trim() : ""}
          sort={(typeof params.sort === "string" && params.sort in SORTS ? params.sort : "newest") as keyof typeof SORTS}
        />
      )}
    </div>
  );
}

type Supabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

async function PhotoGrid({ supabase, from, page, neighborhood }: { supabase: Supabase; from: number; page: number; neighborhood: string }) {
  let query = supabase
    .from("photos")
    .select(`${PHOTO_FIELDS}, captions (id, score)`, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (neighborhood) query = query.eq("neighborhood", neighborhood);
  const { data, count } = await query;
  const photos = (data ?? []) as unknown as (PhotoRow & { captions: { id: string; score: number }[] })[];

  // photos.user_id points at auth.users, so look up posters' profiles separately.
  const { data: posters } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .in("id", [...new Set(photos.map((p) => p.user_id))]);
  const posterById = new Map((posters ?? []).map((p) => [p.id, p]));

  return (
    <>
      <form className="flex max-w-md gap-2">
        <select name="n" defaultValue={neighborhood} className={inputClass}>
          <option value="">All neighborhoods</option>
          {NEIGHBORHOODS.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
        <button className={ghostButtonClass}>Filter</button>
      </form>
      {photos.length ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {photos.map((p) => {
            const best = Math.max(...p.captions.map((c) => c.score), 0);
            return (
              <Link key={p.id} href={`/media/${p.id}`} className={`${cardClass} block overflow-hidden transition-shadow hover:shadow-[6px_6px_0_0_#111]`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url} alt={p.note ?? ""} className="aspect-[4/3] w-full bg-black object-cover" />
                <div className="space-y-1 p-3 font-mono text-xs">
                  <p className="font-bold">{p.neighborhood ?? "Unlabeled"}</p>
                  <p className="text-muted">
                    {p.captions.length} captions · best +{best}
                  </p>
                  <p className="truncate text-muted">
                    {displayName(posterById.get(p.user_id) ?? null)} · {formatDate(p.created_at)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="font-mono text-sm text-muted">No photos{neighborhood && ` in ${neighborhood}`} yet.</p>
      )}
      <Pager page={page} total={count} extra={neighborhood ? { n: neighborhood } : {}} />
    </>
  );
}

async function CaptionTable({ supabase, from, page, q, sort }: { supabase: Supabase; from: number; page: number; q: string; sort: keyof typeof SORTS }) {
  const order = SORTS[sort];
  let query = supabase
    .from("captions")
    .select(`${CAPTION_FIELDS}, photos (image_url, neighborhood)`, { count: "exact" })
    .order(order.column, { ascending: order.ascending })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (q) query = query.ilike("body", `%${q.replace(/[%_]/g, "")}%`);
  const { data, count } = await query;
  const captions = (data ?? []) as unknown as (CaptionRow & { photos: { image_url: string; neighborhood: string | null } | null })[];

  return (
    <>
      <form className="flex max-w-2xl flex-wrap gap-2">
        <input type="hidden" name="view" value="captions" />
        <input name="q" defaultValue={q} placeholder="Search caption text…" className={`${inputClass} flex-1`} />
        <select name="sort" defaultValue={sort} className={`${inputClass} w-auto`}>
          {Object.entries(SORTS).map(([key, s]) => (
            <option key={key} value={key}>{s.label}</option>
          ))}
        </select>
        <button className={ghostButtonClass}>Apply</button>
      </form>
      <div className={`${cardClass} overflow-x-auto`}>
        <table className="w-full min-w-[720px] font-mono text-sm">
          <thead className="border-b-2 border-black text-left text-xs uppercase tracking-widest text-muted">
            <tr>
              <th className="p-3 font-normal">Photo</th>
              <th className="p-3 font-normal">Caption</th>
              <th className="p-3 font-normal">Model</th>
              <th className="p-3 text-right font-normal">▲</th>
              <th className="p-3 text-right font-normal">▼</th>
              <th className="p-3 text-right font-normal">Net</th>
              <th className="p-3 font-normal">Created</th>
            </tr>
          </thead>
          <tbody>
            {captions.map((c) => (
              <tr key={c.id} className="border-b border-rule align-top hover:bg-white">
                <td className="p-3">
                  <Link href={`/media/${c.photo_id}#caption-${c.id}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {c.photos && <img src={c.photos.image_url} alt="" className="h-12 w-16 border border-black object-cover" />}
                  </Link>
                </td>
                <td className="p-3">
                  <Link href={`/media/${c.photo_id}#caption-${c.id}`} className="underline-offset-4 hover:underline">{c.body}</Link>
                </td>
                <td className="p-3 text-xs text-muted">{c.model}</td>
                <td className="p-3 text-right tabular-nums">{c.upvotes}</td>
                <td className="p-3 text-right tabular-nums">{c.downvotes}</td>
                <td className={`p-3 text-right font-bold tabular-nums ${c.score > 0 ? "text-bleu" : c.score < 0 ? "text-rouge" : ""}`}>
                  {c.score > 0 ? "+" : ""}
                  {c.score}
                </td>
                <td className="whitespace-nowrap p-3 text-xs text-muted">{formatDate(c.created_at)}</td>
              </tr>
            ))}
            {captions.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted">No captions found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager page={page} total={count} extra={{ view: "captions", ...(q ? { q } : {}), sort }} />
    </>
  );
}

function Pager({ page, total, extra }: { page: number; total: number | null; extra: Record<string, string> }) {
  const pages = total === null ? null : Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => `/media?${new URLSearchParams({ ...extra, page: String(p) })}`;
  return (
    <div className="flex items-center gap-3 font-mono text-sm">
      {page > 1 && <Link href={href(page - 1)} className="underline underline-offset-4">← Prev</Link>}
      <span className="text-muted">
        Page {page}
        {pages && ` of ${pages}`}
        {total !== null && ` · ${total} total`}
      </span>
      {(pages === null || page < pages) && <Link href={href(page + 1)} className="underline underline-offset-4">Next →</Link>}
    </div>
  );
}
