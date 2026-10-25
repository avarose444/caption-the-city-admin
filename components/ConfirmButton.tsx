"use client";

import { useTransition } from "react";
import { dangerButtonClass } from "./styles";

export default function ConfirmButton({ action, message, label }: { action: () => Promise<void>; message: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={dangerButtonClass}
      onClick={() => {
        if (confirm(message)) start(() => action());
      }}
    >
      {pending ? "Deleting…" : label}
    </button>
  );
}
