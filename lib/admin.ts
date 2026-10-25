import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Second line of defense behind proxy.ts: every admin page and server action
// calls this, so nothing renders or mutates unless the caller is a superadmin.
// The database's RLS policies are the third line.
export const requireAdmin = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, avatar_url, is_superadmin")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.is_superadmin !== true) redirect("/login?error=forbidden");

  return { supabase, user, profile };
});

export function displayName(p: { first_name?: string | null; last_name?: string | null; email?: string | null } | null) {
  const name = [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim();
  return name || p?.email || "Unknown";
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
