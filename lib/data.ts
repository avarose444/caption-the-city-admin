import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  favorite_film: string | null;
  avatar_url: string | null;
  is_superadmin: boolean;
  created_at: string;
};

export type PhotoRow = {
  id: string;
  user_id: string;
  image_url: string;
  storage_path: string;
  neighborhood: string | null;
  note: string | null;
  created_at: string;
};

export type CaptionRow = {
  id: string;
  photo_id: string;
  user_id: string;
  body: string;
  prompt: string;
  model: string;
  upvotes: number;
  downvotes: number;
  score: number;
  created_at: string;
};

export type VoteRow = {
  id: string;
  caption_id: string;
  user_id: string;
  vote: 1 | -1;
  created_at: string;
};

export const PROFILE_FIELDS = "id, email, first_name, last_name, favorite_film, avatar_url, is_superadmin, created_at";
export const PHOTO_FIELDS = "id, user_id, image_url, storage_path, neighborhood, note, created_at";
export const CAPTION_FIELDS = "id, photo_id, user_id, body, prompt, model, upvotes, downvotes, score, created_at";
export const VOTE_FIELDS = "id, caption_id, user_id, vote, created_at";

// PostgREST caps each response (1,000 rows by default), so page through.
export async function fetchAll<T>(supabase: SupabaseClient, table: string, fields: string, max = 20_000) {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; from < max; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(fields)
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Could not load ${table}: ${error.message}`);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}
