import Link from "next/link";
import ActionForm, { SubmitButton } from "@/components/ActionForm";
import { cardClass, eyebrowClass, inputClass, labelClass } from "@/components/styles";
import { requireAdmin } from "@/lib/admin";
import { NEIGHBORHOODS } from "@/lib/neighborhoods";
import { createPhoto } from "../actions";

export default async function NewPhotoPage() {
  await requireAdmin();
  return (
    <div className="max-w-xl space-y-6">
      <Link href="/media" className="font-mono text-sm underline underline-offset-4">← All media</Link>
      <header>
        <p className={eyebrowClass}>Create</p>
        <h1 className="mt-1 font-display text-5xl uppercase leading-none">New photo</h1>
        <p className="mt-2 font-mono text-sm text-muted">Upload a photo and Gemini writes its captions, exactly like the main app.</p>
      </header>
      <ActionForm action={createPhoto} className={`${cardClass} space-y-4 p-5`}>
        <label className="block space-y-1">
          <span className={labelClass}>Photo (JPG, PNG, WebP · 4 MB max)</span>
          <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required className={inputClass} />
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>Neighborhood</span>
          <select name="neighborhood" className={inputClass} defaultValue="">
            <option value="">—</option>
            {NEIGHBORHOODS.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>Note for the AI (optional)</span>
          <input name="note" maxLength={140} className={inputClass} placeholder="Pigeon stole my bagel" />
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>AI captions to generate</span>
          <select name="count" defaultValue="4" className={inputClass}>
            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n === 0 ? "None (add captions later)" : n}</option>
            ))}
          </select>
        </label>
        <SubmitButton pendingLabel="Gemini is writing…">Upload & caption</SubmitButton>
      </ActionForm>
    </div>
  );
}
