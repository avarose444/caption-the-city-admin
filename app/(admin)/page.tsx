import Link from "next/link";
import { BarList, CaptionStill, DailyBars, DivergingBarList, Empty, Heatmap, Panel, StatTile } from "@/components/charts";
import { eyebrowClass } from "@/components/styles";
import { displayName, requireAdmin } from "@/lib/admin";
import {
  CAPTION_FIELDS,
  PHOTO_FIELDS,
  PROFILE_FIELDS,
  VOTE_FIELDS,
  fetchAll,
  type CaptionRow,
  type PhotoRow,
  type ProfileRow,
  type VoteRow,
} from "@/lib/data";
import { computeStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);
const signed = (x: number) => `${x > 0 ? "+" : ""}${x.toFixed(2)}`;

export default async function Dashboard() {
  const { supabase } = await requireAdmin();
  const [profiles, photos, captions, votes] = await Promise.all([
    fetchAll<ProfileRow>(supabase, "profiles", PROFILE_FIELDS),
    fetchAll<PhotoRow>(supabase, "photos", PHOTO_FIELDS),
    fetchAll<CaptionRow>(supabase, "captions", CAPTION_FIELDS),
    fetchAll<VoteRow>(supabase, "caption_votes", VOTE_FIELDS),
  ]);
  const s = computeStats(profiles, photos, captions, votes);
  const t = s.totals;

  const firstVsRest =
    s.captionOrder.length > 1 ? s.captionOrder[0].avgScore - avgOf(s.captionOrder.slice(1).map((p) => p.avgScore)) : null;
  const busiest = busiestSlot(s.heatmap);

  return (
    <div className="space-y-6">
      <header>
        <p className={eyebrowClass}>Dashboard</p>
        <h1 className="mt-1 font-display text-5xl uppercase leading-none">At a glance</h1>
        <p className="mt-2 max-w-2xl font-mono text-sm text-muted">
          What New York is photographing, what Gemini is writing about it, and what the crowd actually finds funny.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Members" value={t.members.toLocaleString()} sub={`${t.activeMembers} have posted or voted`} />
        <StatTile label="Photos" value={t.photos.toLocaleString()} sub={`${t.captionsPerPhoto.toFixed(1)} AI captions each`} />
        <StatTile label="AI captions" value={t.captions.toLocaleString()} sub={`${s.unseen} never voted on`} />
        <StatTile label="Votes cast" value={t.votes.toLocaleString()} sub={`${t.votesLast7} in the last 7 days`} />
        <StatTile label="Laugh rate" value={pct(t.upShare)} sub="of all votes are upvotes" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Crowd favorite" kicker="Highest net score">
          <CaptionStill caption={s.best} tag="Best" />
        </Panel>
        <Panel title="Most divisive" kicker="The critics are split">
          <CaptionStill caption={s.divisive} tag="Split" />
        </Panel>
        <Panel title="The flop" kicker="Lowest net score">
          <CaptionStill caption={s.worst} tag="Worst" />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Votes per day" kicker="Last 30 days">
          <DailyBars days={s.days} />
        </Panel>
        <Panel title="When does the city laugh?" kicker="Votes by weekday & hour, NYC time">
          {t.votes ? (
            <>
              <Heatmap grid={s.heatmap} />
              {busiest && <p className="mt-3 font-mono text-xs text-muted">Peak: {busiest}.</p>}
            </>
          ) : (
            <Empty>No votes yet.</Empty>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Is Gemini's first idea its best?" kicker="Avg net score by the order captions were written">
          {s.captionOrder.length ? (
            <>
              <DivergingBarList
                rows={s.captionOrder.map((p) => ({
                  label: `Caption #${p.position}`,
                  value: p.avgScore,
                  display: signed(p.avgScore),
                  sub: `${p.captions}`,
                }))}
              />
              {firstVsRest !== null && (
                <p className="mt-3 font-mono text-xs text-muted">
                  {firstVsRest >= 0
                    ? `First drafts beat later ones by ${firstVsRest.toFixed(2)} points on average. Trust the instinct.`
                    : `Later captions beat the first draft by ${(-firstVsRest).toFixed(2)} points. Rewrites pay off.`}
                </p>
              )}
            </>
          ) : (
            <Empty>No captions yet.</Empty>
          )}
        </Panel>
        <Panel title="Does brevity win?" kicker="Avg net score by caption length">
          <DivergingBarList
            rows={s.lengthBuckets.map((b) => ({ label: b.label, value: b.avgScore, display: signed(b.avgScore), sub: `${b.captions}` }))}
          />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Neighborhoods" kicker="Photos posted · avg caption score" className="xl:col-span-2">
          {s.neighborhoods.length ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className={`${eyebrowClass} mb-2`}>Most photographed</p>
                <BarList rows={s.neighborhoods.slice(0, 8).map((n) => ({ label: n.name, value: n.photos, display: `${n.photos}` }))} />
              </div>
              <div>
                <p className={`${eyebrowClass} mb-2`}>Funniest (avg net score)</p>
                <DivergingBarList
                  rows={[...s.neighborhoods]
                    .filter((n) => n.captions > 0)
                    .sort((a, b) => b.avgScore - a.avgScore)
                    .slice(0, 8)
                    .map((n) => ({ label: n.name, value: n.avgScore, display: signed(n.avgScore) }))}
                />
              </div>
            </div>
          ) : (
            <Empty>No photos yet.</Empty>
          )}
        </Panel>
        <Panel title="Model scoreboard" kicker="Which Gemini is funniest?">
          {s.models.length ? (
            <table className="w-full font-mono text-xs">
              <thead className="text-left text-muted">
                <tr>
                  <th className="pb-2 font-normal">Model</th>
                  <th className="pb-2 text-right font-normal">Captions</th>
                  <th className="pb-2 text-right font-normal">Avg</th>
                  <th className="pb-2 text-right font-normal">▲ share</th>
                </tr>
              </thead>
              <tbody>
                {s.models.map((m) => (
                  <tr key={m.model} className="border-t border-rule">
                    <td className="py-2 pr-2 break-all">{m.model}</td>
                    <td className="py-2 text-right tabular-nums">{m.captions}</td>
                    <td className="py-2 text-right tabular-nums">{signed(m.avgScore)}</td>
                    <td className="py-2 text-right tabular-nums">{pct(m.upShare)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty>No captions yet.</Empty>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Voter personalities" kicker="Share of each voter's votes that are upvotes">
          <BarList rows={s.personalities.map((p) => ({ label: p.label, value: p.count, display: `${p.count}`, sub: p.hint }))} />
          {s.topVoters.length > 0 && (
            <>
              <p className={`${eyebrowClass} mb-2 mt-5`}>Most active voters</p>
              <ol className="space-y-1 font-mono text-xs">
                {s.topVoters.map((v) => (
                  <li key={v.id} className="flex justify-between gap-2">
                    <Link href={`/users/${v.id}`} className="truncate underline-offset-4 hover:underline">
                      {displayName(v.name ?? null)}
                    </Link>
                    <span className="shrink-0 tabular-nums text-muted">
                      {v.total} votes · {pct(v.upShare)} ▲
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </Panel>
        <Panel title="Best muses" kicker="Posters whose photos earned the most net votes">
          {s.topPosters.length ? (
            <ol className="space-y-2 font-mono text-sm">
              {s.topPosters.map((p, i) => (
                <li key={p.id} className="flex items-baseline justify-between gap-2 border-b border-rule pb-2">
                  <span className="truncate">
                    <span className="mr-2 font-display text-lg">{i + 1}</span>
                    <Link href={`/users/${p.id}`} className="underline-offset-4 hover:underline">
                      {displayName(p.name ?? null)}
                    </Link>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted">
                    {p.net > 0 ? "+" : ""}
                    {p.net} · {p.photos} photos
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <Empty>No photos yet.</Empty>
          )}
        </Panel>
        <Panel title="Members' favorite films" kicker="Favorite films on profiles">
          {s.films.length ? (
            <BarList rows={s.films.map((f) => ({ label: f.film, value: f.count, display: `${f.count}` }))} />
          ) : (
            <Empty>Nobody has named a favorite film yet.</Empty>
          )}
          <p className={`${eyebrowClass} mb-2 mt-5`}>Profile completeness</p>
          <BarList
            max={Math.max(1, t.members)}
            rows={[
              { label: "Full name", value: s.profileCompletion.name, display: pct(t.members ? s.profileCompletion.name / t.members : null) },
              { label: "Photo", value: s.profileCompletion.avatar, display: pct(t.members ? s.profileCompletion.avatar / t.members : null) },
              { label: "Favorite film", value: s.profileCompletion.film, display: pct(t.members ? s.profileCompletion.film / t.members : null) },
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}

function avgOf(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function busiestSlot(grid: number[][]) {
  let best = { d: 0, h: 0, n: 0 };
  grid.forEach((row, d) => row.forEach((n, h) => n > best.n && (best = { d, h, n })));
  if (!best.n) return null;
  const day = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"][best.d];
  const hour = (h: number) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;
  return `${day} ${hour(best.h)}–${hour((best.h + 1) % 24)} (${best.n} votes)`;
}
