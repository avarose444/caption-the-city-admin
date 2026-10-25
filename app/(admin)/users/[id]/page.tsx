import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import { StatTile } from "@/components/charts";
import { cardClass, eyebrowClass } from "@/components/styles";
import { displayName, formatDate, requireAdmin } from "@/lib/admin";
import { CAPTION_FIELDS, PHOTO_FIELDS, PROFILE_FIELDS, type CaptionRow, type PhotoRow, type ProfileRow } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function UserPage({ params }: PageProps<"/users/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: profile } = await supabase.from("profiles").select(PROFILE_FIELDS).eq("id", id).maybeSingle<ProfileRow>();
  if (!profile) notFound();

  const [{ data: photos }, { data: votes }] = await Promise.all([
    supabase
      .from("photos")
      .select(`${PHOTO_FIELDS}, captions (${CAPTION_FIELDS})`)
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("caption_votes")
      .select("id, vote, created_at, captions (id, body, photo_id)")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(25),
  ]);
  const { count: voteTotal } = await supabase
    .from("caption_votes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", id);

  const myPhotos = (photos ?? []) as (PhotoRow & { captions: CaptionRow[] })[];
  const net = myPhotos.flatMap((p) => p.captions).reduce((s, c) => s + c.score, 0);
  const name = displayName(profile);
  const recentVotes = (votes ?? []) as unknown as { id: string; vote: number; created_at: string; captions: { id: string; body: string; photo_id: string } | null }[];

  return (
    <div className="space-y-6">
      <Link href="/users" className="font-mono text-sm underline underline-offset-4">← All members</Link>

      <header className="flex flex-wrap items-center gap-5">
        <Avatar url={profile.avatar_url} name={name} size={88} />
        <div>
          <p className={eyebrowClass}>Member profile · read only</p>
          <h1 className="font-display text-5xl uppercase leading-none">{name}</h1>
          <p className="mt-1 font-mono text-sm text-muted">
            {profile.email} · joined {formatDate(profile.created_at)}
            {profile.is_superadmin && " · superadmin"}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Photos" value={`${myPhotos.length}`} />
        <StatTile label="Captions on them" value={`${myPhotos.reduce((s, p) => s + p.captions.length, 0)}`} />
        <StatTile label="Net score earned" value={`${net > 0 ? "+" : ""}${net}`} />
        <StatTile label="Votes cast" value={`${voteTotal ?? 0}`} />
      </div>

      <section className={`${cardClass} p-5`}>
        <h2 className="font-display text-2xl uppercase">Profile fields</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 font-mono text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="text-muted">ID</dt><dd className="break-all">{profile.id}</dd>
          <dt className="text-muted">First name</dt><dd>{profile.first_name ?? "—"}</dd>
          <dt className="text-muted">Last name</dt><dd>{profile.last_name ?? "—"}</dd>
          <dt className="text-muted">Favorite film</dt><dd>{profile.favorite_film ?? "—"}</dd>
          <dt className="text-muted">is_superadmin</dt><dd>{String(profile.is_superadmin)}</dd>
        </dl>
      </section>

      <section>
        <h2 className="font-display text-2xl uppercase">Photos</h2>
        {myPhotos.length ? (
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {myPhotos.map((p) => (
              <Link key={p.id} href={`/media/${p.id}`} className={`${cardClass} block overflow-hidden hover:shadow-[4px_4px_0_0_#111]`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url} alt="" className="aspect-square w-full object-cover" />
                <p className="p-2 font-mono text-xs text-muted">
                  {p.neighborhood ?? "Unlabeled"} · {p.captions.length} captions
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-2 font-mono text-sm text-muted">No photos posted.</p>
        )}
      </section>

      <section className={`${cardClass} p-5`}>
        <h2 className="font-display text-2xl uppercase">Recent votes</h2>
        {recentVotes.length ? (
          <ul className="mt-3 divide-y divide-rule font-mono text-sm">
            {recentVotes.map((v) => (
              <li key={v.id} className="flex gap-3 py-2">
                <span className={v.vote === 1 ? "text-bleu" : "text-rouge"}>{v.vote === 1 ? "▲" : "▼"}</span>
                {v.captions ? (
                  <Link href={`/media/${v.captions.photo_id}`} className="flex-1 underline-offset-4 hover:underline">{v.captions.body}</Link>
                ) : (
                  <span className="flex-1 text-muted">Deleted caption</span>
                )}
                <span className="shrink-0 text-xs text-muted">{formatDate(v.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 font-mono text-sm text-muted">No votes cast.</p>
        )}
      </section>
    </div>
  );
}
