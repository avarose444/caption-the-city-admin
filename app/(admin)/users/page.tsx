import Link from "next/link";
import Avatar from "@/components/Avatar";
import { cardClass, eyebrowClass, ghostButtonClass, inputClass } from "@/components/styles";
import { displayName, formatDate, requireAdmin } from "@/lib/admin";
import { PROFILE_FIELDS, fetchAll, type ProfileRow } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: PageProps<"/users">) {
  const { supabase } = await requireAdmin();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().toLowerCase() : "";

  const [profiles, photos, votes] = await Promise.all([
    fetchAll<ProfileRow>(supabase, "profiles", PROFILE_FIELDS),
    fetchAll<{ user_id: string; created_at: string }>(supabase, "photos", "user_id, created_at"),
    fetchAll<{ user_id: string; vote: number; created_at: string }>(supabase, "caption_votes", "user_id, vote, created_at"),
  ]);

  const count = (rows: { user_id: string }[]) =>
    rows.reduce((m, r) => m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1), new Map<string, number>());
  const photoCounts = count(photos);
  const voteCounts = count(votes);
  const upCounts = count(votes.filter((v) => v.vote === 1));

  const rows = profiles
    .filter((p) =>
      !query ||
      [p.email, p.first_name, p.last_name, p.favorite_film].some((f) => f?.toLowerCase().includes(query)),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={eyebrowClass}>Les Membres · read only</p>
          <h1 className="mt-1 font-display text-5xl uppercase leading-none">Users & profiles</h1>
          <p className="mt-2 font-mono text-sm text-muted">
            {profiles.length} members · {profiles.filter((p) => p.is_superadmin).length} superadmin
          </p>
        </div>
        <form className="flex w-full max-w-sm gap-2">
          <input name="q" defaultValue={query} placeholder="Search name, email, film…" className={inputClass} />
          <button className={ghostButtonClass}>Search</button>
        </form>
      </header>

      <div className={`${cardClass} overflow-x-auto`}>
        <table className="w-full min-w-[720px] font-mono text-sm">
          <thead className="border-b-2 border-black text-left text-xs uppercase tracking-widest text-muted">
            <tr>
              <th className="p-3 font-normal">Member</th>
              <th className="p-3 font-normal">Favorite film</th>
              <th className="p-3 text-right font-normal">Photos</th>
              <th className="p-3 text-right font-normal">Votes</th>
              <th className="p-3 text-right font-normal">▲ share</th>
              <th className="p-3 font-normal">Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const name = displayName(p);
              const v = voteCounts.get(p.id) ?? 0;
              return (
                <tr key={p.id} className="border-b border-rule hover:bg-white">
                  <td className="p-3">
                    <Link href={`/users/${p.id}`} className="flex items-center gap-3">
                      <Avatar url={p.avatar_url} name={name} />
                      <span className="min-w-0">
                        <span className="block truncate font-bold underline-offset-4 hover:underline">
                          {name}
                          {p.is_superadmin && (
                            <span className="ml-2 bg-rouge px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-white">admin</span>
                          )}
                        </span>
                        <span className="block truncate text-xs text-muted">{p.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="p-3 text-muted">{p.favorite_film ?? "—"}</td>
                  <td className="p-3 text-right tabular-nums">{photoCounts.get(p.id) ?? 0}</td>
                  <td className="p-3 text-right tabular-nums">{v}</td>
                  <td className="p-3 text-right tabular-nums">{v ? `${Math.round(((upCounts.get(p.id) ?? 0) / v) * 100)}%` : "—"}</td>
                  <td className="whitespace-nowrap p-3 text-xs text-muted">{formatDate(p.created_at)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted">No members match “{query}”.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
