import ActionForm, { SubmitButton } from "@/components/ActionForm";
import ConfirmButton from "@/components/ConfirmButton";
import { cardClass, eyebrowClass, ghostButtonClass, inputClass, labelClass } from "@/components/styles";
import { createRow, deleteRow, updateRow } from "@/app/(admin)/crud-actions";
import { formatDate, requireAdmin } from "@/lib/admin";
import { CRUD_CONFIGS, type CrudKey, type Field } from "@/lib/crud";

type Row = Record<string, unknown> & { id: string; created_at?: string };
type Options = Record<string, { value: string; label: string }[]>;

// A full create/read/update/delete page for one table in lib/crud.ts.
export default async function CrudPage({ tableKey }: { tableKey: CrudKey }) {
  const { supabase } = await requireAdmin();
  const config = CRUD_CONFIGS[tableKey];

  const { data, error } = await supabase
    .from(config.table)
    .select("*")
    .order(config.orderBy.column, { ascending: config.orderBy.ascending });
  const rows = (data ?? []) as Row[];

  const options: Options = {};
  for (const field of config.fields as Field[]) {
    if (!field.optionsFrom) continue;
    const { table, label, value } = field.optionsFrom;
    const { data: opts } = await supabase.from(table).select(`${value}, ${label}`).order(label);
    options[field.name] = ((opts ?? []) as unknown as Record<string, string>[]).map((o) => ({ value: o[value], label: o[label] }));
  }
  const optionLabel = (field: string, value: unknown) => options[field]?.find((o) => o.value === value)?.label;

  return (
    <div className="space-y-6">
      <header>
        <p className={eyebrowClass}>{config.kicker} · create, read, update, delete</p>
        <h1 className="mt-1 font-display text-5xl uppercase leading-none">{config.title}</h1>
        <p className="mt-2 max-w-2xl font-mono text-sm text-muted">{config.description}</p>
      </header>

      {error && (
        <p className="border-l-4 border-rouge bg-white p-3 font-mono text-sm">
          Couldn&apos;t load {config.table}: {error.message}. Has <code>supabase/observability.sql</code> been run?
        </p>
      )}

      <details className={`${cardClass} p-5`} open={rows.length === 0}>
        <summary className="cursor-pointer font-display text-xl uppercase">+ New {config.singular}</summary>
        <ActionForm action={createRow.bind(null, tableKey)} className="mt-4 space-y-3">
          <Fields fields={config.fields as Field[]} options={options} />
          <SubmitButton pendingLabel="Adding…">Add {config.singular}</SubmitButton>
        </ActionForm>
      </details>

      <p className="font-mono text-xs text-muted">
        {rows.length} {config.singular}
        {rows.length === 1 ? "" : "s"}
      </p>
      <ul className="space-y-3">
        {rows.map((row) => {
          const sub = (config as { subline?: string[] }).subline ?? [];
          return (
            <li key={row.id} className={`${cardClass} p-4`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{String(row[config.headline] ?? "—")}</p>
                  {sub.length > 0 && (
                    <p className="mt-1 font-mono text-xs text-muted">
                      {sub
                        .map((name) => {
                          const field = (config.fields as Field[]).find((f) => f.name === name);
                          const value = row[name];
                          if (value === null || value === undefined || value === "") return null;
                          if (field?.type === "boolean") return value ? field.label : `not ${field.label.toLowerCase()}`;
                          return `${field && field.type !== "textarea" ? `${field.label}: ` : ""}${optionLabel(name, value) ?? String(value)}`;
                        })
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  {row.created_at && <p className="mt-1 font-mono text-[11px] text-muted">Added {formatDate(row.created_at)}</p>}
                </div>
                <ConfirmButton
                  action={deleteRow.bind(null, tableKey, row.id)}
                  label="Delete"
                  message={`Delete this ${config.singular}: “${String(row[config.headline])}”?`}
                />
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer font-mono text-xs underline underline-offset-4">Edit</summary>
                <ActionForm action={updateRow.bind(null, tableKey, row.id)} className="mt-3 space-y-3">
                  <Fields fields={config.fields as Field[]} options={options} row={row} />
                  <SubmitButton pendingLabel="Saving…" className={ghostButtonClass}>Save</SubmitButton>
                </ActionForm>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Fields({ fields, options, row }: { fields: Field[]; options: Options; row?: Row }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {fields.map((field) => {
        const value = row?.[field.name];
        const id = `${row?.id ?? "new"}-${field.name}`;
        if (field.type === "boolean") {
          return (
            <label key={field.name} htmlFor={id} className="flex items-center gap-2 self-end font-mono text-sm">
              <input id={id} type="checkbox" name={field.name} defaultChecked={row ? Boolean(value) : true} className="h-4 w-4 accent-black" />
              {field.label}
            </label>
          );
        }
        return (
          <label key={field.name} htmlFor={id} className={`block space-y-1 ${field.type === "textarea" ? "md:col-span-2" : ""}`}>
            <span className={labelClass}>
              {field.label}
              {field.required && " *"}
              {field.hint && <span className="ml-2 font-normal normal-case tracking-normal text-muted">{field.hint}</span>}
            </span>
            {field.type === "textarea" ? (
              <textarea id={id} name={field.name} defaultValue={(value as string) ?? ""} rows={3} required={field.required} placeholder={field.placeholder} className={`${inputClass} resize-y`} />
            ) : field.type === "select" ? (
              <select id={id} name={field.name} defaultValue={(value as string) ?? ""} required={field.required} className={inputClass}>
                <option value="">—</option>
                {(options[field.name] ?? []).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : (
              <input
                id={id}
                name={field.name}
                type={field.type === "number" ? "number" : "text"}
                defaultValue={value === null || value === undefined ? "" : String(value)}
                required={field.required}
                placeholder={field.placeholder}
                min={field.min}
                max={field.max}
                step={field.step}
                className={inputClass}
              />
            )}
          </label>
        );
      })}
    </div>
  );
}
