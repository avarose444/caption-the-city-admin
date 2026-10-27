// Field definitions for the admin's generic create/read/update/delete pages.
// The server actions only ever write tables and columns listed here.

export type Field = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean" | "select";
  required?: boolean;
  placeholder?: string;
  lowercase?: boolean;
  min?: number;
  max?: number;
  step?: number;
  // For selects: rows of another table to choose from.
  optionsFrom?: { table: string; label: string; value: string };
  hint?: string;
};

export type CrudConfig = {
  table: string;
  path: string;
  title: string;
  kicker: string;
  description: string;
  singular: string;
  fields: Field[];
  // Fields shown as the row's headline and sub-line when collapsed.
  headline: string;
  subline?: string[];
  orderBy: { column: string; ascending: boolean };
};

export const CRUD_CONFIGS = {
  llm_providers: {
    table: "llm_providers",
    path: "/providers",
    title: "LLM providers",
    kicker: "AI pipeline",
    description: "Companies whose models write captions. The API key itself stays in a server env var; only its name lives here.",
    singular: "provider",
    headline: "name",
    subline: ["base_url", "api_key_env"],
    orderBy: { column: "name", ascending: true },
    fields: [
      { name: "name", label: "Name", type: "text", required: true, placeholder: "Google Gemini" },
      { name: "base_url", label: "API base URL", type: "text", placeholder: "https://generativelanguage.googleapis.com/v1beta/models" },
      { name: "api_key_env", label: "API key env var", type: "text", placeholder: "GEMINI_API_KEY" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  llm_models: {
    table: "llm_models",
    path: "/models",
    title: "LLM models",
    kicker: "AI pipeline",
    description: "Active models are tried in priority order (lowest first); if one is overloaded, the next takes over.",
    singular: "model",
    headline: "name",
    subline: ["api_model_id", "priority", "temperature", "is_active"],
    orderBy: { column: "priority", ascending: true },
    fields: [
      { name: "name", label: "Display name", type: "text", required: true, placeholder: "Gemini Flash" },
      { name: "api_model_id", label: "API model ID", type: "text", required: true, placeholder: "gemini-flash-latest" },
      { name: "provider_id", label: "Provider", type: "select", required: true, optionsFrom: { table: "llm_providers", label: "name", value: "id" } },
      { name: "priority", label: "Priority", type: "number", min: 0, max: 100, step: 1, required: true, hint: "Lower is tried first" },
      { name: "temperature", label: "Temperature", type: "number", min: 0, max: 2, step: 0.05, required: true },
      { name: "is_active", label: "Active", type: "boolean" },
    ],
  },
  terms: {
    table: "terms",
    path: "/terms",
    title: "Terms",
    kicker: "Content",
    description: "Local vocabulary fed to the model through the {{terms}} placeholder, so captions sound like New York.",
    singular: "term",
    headline: "term",
    subline: ["definition", "is_active"],
    orderBy: { column: "term", ascending: true },
    fields: [
      { name: "term", label: "Term", type: "text", required: true, placeholder: "Bodega cat" },
      { name: "definition", label: "Definition", type: "textarea", required: true },
      { name: "example", label: "Example line", type: "text" },
      { name: "is_active", label: "Use in prompts", type: "boolean" },
    ],
  },
  generation_examples: {
    table: "generation_examples",
    path: "/examples",
    title: "AI generation examples",
    kicker: "AI pipeline",
    description: "Few-shot examples fed through the {{examples}} placeholder: a scene and a caption the crowd loved.",
    singular: "example",
    headline: "caption",
    subline: ["scene", "is_active"],
    orderBy: { column: "created_at", ascending: false },
    fields: [
      { name: "scene", label: "Scene", type: "textarea", required: true, placeholder: "A rainy subway platform…" },
      { name: "caption", label: "Caption", type: "text", required: true },
      { name: "notes", label: "Why it works", type: "text" },
      { name: "is_active", label: "Use in prompts", type: "boolean" },
    ],
  },
  allowed_signup_domains: {
    table: "allowed_signup_domains",
    path: "/signup-domains",
    title: "Allowed signup domains",
    kicker: "Access",
    description: "Email domains allowed to sign up, e.g. columbia.edu.",
    singular: "domain",
    headline: "domain",
    orderBy: { column: "domain", ascending: true },
    fields: [{ name: "domain", label: "Domain", type: "text", required: true, lowercase: true, placeholder: "columbia.edu" }],
  },
  whitelist_email_addresses: {
    table: "whitelist_email_addresses",
    path: "/whitelist",
    title: "Whitelisted emails",
    kicker: "Access",
    description: "Individual addresses allowed in even when their domain isn't on the list.",
    singular: "email",
    headline: "email",
    subline: ["note"],
    orderBy: { column: "email", ascending: true },
    fields: [
      { name: "email", label: "Email", type: "text", required: true, lowercase: true, placeholder: "friend@gmail.com" },
      { name: "note", label: "Note", type: "text", placeholder: "Guest judge" },
    ],
  },
} satisfies Record<string, CrudConfig>;

export type CrudKey = keyof typeof CRUD_CONFIGS;
