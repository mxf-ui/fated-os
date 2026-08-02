-- Supabase schema for Fated OS cloud persistence.
-- Run this once in Supabase SQL Editor.

create table if not exists public.fated_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  encryption_salt text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fated_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  schema_version integer not null default 2,
  client_updated_at bigint not null default 0,
  updated_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

create table if not exists public.fated_invite_codes (
  code text primary key,
  active boolean not null default true,
  max_uses integer,
  used_count integer not null default 0,
  used_by uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fated_profiles enable row level security;
alter table public.fated_snapshots enable row level security;
alter table public.fated_invite_codes enable row level security;

drop policy if exists "fated profiles own select" on public.fated_profiles;
create policy "fated profiles own select" on public.fated_profiles
  for select using (auth.uid() = id);

drop policy if exists "fated profiles own insert" on public.fated_profiles;
create policy "fated profiles own insert" on public.fated_profiles
  for insert with check (auth.uid() = id);

drop policy if exists "fated profiles own update" on public.fated_profiles;
create policy "fated profiles own update" on public.fated_profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "fated snapshots own select" on public.fated_snapshots;
create policy "fated snapshots own select" on public.fated_snapshots
  for select using (auth.uid() = user_id);

drop policy if exists "fated snapshots own insert" on public.fated_snapshots;
create policy "fated snapshots own insert" on public.fated_snapshots
  for insert with check (auth.uid() = user_id);

drop policy if exists "fated snapshots own update" on public.fated_snapshots;
create policy "fated snapshots own update" on public.fated_snapshots
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.redeem_fated_invite(code_input text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data public.fated_invite_codes%rowtype;
  clean_code text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  clean_code := lower(trim(code_input));
  if clean_code = '' then
    raise exception 'invite_required';
  end if;

  select * into row_data
  from public.fated_invite_codes
  where lower(code) = clean_code and active = true
  for update;

  if not found then
    raise exception 'invite_invalid';
  end if;

  if auth.uid() = any(row_data.used_by) then
    return true;
  end if;

  if row_data.max_uses is not null and row_data.used_count >= row_data.max_uses then
    raise exception 'invite_exhausted';
  end if;

  update public.fated_invite_codes
  set used_count = used_count + 1,
      used_by = array_append(used_by, auth.uid()),
      updated_at = now()
  where code = row_data.code;

  return true;
end;
$$;

grant execute on function public.redeem_fated_invite(text) to authenticated;

insert into public.fated_invite_codes (code, active, max_uses)
values ('123456', true, null)
on conflict (code) do update set active = excluded.active, max_uses = excluded.max_uses;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fated-assets',
  'fated-assets',
  true,
  52428800,
  array['image/jpeg','image/png','image/webp','image/gif','audio/mpeg','audio/wav','audio/ogg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "fated assets public read" on storage.objects;
create policy "fated assets public read" on storage.objects
  for select using (bucket_id = 'fated-assets');

drop policy if exists "fated assets own insert" on storage.objects;
create policy "fated assets own insert" on storage.objects
  for insert with check (
    bucket_id = 'fated-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "fated assets own update" on storage.objects;
create policy "fated assets own update" on storage.objects
  for update using (
    bucket_id = 'fated-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id = 'fated-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
