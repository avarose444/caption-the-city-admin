// Small helpers for latency and success-rate summaries.

export function percentile(values: number[], p: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

export function formatMs(ms: number | null | undefined) {
  if (ms === null || ms === undefined) return "—";
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export function rate(part: number, whole: number) {
  return whole ? `${Math.round((part / whole) * 100)}%` : "—";
}

export function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}
