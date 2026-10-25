"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { generateCaptions } from "@/lib/gemini";
import { NEIGHBORHOODS } from "@/lib/neighborhoods";

export type ActionState = { error?: string; success?: string };

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MANUAL_MODEL = "human (admin)";

function text(formData: FormData, key: string, max: number) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function neighborhoodFrom(formData: FormData) {
  const raw = formData.get("neighborhood");
  return NEIGHBORHOODS.find((n) => n === raw) ?? null;
}

// CREATE a photo, optionally with Gemini-written captions.
export async function createPhoto(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireAdmin();

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return { error: "Choose a photo first." };
  if (!PHOTO_TYPES.includes(photo.type)) return { error: "Photos must be JPG, PNG, or WebP." };
  if (photo.size > MAX_PHOTO_BYTES) return { error: "Photos must be 4 MB or smaller." };

  const neighborhood = neighborhoodFrom(formData);
  const note = text(formData, "note", 140);
  const count = Math.min(6, Math.max(0, Number(formData.get("count")) || 0));
  const bytes = Buffer.from(await photo.arrayBuffer());

  let generated: Awaited<ReturnType<typeof generateCaptions>> | null = null;
  if (count > 0) {
    try {
      generated = await generateCaptions({ imageBase64: bytes.toString("base64"), mimeType: photo.type, neighborhood, note, count });
    } catch (error) {
      return { error: (error as Error).message };
    }
  }

  const path = `${user.id}/${Date.now()}.${photo.type.split("/")[1]}`;
  const { error: uploadError } = await supabase.storage.from("city-photos").upload(path, bytes, { contentType: photo.type });
  if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

  const imageUrl = supabase.storage.from("city-photos").getPublicUrl(path).data.publicUrl;
  const { data: saved, error } = await supabase
    .from("photos")
    .insert({ user_id: user.id, image_url: imageUrl, storage_path: path, neighborhood, note })
    .select("id")
    .single();
  if (error) return { error: error.message };

  if (generated) {
    const { error: captionError } = await supabase.from("captions").insert(
      generated.captions.map((body) => ({ photo_id: saved.id, user_id: user.id, body, prompt: generated.prompt, model: generated.model })),
    );
    if (captionError) return { error: captionError.message };
  }

  revalidatePath("/media");
  redirect(`/media/${saved.id}`);
}

// UPDATE a photo's neighborhood and note.
export async function updatePhoto(photoId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("photos")
    .update({ neighborhood: neighborhoodFrom(formData), note: text(formData, "note", 140) })
    .eq("id", photoId);
  if (error) return { error: error.message };
  revalidatePath(`/media/${photoId}`);
  return { success: "Photo saved." };
}

// DELETE a photo, its captions and votes (cascade), and its file.
export async function deletePhoto(photoId: string) {
  const { supabase } = await requireAdmin();
  const { data: photo } = await supabase.from("photos").select("id, storage_path").eq("id", photoId).maybeSingle();
  if (!photo) redirect("/media");

  const { error } = await supabase.from("photos").delete().eq("id", photo.id);
  if (error) throw new Error(error.message);
  if (photo.storage_path) await supabase.storage.from("city-photos").remove([photo.storage_path]);

  revalidatePath("/media");
  redirect("/media");
}

// CREATE a caption by hand.
export async function addCaption(photoId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireAdmin();
  const body = text(formData, "body", 200);
  if (!body) return { error: "Write a caption first." };
  const { error } = await supabase
    .from("captions")
    .insert({ photo_id: photoId, user_id: user.id, body, prompt: "Written by a superadmin in the admin area.", model: MANUAL_MODEL });
  if (error) return { error: error.message };
  revalidatePath(`/media/${photoId}`);
  return { success: "Caption added." };
}

// CREATE captions with Gemini, avoiding ones the photo already has.
export async function generateForPhoto(photoId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireAdmin();
  const count = Math.min(6, Math.max(1, Number(formData.get("count")) || 3));

  const { data: photo } = await supabase
    .from("photos")
    .select("id, image_url, neighborhood, note, captions (body)")
    .eq("id", photoId)
    .maybeSingle();
  if (!photo) return { error: "Photo not found." };

  const image = await fetch(photo.image_url);
  if (!image.ok) return { error: "Couldn't load the photo." };
  const bytes = Buffer.from(await image.arrayBuffer());

  let result;
  try {
    result = await generateCaptions({
      imageBase64: bytes.toString("base64"),
      mimeType: image.headers.get("content-type") ?? "image/jpeg",
      neighborhood: photo.neighborhood,
      note: photo.note,
      count,
      avoid: photo.captions.map((c) => c.body),
    });
  } catch (error) {
    return { error: (error as Error).message };
  }

  const { error } = await supabase
    .from("captions")
    .insert(result.captions.map((body) => ({ photo_id: photo.id, user_id: user.id, body, prompt: result.prompt, model: result.model })));
  if (error) return { error: error.message };
  revalidatePath(`/media/${photoId}`);
  return { success: `Gemini wrote ${result.captions.length} new caption${result.captions.length === 1 ? "" : "s"}.` };
}

// UPDATE a caption's text (and optionally its model label).
export async function updateCaption(captionId: string, photoId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const body = text(formData, "body", 200);
  if (!body) return { error: "Captions can't be empty." };
  const model = text(formData, "model", 80);
  const { error } = await supabase
    .from("captions")
    .update(model ? { body, model } : { body })
    .eq("id", captionId);
  if (error) return { error: error.message };
  revalidatePath(`/media/${photoId}`);
  return { success: "Saved." };
}

// DELETE a caption (and its votes, by cascade).
export async function deleteCaption(captionId: string, photoId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("captions").delete().eq("id", captionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/media/${photoId}`);
  revalidatePath("/media");
}
