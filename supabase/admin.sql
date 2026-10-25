-- Admin area for Caption the City.
-- Run in the Supabase SQL editor after the main app's profiles.sql and
-- captions.sql. Safe to run more than once.

-- 1. The superadmin flag. Everyone starts as false.
alter table public.profiles
  add column if not exists is_superadmin boolean not null default false;

-- 2. Nobody can promote themselves. The main app lets users upsert their own
--    profile row, so without this a user could send is_superadmin = true.
--    Only the database owner (the SQL editor, or the service role) can change it.
create or replace function public.protect_superadmin_flag()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.is_superadmin := false;
    else
      new.is_superadmin := old.is_superadmin;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_superadmin_flag on public.profiles;
create trigger protect_superadmin_flag
  before insert or update on public.profiles
  for each row execute function public.protect_superadmin_flag();

-- 3. Helper used by every admin policy. security definer so it can read
--    profiles without tripping the profiles policies (no recursion).
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select is_superadmin from public.profiles where id = (select auth.uid())),
    false
  );
$$;

revoke execute on function public.is_superadmin() from public, anon;
grant execute on function public.is_superadmin() to authenticated;

-- 4. Admin policies. These sit alongside the main app's policies; Postgres
--    allows a row if any policy allows it.

-- profiles: READ only.
drop policy if exists "Superadmins can view all profiles" on public.profiles;
create policy "Superadmins can view all profiles" on public.profiles
  for select to authenticated using ((select public.is_superadmin()));

-- caption_votes: READ only.
drop policy if exists "Superadmins can view all votes" on public.caption_votes;
create policy "Superadmins can view all votes" on public.caption_votes
  for select to authenticated using ((select public.is_superadmin()));

-- photos: full CRUD.
drop policy if exists "Superadmins can add photos" on public.photos;
create policy "Superadmins can add photos" on public.photos
  for insert to authenticated with check ((select public.is_superadmin()));
drop policy if exists "Superadmins can edit photos" on public.photos;
create policy "Superadmins can edit photos" on public.photos
  for update to authenticated
  using ((select public.is_superadmin())) with check ((select public.is_superadmin()));
drop policy if exists "Superadmins can delete photos" on public.photos;
create policy "Superadmins can delete photos" on public.photos
  for delete to authenticated using ((select public.is_superadmin()));

-- captions (the AI-generated media): full CRUD. The main app only grants
-- insert on a few columns, so also grant update on the editable ones; the
-- policy still limits updates to superadmins. Vote counts stay untouchable.
drop policy if exists "Superadmins can add captions" on public.captions;
create policy "Superadmins can add captions" on public.captions
  for insert to authenticated with check ((select public.is_superadmin()));
drop policy if exists "Superadmins can edit captions" on public.captions;
create policy "Superadmins can edit captions" on public.captions
  for update to authenticated
  using ((select public.is_superadmin())) with check ((select public.is_superadmin()));
drop policy if exists "Superadmins can delete captions" on public.captions;
create policy "Superadmins can delete captions" on public.captions
  for delete to authenticated using ((select public.is_superadmin()));
grant update (body, prompt, model) on public.captions to authenticated;
grant update (neighborhood, note) on public.photos to authenticated;

-- Storage: superadmins can remove any city photo file (when deleting a photo).
drop policy if exists "Superadmins can delete city photos" on storage.objects;
create policy "Superadmins can delete city photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'city-photos' and (select public.is_superadmin()));

-- 5. Let yourself in. Change the email to your Google account, then run.
--    This works because the SQL editor runs as the database owner, which
--    bypasses RLS and the trigger above.
update public.profiles set is_superadmin = true where email = 'you@example.com';
