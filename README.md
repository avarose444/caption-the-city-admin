# La Salle de Montage: Caption the City admin

The superadmin area for [Caption the City](https://github.com/avarose444/helloworld), where New York photos get AI (Gemini) captions that everyone votes on. Built with Next.js 16 and Supabase, deployed on Vercel.

## What's here

| Route | What it does | Access |
|---|---|---|
| `/` | **Le Tableau**: statistics dashboard (crowd favorite, most divisive caption, the flop, votes per day, a weekday × hour "when does the city laugh?" heatmap, whether Gemini's first caption beats its later ones, caption length vs score, neighborhoods, a model scoreboard, voter personalities, top posters, members' favorite films) | read |
| `/users`, `/users/[id]` | Users & profiles, with each member's photos, votes cast, and net score | **read** |
| `/media`, `/media/new`, `/media/[id]` | Photos and their AI-generated captions: upload a photo and have Gemini caption it, generate more captions, write one by hand, edit caption text/model, edit photo details, delete captions or whole photos | **create / read / update / delete** |
| `/votes` | Every upvote and downvote, filterable, plus the most-rated captions | **read** |

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

1. Run `supabase/admin.sql` in the Supabase SQL editor (after the main app's `profiles.sql` and `captions.sql`), with your email in the last line.
2. Env vars (`.env.local` locally, and in Vercel): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`.
3. Supabase → Authentication → URL Configuration: add the admin's URLs to **Redirect URLs**, e.g. `https://*-<your-team>.vercel.app/**` and `http://localhost:3000/**`.
4. `npm install && npm run dev`.
