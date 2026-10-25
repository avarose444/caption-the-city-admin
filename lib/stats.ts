import type { CaptionRow, PhotoRow, ProfileRow, VoteRow } from "./data";

const TZ = "America/New_York";
const DAY_MS = 86_400_000;

function nycParts(iso: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    day: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")),
  };
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export type Stats = ReturnType<typeof computeStats>;

export function computeStats(
  profiles: ProfileRow[],
  photos: PhotoRow[],
  captions: CaptionRow[],
  votes: VoteRow[],
) {
  const upvotes = votes.filter((v) => v.vote === 1).length;
  const photoById = new Map(photos.map((p) => [p.id, p]));
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const captionsByPhoto = new Map<string, CaptionRow[]>();
  for (const c of captions) {
    const list = captionsByPhoto.get(c.photo_id) ?? [];
    list.push(c);
    captionsByPhoto.set(c.photo_id, list);
  }

  // Last 30 days of activity, one bucket per NYC calendar day.
  const today = Date.now();
  const days = Array.from({ length: 30 }, (_, i) => {
    const iso = new Date(today - (29 - i) * DAY_MS).toISOString();
    return { day: nycParts(iso).day, photos: 0, captions: 0, votes: 0 };
  });
  const dayIndex = new Map(days.map((d, i) => [d.day, i]));
  const bump = (iso: string, key: "photos" | "captions" | "votes") => {
    const i = dayIndex.get(nycParts(iso).day);
    if (i !== undefined) days[i][key]++;
  };
  photos.forEach((p) => bump(p.created_at, "photos"));
  captions.forEach((c) => bump(c.created_at, "captions"));
  votes.forEach((v) => bump(v.created_at, "votes"));

  // When does the city laugh? Votes by weekday x hour (NYC time).
  const heatmap = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const v of votes) {
    const { weekday, hour } = nycParts(v.created_at);
    if (weekday >= 0) heatmap[weekday][hour]++;
  }

  // Neighborhoods: how many photos, and how funny their captions are.
  const hoods = new Map<string, { photos: number; scores: number[] }>();
  for (const p of photos) {
    const name = p.neighborhood ?? "Unlabeled";
    const entry = hoods.get(name) ?? { photos: 0, scores: [] };
    entry.photos++;
    for (const c of captionsByPhoto.get(p.id) ?? []) entry.scores.push(c.score);
    hoods.set(name, entry);
  }
  const neighborhoods = [...hoods.entries()]
    .map(([name, e]) => ({ name, photos: e.photos, captions: e.scores.length, avgScore: avg(e.scores) }))
    .sort((a, b) => b.photos - a.photos || b.avgScore - a.avgScore);

  // Which Gemini model is funniest?
  const modelMap = new Map<string, CaptionRow[]>();
  for (const c of captions) modelMap.set(c.model, [...(modelMap.get(c.model) ?? []), c]);
  const models = [...modelMap.entries()]
    .map(([model, list]) => {
      const up = list.reduce((s, c) => s + c.upvotes, 0);
      const down = list.reduce((s, c) => s + c.downvotes, 0);
      return { model, captions: list.length, avgScore: avg(list.map((c) => c.score)), upShare: up + down ? up / (up + down) : null };
    })
    .sort((a, b) => b.captions - a.captions);

  // Is Gemini's first idea its best? Average score by the order captions were
  // written for each photo.
  const positions: number[][] = [];
  for (const list of captionsByPhoto.values()) {
    [...list]
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
      .slice(0, 6)
      .forEach((c, i) => (positions[i] ??= []).push(c.score));
  }
  const captionOrder = positions.map((scores, i) => ({ position: i + 1, captions: scores.length, avgScore: avg(scores) }));

  // Does brevity win? Score by caption length.
  const lengthBuckets = [
    { label: "Under 40 chars", min: 0, max: 39 },
    { label: "40–69", min: 40, max: 69 },
    { label: "70–99", min: 70, max: 99 },
    { label: "100+", min: 100, max: Infinity },
  ].map((b) => {
    const list = captions.filter((c) => c.body.length >= b.min && c.body.length <= b.max);
    return { label: b.label, captions: list.length, avgScore: avg(list.map((c) => c.score)) };
  });

  // Hall of fame (and shame).
  const voted = captions.filter((c) => c.upvotes + c.downvotes > 0);
  const withPhoto = (c: CaptionRow | undefined) => (c ? { ...c, photo: photoById.get(c.photo_id) ?? null } : null);
  const best = withPhoto([...voted].sort((a, b) => b.score - a.score || b.upvotes - a.upvotes)[0]);
  const worst = withPhoto([...voted].sort((a, b) => a.score - b.score || b.downvotes - a.downvotes)[0]);
  // Divisive: lots of votes on both sides. min(up, down) rewards real splits.
  const divisive = withPhoto(
    [...voted]
      .filter((c) => c.upvotes > 0 && c.downvotes > 0)
      .sort((a, b) => Math.min(b.upvotes, b.downvotes) - Math.min(a.upvotes, a.downvotes) || b.upvotes + b.downvotes - (a.upvotes + a.downvotes))[0],
  );
  const unseen = captions.length - voted.length;

  // Voter personalities from each voter's share of upvotes.
  const voterMap = new Map<string, { up: number; down: number }>();
  for (const v of votes) {
    const e = voterMap.get(v.user_id) ?? { up: 0, down: 0 };
    if (v.vote === 1) e.up++;
    else e.down++;
    voterMap.set(v.user_id, e);
  }
  const voters = [...voterMap.entries()].map(([id, e]) => ({
    id,
    name: profileById.get(id),
    total: e.up + e.down,
    upShare: e.up / (e.up + e.down),
  }));
  const personalities = [
    { label: "Cheerleaders", hint: "80%+ upvotes", count: voters.filter((v) => v.upShare >= 0.8).length },
    { label: "Fair critics", hint: "40–79% upvotes", count: voters.filter((v) => v.upShare >= 0.4 && v.upShare < 0.8).length },
    { label: "Tough crowd", hint: "under 40% upvotes", count: voters.filter((v) => v.upShare < 0.4).length },
  ];
  const topVoters = [...voters].sort((a, b) => b.total - a.total).slice(0, 5);

  // Posters whose photos inspired the funniest captions.
  const posterMap = new Map<string, { photos: number; net: number }>();
  for (const p of photos) {
    const e = posterMap.get(p.user_id) ?? { photos: 0, net: 0 };
    e.photos++;
    e.net += (captionsByPhoto.get(p.id) ?? []).reduce((s, c) => s + c.score, 0);
    posterMap.set(p.user_id, e);
  }
  const topPosters = [...posterMap.entries()]
    .map(([id, e]) => ({ id, name: profileById.get(id), ...e }))
    .sort((a, b) => b.net - a.net || b.photos - a.photos)
    .slice(0, 5);

  // Members' taste in film.
  const filmMap = new Map<string, number>();
  for (const p of profiles) {
    const film = p.favorite_film?.trim();
    if (film) filmMap.set(film, (filmMap.get(film) ?? 0) + 1);
  }
  const films = [...filmMap.entries()].map(([film, count]) => ({ film, count })).sort((a, b) => b.count - a.count).slice(0, 6);

  const active = new Set([...photos.map((p) => p.user_id), ...votes.map((v) => v.user_id)]);

  return {
    totals: {
      members: profiles.length,
      activeMembers: active.size,
      photos: photos.length,
      captions: captions.length,
      votes: votes.length,
      upShare: votes.length ? upvotes / votes.length : null,
      captionsPerPhoto: photos.length ? captions.length / photos.length : 0,
      votesLast7: days.slice(-7).reduce((s, d) => s + d.votes, 0),
    },
    days,
    heatmap,
    neighborhoods,
    models,
    captionOrder,
    lengthBuckets,
    best,
    worst,
    divisive,
    unseen,
    personalities,
    topVoters,
    topPosters,
    films,
    profileCompletion: {
      name: profiles.filter((p) => p.first_name && p.last_name).length,
      avatar: profiles.filter((p) => p.avatar_url).length,
      film: profiles.filter((p) => p.favorite_film).length,
    },
  };
}
