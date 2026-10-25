"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass } from "./styles";

type State = { error?: string; success?: string };

// A form bound to a server action that returns { error } or { success }.
export default function ActionForm({
  action,
  children,
  className,
}: {
  action: (prev: State, formData: FormData) => Promise<State>;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {children}
      {state.error && <p className="mt-2 font-mono text-xs text-rouge" role="alert">{state.error}</p>}
      {state.success && <p className="mt-2 font-mono text-xs text-bleu" role="status">{state.success}</p>}
    </form>
  );
}

export function SubmitButton({ children, pendingLabel, className = buttonClass }: { children: ReactNode; pendingLabel: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
