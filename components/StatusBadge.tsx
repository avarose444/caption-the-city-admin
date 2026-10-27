export default function StatusBadge({ status }: { status: string }) {
  const style =
    status === "succeeded" || status === "ok"
      ? "bg-bleu text-white"
      : status === "failed" || status === "error"
        ? "bg-rouge text-white"
        : "bg-rule text-black";
  const icon = status === "succeeded" || status === "ok" ? "✓" : status === "failed" || status === "error" ? "✕" : "…";
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider ${style}`}>
      <span aria-hidden>{icon}</span>
      {status}
    </span>
  );
}
