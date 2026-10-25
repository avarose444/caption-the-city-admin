import Link from "next/link";
import { notFound } from "next/navigation";
import ActionForm, { SubmitButton } from "@/components/ActionForm";
import ConfirmButton from "@/components/ConfirmButton";
import { cardClass, eyebrowClass, ghostButtonClass, inputClass, labelClass } from "@/components/styles";
import { displayName, formatDate, requireAdmin } from "@/lib/admin";
import { CAPTION_FIELDS, PHOTO_FIELDS, type CaptionRow, type PhotoRow } from "@/lib/data";
import { NEIGHBORHOODS } from "@/lib/neighborhoods";
import { addCaption, deleteCaption, deletePhoto, generateForPhoto, updateCaption, updatePhoto } from "../actions";

export const dynamic = "force-dynamic";

export default async function PhotoPage({ params }: PageProps<"/media/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data } = await supabase.from("photos").select(`${PHOTO_FIELDS}, captions (${CAPTION_FIELDS})`).eq("id", id).maybeSingle();
  if (!data) notFound();
  const photo = data as unknown as PhotoRow & { captions: CaptionRow[] };
  const captions = [...photo.captions].sort((a, b) => b.score - a.score || a.created_at.localeCompare(b.created_at));
  const { data: poster } = await supabase.from("profiles").select("email, first_name, last_name").eq("id", photo.user_id).maybeSingle();

  return (
    <div className="space-y-6">
      <Link href="/media" className="font-mono text-sm underline underline-offset-4">← All media</Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="relative overflow-hidden border-2 border-black bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.image_url} alt={photo.note ?? ""} className="max-h-[70vh] w-full object-contain" />
            {captions[0] && (
              <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-10 text-center font-mono text-base font-bold text-[#fff6c8]">
                {captions[0].body}
              </p>
            )}
          </div>
          <p className="font-mono text-xs text-muted">
            Posted by{" "}
            <Link href={`/users/${photo.user_id}`} className="underline underline-offset-4">{displayName(poster)}</Link>{" "}
            · {formatDate(photo.created_at)} · <span className="break-all">{photo.storage_path}</span>
          </p>

          <section className={`${cardClass} p-5`}>
            <p className={eyebrowClass}>Update photo</p>
            <ActionForm action={updatePhoto.bind(null, photo.id)} className="mt-3 space-y-3">
              <label className="block space-y-1">
                <span className={labelClass}>Neighborhood</span>
                <select name="neighborhood" defaultValue={photo.neighborhood ?? ""} className={inputClass}>
                  <option value="">—</option>
                  {NEIGHBORHOODS.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className={labelClass}>Note</span>
                <input name="note" defaultValue={photo.note ?? ""} maxLength={140} className={inputClass} />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SubmitButton pendingLabel="Saving…">Save photo</SubmitButton>
                <ConfirmButton
                  action={deletePhoto.bind(null, photo.id)}
                  label="Delete photo"
                  message={`Delete this photo, its ${captions.length} captions, and all their votes? This can't be undone.`}
                />
              </div>
            </ActionForm>
          </section>
        </div>

        <div className="space-y-4">
          <header>
            <p className={eyebrowClass}>{captions.length} captions · sorted by net score</p>
            <h1 className="font-display text-4xl uppercase leading-none">{photo.neighborhood ?? "Unlabeled"}</h1>
          </header>

          <section className={`${cardClass} grid gap-4 p-5 sm:grid-cols-2`}>
            <ActionForm action={generateForPhoto.bind(null, photo.id)} className="space-y-2">
              <span className={labelClass}>Ask Gemini for more</span>
              <div className="flex gap-2">
                <select name="count" defaultValue="3" className={`${inputClass} w-20`}>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
                <SubmitButton pendingLabel="Writing…">Generate</SubmitButton>
              </div>
            </ActionForm>
            <ActionForm action={addCaption.bind(null, photo.id)} className="space-y-2">
              <span className={labelClass}>Or write one</span>
              <div className="flex gap-2">
                <input name="body" maxLength={200} required placeholder="Caption…" className={inputClass} />
                <SubmitButton pendingLabel="…" className={ghostButtonClass}>Add</SubmitButton>
              </div>
            </ActionForm>
          </section>

          <ul className="space-y-3">
            {captions.map((c) => (
              <li key={c.id} id={`caption-${c.id}`} className={`${cardClass} scroll-mt-6 p-4 target:border-bleu target:shadow-[4px_4px_0_0_var(--bleu)]`}>
                <ActionForm action={updateCaption.bind(null, c.id, photo.id)} className="space-y-2">
                  <textarea name="body" defaultValue={c.body} maxLength={200} rows={2} required className={`${inputClass} resize-y`} />
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted">
                    <span className={c.score > 0 ? "font-bold text-bleu" : c.score < 0 ? "font-bold text-rouge" : "font-bold"}>
                      net {c.score > 0 ? "+" : ""}
                      {c.score}
                    </span>
                    <span>▲ {c.upvotes} · ▼ {c.downvotes}</span>
                    <label className="flex items-center gap-1">
                      model
                      <input name="model" defaultValue={c.model} maxLength={80} className="w-44 border-b border-muted bg-transparent px-1 outline-none focus:border-bleu" />
                    </label>
                    <span>{formatDate(c.created_at)}</span>
                  </div>
                  <details className="font-mono text-xs text-muted">
                    <summary className="cursor-pointer">Prompt sent to the model</summary>
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap bg-white p-2">{c.prompt}</pre>
                  </details>
                  <div className="flex flex-wrap gap-2">
                    <SubmitButton pendingLabel="Saving…" className={ghostButtonClass}>Save</SubmitButton>
                    <ConfirmButton
                      action={deleteCaption.bind(null, c.id, photo.id)}
                      label="Delete"
                      message={`Delete “${c.body}” and its ${c.upvotes + c.downvotes} votes?`}
                    />
                  </div>
                </ActionForm>
              </li>
            ))}
            {captions.length === 0 && <li className="font-mono text-sm text-muted">No captions yet. Generate some above.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
