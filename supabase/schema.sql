-- Our Footprint Map: private two-person data model.
-- Run the entire file in the Supabase SQL editor before creating the two accounts.

create extension if not exists pgcrypto;

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  name text not null default '我们的足迹地图',
  anniversary date,
  created_at timestamptz not null default now()
);

create table if not exists public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid references auth.users(id),
  title text not null,
  city text not null,
  subtitle text not null,
  story text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  date_label text not null,
  date_start date,
  date_end date,
  sort_date date not null,
  legacy_slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (couple_id, legacy_slug)
);

create table if not exists public.memory_photos (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  storage_path text not null unique,
  sort_order integer not null default 0 check (sort_order >= 0),
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists memories_couple_sort_idx on public.memories(couple_id, sort_date);
create index if not exists memory_photos_memory_sort_idx on public.memory_photos(memory_id, sort_order);
create index if not exists couple_members_user_idx on public.couple_members(user_id);

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_couple_member(target_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.couple_members
    where couple_id = target_couple_id
      and user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_couple_member(uuid) from public;
revoke all on function private.is_couple_member(uuid) from anon;
grant execute on function private.is_couple_member(uuid) to authenticated;

alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.memories enable row level security;
alter table public.memory_photos enable row level security;

drop policy if exists "members read their couple" on public.couples;
create policy "members read their couple"
on public.couples for select
to authenticated
using (private.is_couple_member(id));

drop policy if exists "members read both profiles" on public.couple_members;
create policy "members read both profiles"
on public.couple_members for select
to authenticated
using (private.is_couple_member(couple_id));

drop policy if exists "members read memories" on public.memories;
create policy "members read memories"
on public.memories for select
to authenticated
using (private.is_couple_member(couple_id));

drop policy if exists "members add memories" on public.memories;
create policy "members add memories"
on public.memories for insert
to authenticated
with check (private.is_couple_member(couple_id) and created_by = (select auth.uid()));

drop policy if exists "members update memories" on public.memories;
create policy "members update memories"
on public.memories for update
to authenticated
using (private.is_couple_member(couple_id))
with check (private.is_couple_member(couple_id));

drop policy if exists "members delete memories" on public.memories;
create policy "members delete memories"
on public.memories for delete
to authenticated
using (private.is_couple_member(couple_id));

drop policy if exists "members read photo records" on public.memory_photos;
create policy "members read photo records"
on public.memory_photos for select
to authenticated
using (private.is_couple_member(couple_id));

drop policy if exists "members add photo records" on public.memory_photos;
create policy "members add photo records"
on public.memory_photos for insert
to authenticated
with check (
  private.is_couple_member(couple_id)
  and exists (
    select 1 from public.memories
    where memories.id = memory_id and memories.couple_id = memory_photos.couple_id
  )
);

drop policy if exists "members update photo records" on public.memory_photos;
create policy "members update photo records"
on public.memory_photos for update
to authenticated
using (private.is_couple_member(couple_id))
with check (private.is_couple_member(couple_id));

drop policy if exists "members delete photo records" on public.memory_photos;
create policy "members delete photo records"
on public.memory_photos for delete
to authenticated
using (private.is_couple_member(couple_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memory-photos',
  'memory-photos',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "members read private photos" on storage.objects;
create policy "members read private photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'memory-photos'
  and private.is_couple_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "members upload private photos" on storage.objects;
create policy "members upload private photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'memory-photos'
  and private.is_couple_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "members update private photos" on storage.objects;
create policy "members update private photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'memory-photos'
  and private.is_couple_member(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'memory-photos'
  and private.is_couple_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "members delete private photos" on storage.objects;
create policy "members delete private photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'memory-photos'
  and private.is_couple_member(((storage.foldername(name))[1])::uuid)
);

create index if not exists memories_created_by_idx on public.memories(created_by);
create index if not exists memory_photos_couple_idx on public.memory_photos(couple_id);

grant usage on schema public to authenticated;
grant select on public.couples, public.couple_members to authenticated;
grant select, insert, update, delete on public.memories, public.memory_photos to authenticated;

create table if not exists public.couple_secrets (
  couple_id uuid primary key references public.couples(id) on delete cascade,
  encryption_key text not null,
  created_at timestamptz not null default now()
);

alter table public.couple_secrets enable row level security;

drop policy if exists "members read couple encryption key" on public.couple_secrets;
create policy "members read couple encryption key"
on public.couple_secrets for select
to authenticated
using (private.is_couple_member(couple_id));

grant select on public.couple_secrets to authenticated;

-- Only invited email addresses are attached to the shared space after signup.
create table if not exists private.allowed_members (
  email text primary key check (email = lower(trim(email))),
  couple_id uuid not null references public.couples(id) on delete cascade,
  display_name text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now()
);

revoke all on private.allowed_members from public, anon, authenticated;

create or replace function private.add_allowed_couple_member()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  allowed private.allowed_members%rowtype;
begin
  select * into allowed
  from private.allowed_members
  where email = lower(trim(new.email));

  if found then
    insert into public.couple_members (couple_id, user_id, display_name, role)
    values (allowed.couple_id, new.id, allowed.display_name, allowed.role)
    on conflict (couple_id, user_id) do update set
      display_name = excluded.display_name,
      role = excluded.role;
  end if;

  return new;
end;
$$;

revoke all on function private.add_allowed_couple_member() from public, anon, authenticated;

drop trigger if exists add_allowed_couple_member_after_signup on auth.users;
create trigger add_allowed_couple_member_after_signup
after insert or update of email on auth.users
for each row execute function private.add_allowed_couple_member();
