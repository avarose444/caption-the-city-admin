# La Salle de Montage: Caption the City admin

The superadmin area for [Caption the City](https://github.com/avarose444/helloworld), where New York photos get AI (Gemini) captions that everyone votes on. Built with Next.js 16 and Supabase, deployed on Vercel.

## What's here

| Area | Route | Access |
|---|---|---|
| Statistics dashboard | `/` | read |
| Users / profiles | `/users`, `/users/[id]` | read |
| Allowed signup domains | `/signup-domains` | create / read / update / delete |
| Whitelisted e-mail addresses | `/whitelist` | create / read / update / delete |
| Images (with upload) and AI-generated captions | `/media`, `/media/new`, `/media/[id]` | create / read / update / delete |
| Upvotes / downvotes / ratings | `/votes` | read |
| Terms | `/terms` | create / read / update / delete |
| Prompt chains and their steps | `/chains`, `/chains/[id]` | read |
| Prompt chain mix | `/mix` | read / update |
| AI generation examples | `/examples` | create / read / update / delete |
| LLM models | `/models` | create / read / update / delete |
| LLM providers | `/providers` | create / read / update / delete |
| Generation requests (with each request's model calls) | `/requests`, `/requests/[id]` | read |
| LLM responses, with per-model health | `/responses` | read |

### The AI pipeline is data

`lib/pipeline.ts` (the same file lives in Caption the City) generates captions from the database. It picks a prompt chain by the `prompt_chain_mix` weights, runs that chain's steps in order (each step's output becomes `{{previous}}` in the next), fills `{{terms}}` and `{{examples}}` from their tables, and tries active models in priority order when one is overloaded. Every request goes to `generation_requests` and every model call (prompt, response, HTTP status, latency) to `llm_responses`, which is what the Observability pages read. If the tables are missing, it falls back to the original built-in prompt.

## Security: three locks

1. **`proxy.ts`** runs on every route except `/login` and the auth callback. No Google session → `/login`. Signed in but `profiles.is_superadmin` isn't `true` → `/login?error=forbidden`.
2. **`requireAdmin()`** (`lib/admin.ts`) re-checks the flag in the layout, every page, and every server action.
3. **Row Level Security** (`supabase/admin.sql`): the admin-wide policies only pass when `public.is_superadmin()` is true, and a trigger stops anyone from setting their own `is_superadmin` through the API.

## Not locking yourself out

The flag that guards the admin area can't be set from the admin area, or from the app: the trigger in `admin.sql` ignores any `is_superadmin` change made by the `anon` or `authenticated` roles. It can only be set by the database owner. So the first superadmin is created out of band: sign in to the main app once with Google (which creates your `profiles` row), then in the **Supabase dashboard → SQL editor** (which runs as the `postgres` owner and bypasses RLS and that trigger) run:

```sql
update public.profiles set is_superadmin = true where email = 'you@example.com';
```

After that, other admins can be promoted the same way.

## Setup

1. Run `supabase/admin.sql` in the Supabase SQL editor (after the main app's `profiles.sql` and `captions.sql`), with your email in the last line, then `supabase/observability.sql` (creates and seeds the pipeline tables and backfills a request log for existing photos).
2. Env vars (`.env.local` locally, and in Vercel): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`.
3. Supabase → Authentication → URL Configuration: add the admin's URLs to **Redirect URLs**, e.g. `https://*-<your-team>.vercel.app/**` and `http://localhost:3000/**`.
4. `npm install && npm run dev`.
