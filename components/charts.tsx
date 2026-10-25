import type { ReactNode } from "react";
import { cardClass, eyebrowClass } from "./styles";

export function Panel({ title, kicker, children, className = "" }: { title: string; kicker?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`${cardClass} p-5 ${className}`}>
      {kicker && <p className={eyebrowClass}>{kicker}</p>}
      <h2 className="mt-1 font-display text-2xl uppercase leading-tight">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={`${cardClass} p-4`}>
      <p className={eyebrowClass}>{label}</p>
      <p className="mt-2 font-display text-4xl leading-none tabular-nums">{value}</p>
      {sub && <p className="mt-2 font-mono text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="font-mono text-sm text-muted">{children}</p>;
}

// Floating label shown on hover/focus; the native title covers screen readers.
function Tip({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap bg-black px-2 py-1 font-mono text-[11px] text-white group-hover:block group-focus:block">
      {children}
    </span>
  );
}

type BarRow = { label: string; value: number; display: string; sub?: string };

// Horizontal bars for magnitudes (counts). One hue.
export function BarList({ rows, max: fixedMax }: { rows: BarRow[]; max?: number }) {
  const max = fixedMax ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 font-mono text-xs">
          <span className="truncate" title={r.label}>{r.label}</span>
          <span className="h-3 bg-rule/50">
            <span className="block h-full rounded-r bg-bleu" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="tabular-nums">
            {r.display}
            {r.sub && <span className="text-muted"> · {r.sub}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

// Bars around a zero line for net scores: bleu above zero, rouge below.
export function DivergingBarList({ rows }: { rows: BarRow[] }) {
  const max = Math.max(0.01, ...rows.map((r) => Math.abs(r.value)));
  return (
    <ul className="space-y-2">
      {rows.map((r) => {
        const pct = (Math.abs(r.value) / max) * 50;
        return (
          <li key={r.label} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 font-mono text-xs">
            <span className="truncate" title={r.label}>{r.label}</span>
            <span className="relative h-3 bg-rule/50">
              <span className="absolute inset-y-[-3px] left-1/2 w-px bg-muted" />
              <span
                className={`absolute inset-y-0 ${r.value >= 0 ? "left-1/2 rounded-r bg-bleu" : "right-1/2 rounded-l bg-rouge"}`}
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className="tabular-nums">
              {r.display}
              {r.sub && <span className="text-muted"> · {r.sub}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function DailyBars({ days }: { days: { day: string; votes: number; captions: number; photos: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.votes));
  const label = (day: string) =>
    new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <div>
      <div className="flex h-40 items-end gap-[2px] border-b border-muted">
        {days.map((d) => (
          <div
            key={d.day}
            tabIndex={0}
            title={`${label(d.day)}: ${d.votes} votes, ${d.captions} captions, ${d.photos} photos`}
            className="group relative flex h-full flex-1 items-end outline-none hover:bg-rule/40 focus:bg-rule/40"
          >
            <div className="w-full rounded-t bg-bleu" style={{ height: `${(d.votes / max) * 100}%`, minHeight: d.votes ? 2 : 0 }} />
            <Tip>
              {label(d.day)} · {d.votes} votes · {d.captions} captions · {d.photos} photos
            </Tip>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[11px] text-muted">
        <span>{label(days[0].day)}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hourLabel = (h: number) => `${h % 12 || 12}${h < 12 ? "a" : "p"}`;

export function Heatmap({ grid }: { grid: number[][] }) {
  const max = Math.max(1, ...grid.flat());
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        <div className="grid grid-cols-[2.5rem_repeat(24,1fr)] gap-[2px]">
          {grid.map((row, d) => (
            <div key={d} className="contents">
              <span className="font-mono text-[11px] leading-5 text-muted">{WEEKDAYS[d]}</span>
              {row.map((n, h) => (
                <span
                  key={h}
                  tabIndex={0}
                  title={`${WEEKDAYS[d]} ${hourLabel(h)}: ${n} votes`}
                  className="group relative h-5 rounded-sm outline-none ring-black hover:ring-2 focus:ring-2"
                  style={{ background: n ? `color-mix(in srgb, var(--bleu) ${15 + (n / max) * 85}%, white)` : "var(--rule)" }}
                >
                  <Tip>
                    {WEEKDAYS[d]} {hourLabel(h)} · {n} votes
                  </Tip>
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-[2.5rem_repeat(24,1fr)] gap-[2px] font-mono text-[10px] text-muted">
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h}>{h % 6 === 0 ? hourLabel(h) : ""}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// A caption shown the way the main app shows it: a subtitle over the photo.
export function CaptionStill({
  caption,
  tag,
}: {
  caption: { body: string; upvotes: number; downvotes: number; score: number; photo: { image_url: string; neighborhood: string | null } | null } | null;
  tag: string;
}) {
  if (!caption) return <Empty>Not enough votes yet.</Empty>;
  return (
    <figure>
      <div className="relative aspect-[4/3] overflow-hidden border-2 border-black bg-black">
        {caption.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={caption.photo.image_url} alt="" className="h-full w-full object-cover opacity-90" />
        )}
        <span className="absolute left-2 top-2 bg-rouge px-2 py-0.5 font-display text-xs uppercase tracking-widest text-white">{tag}</span>
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8 text-center font-mono text-sm font-bold text-[#fff6c8]">
          {caption.body}
        </figcaption>
      </div>
      <p className="mt-2 font-mono text-xs text-muted">
        ▲ {caption.upvotes} · ▼ {caption.downvotes} · net {caption.score > 0 ? "+" : ""}
        {caption.score}
        {caption.photo?.neighborhood && ` · ${caption.photo.neighborhood}`}
      </p>
    </figure>
  );
}
