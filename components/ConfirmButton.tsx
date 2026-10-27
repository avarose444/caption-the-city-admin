"use client";

import { useState, useTransition } from "react";
import { dangerButtonClass } from "./styles";

// Server errors come back as { error } rather than thrown, because Next hides
// thrown messages in production.
export default function ConfirmButton({
  action,
  message,
  label,
}: {
  action: () => Promise<{ error?: string } | void>;
  message: string;
  label: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        disabled={pending}
        className={dangerButtonClass}
        onClick={() => {
          if (!confirm(message)) return;
          setError(null);
          start(async () => {
            const result = await action();
            if (result?.error) setError(result.error);
          });
        }}
      >
        {pending ? "Deleting…" : label}
      </button>
      {error && <span className="mt-1 max-w-xs font-mono text-xs text-rouge" role="alert">{error}</span>}
    </span>
  );
}
