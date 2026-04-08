-- ============================================================
-- Image Studio: Initial Schema
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. profiles (extends auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  daily_quota integer not null default 10,
  monthly_quota integer not null default 200,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own display info"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Prevent users from escalating role or modifying their own quotas
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
as $$
begin
  if new.role <> old.role then
    raise exception 'Cannot modify role';
  end if;
  if new.daily_quota <> old.daily_quota then
    raise exception 'Cannot modify daily_quota';
  end if;
  if new.monthly_quota <> old.monthly_quota then
    raise exception 'Cannot modify monthly_quota';
  end if;
  return new;
end;
$$;

create trigger protect_profile_fields_trigger
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ============================================================
-- 2. images
-- ============================================================
create table public.images (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('generate', 'edit')),
  prompt text not null,
  aspect_ratio text,
  quality text,
  storage_path text,
  public_url text,
  size_bytes bigint,
  width integer,
  height integer,
  source_images text[],
  created_at timestamptz not null default now()
);

alter table public.images enable row level security;

create policy "Users can view own images"
  on public.images for select
  using (auth.uid() = user_id);

create policy "Users can insert own images"
  on public.images for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own images"
  on public.images for delete
  using (auth.uid() = user_id);

-- Index for fast user-scoped queries
create index idx_images_user_id on public.images(user_id);
create index idx_images_created_at on public.images(created_at desc);

-- ============================================================
-- 3. usage_logs
-- ============================================================
create table public.usage_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null check (action in ('generate', 'edit')),
  created_at timestamptz not null default now()
);

alter table public.usage_logs enable row level security;

create policy "Users can view own usage logs"
  on public.usage_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own usage logs"
  on public.usage_logs for insert
  with check (auth.uid() = user_id);

-- Index for quota lookups
create index idx_usage_logs_user_id on public.usage_logs(user_id);
create index idx_usage_logs_created_at on public.usage_logs(created_at desc);

-- ============================================================
-- 4. Auto-create profile on user signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
