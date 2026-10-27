"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { CRUD_CONFIGS, type CrudConfig, type CrudKey } from "@/lib/crud";

type State = { error?: string; success?: string };

function configFor(key: string): CrudConfig {
  if (!(key in CRUD_CONFIGS)) throw new Error("Unknown table.");
  return CRUD_CONFIGS[key as CrudKey];
}

// Builds the row from only the configured fields, typed and validated.
function rowFrom(config: CrudConfig, formData: FormData): { row?: Record<string, unknown>; error?: string } {
  const row: Record<string, unknown> = {};
  for (const field of config.fields) {
    const raw = formData.get(field.name);
    if (field.type === "boolean") {
      row[field.name] = raw === "on";
      continue;
    }
    let value = typeof raw === "string" ? raw.trim() : "";
    if (field.lowercase) value = value.toLowerCase();
    if (!value) {
      if (field.required) return { error: `${field.label} is required.` };
      row[field.name] = null;
      continue;
    }
    if (field.type === "number") {
      const n = Number(value);
      if (!Number.isFinite(n)) return { error: `${field.label} must be a number.` };
      if ((field.min !== undefined && n < field.min) || (field.max !== undefined && n > field.max)) {
        return { error: `${field.label} must be between ${field.min} and ${field.max}.` };
      }
      row[field.name] = n;
    } else {
      row[field.name] = value.slice(0, field.type === "textarea" ? 4000 : 300);
    }
  }
  return { row };
}

function friendly(message: string, config: CrudConfig) {
  if (message.includes("duplicate key")) return `That ${config.singular} already exists.`;
  if (message.includes("violates check constraint")) return `That ${config.singular} isn't valid. Check the format.`;
  if (message.includes("violates foreign key")) return `Other records still use this ${config.singular}. Change or remove those first.`;
  return message;
}

export async function createRow(key: string, _prev: State, formData: FormData): Promise<State> {
  const { supabase } = await requireAdmin();
  const config = configFor(key);
  const { row, error } = rowFrom(config, formData);
  if (error || !row) return { error: error ?? "Invalid form." };
  const { error: dbError } = await supabase.from(config.table).insert(row);
  if (dbError) return { error: friendly(dbError.message, config) };
  revalidatePath(config.path);
  return { success: `Added ${config.singular}.` };
}

export async function updateRow(key: string, id: string, _prev: State, formData: FormData): Promise<State> {
  const { supabase } = await requireAdmin();
  const config = configFor(key);
  const { row, error } = rowFrom(config, formData);
  if (error || !row) return { error: error ?? "Invalid form." };
  const { error: dbError } = await supabase.from(config.table).update(row).eq("id", id);
  if (dbError) return { error: friendly(dbError.message, config) };
  revalidatePath(config.path);
  return { success: "Saved." };
}

export async function deleteRow(key: string, id: string): Promise<State> {
  const { supabase } = await requireAdmin();
  const config = configFor(key);
  const { error } = await supabase.from(config.table).delete().eq("id", id);
  if (error) return { error: friendly(error.message, config) };
  revalidatePath(config.path);
  return {};
}
