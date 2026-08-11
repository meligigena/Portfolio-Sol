create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.portfolio_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.portfolio_clients (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  storage_prefix text not null check (storage_prefix ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) > 0),
  year text not null check (year ~ '^[0-9]{4}$'),
  disciplines text[] not null check (cardinality(disciplines) > 0),
  summary text,
  logo_path text not null check (length(btrim(logo_path)) > 0),
  sort_order integer not null check (sort_order >= 0),
  published boolean not null default false,
  coming_soon boolean not null default false,
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sort_order)
);

create table public.portfolio_editions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.portfolio_clients(id) on delete cascade,
  edition_key text not null check (edition_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  label text not null check (length(btrim(label)) > 0),
  sort_order integer not null check (sort_order >= 0),
  coming_soon boolean not null default false,
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, edition_key),
  unique (client_id, sort_order)
);

create table public.portfolio_sections (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.portfolio_clients(id) on delete cascade,
  edition_id uuid references public.portfolio_editions(id) on delete cascade,
  section_type text not null check (
    section_type in (
      'storySequence', 'postGrid', 'carouselPairs',
      'videoStack', 'catalogPair', 'mediaRows'
    )
  ),
  title text not null check (length(btrim(title)) > 0),
  sort_order integer not null check (sort_order >= 0),
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index portfolio_sections_root_order_unique
  on public.portfolio_sections (client_id, sort_order)
  where edition_id is null;
create unique index portfolio_sections_edition_order_unique
  on public.portfolio_sections (edition_id, sort_order)
  where edition_id is not null;
create index portfolio_sections_client_id_idx
  on public.portfolio_sections (client_id);
create index portfolio_sections_edition_id_idx
  on public.portfolio_sections (edition_id);

create table public.portfolio_media_groups (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.portfolio_sections(id) on delete cascade,
  group_kind text not null check (
    group_kind in ('carousel', 'catalog', 'media_row', 'story_companion')
  ),
  label text not null check (length(btrim(label)) > 0),
  sort_order integer not null check (sort_order >= 0),
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section_id, sort_order)
);

create index portfolio_media_groups_section_id_idx
  on public.portfolio_media_groups (section_id);

create table public.portfolio_media_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid references public.portfolio_sections(id) on delete cascade,
  group_id uuid references public.portfolio_media_groups(id) on delete cascade,
  media_kind text not null check (
    media_kind in ('story', 'post', 'carouselSlide', 'video', 'catalogPage')
  ),
  storage_path text not null check (length(btrim(storage_path)) > 0),
  title text,
  alt_text text not null default '',
  mime_type text,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  sort_order integer not null check (sort_order >= 0),
  audio_enabled boolean,
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(section_id, group_id) = 1)
);

create unique index portfolio_media_items_section_order_unique
  on public.portfolio_media_items (section_id, sort_order)
  where group_id is null;
create unique index portfolio_media_items_group_order_unique
  on public.portfolio_media_items (group_id, sort_order)
  where section_id is null;
create index portfolio_media_items_section_id_idx
  on public.portfolio_media_items (section_id);
create index portfolio_media_items_group_id_idx
  on public.portfolio_media_items (group_id);
create index portfolio_media_items_storage_path_idx
  on public.portfolio_media_items (storage_path);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger portfolio_clients_set_updated_at
before update on public.portfolio_clients
for each row execute function private.set_updated_at();
create trigger portfolio_editions_set_updated_at
before update on public.portfolio_editions
for each row execute function private.set_updated_at();
create trigger portfolio_sections_set_updated_at
before update on public.portfolio_sections
for each row execute function private.set_updated_at();
create trigger portfolio_media_groups_set_updated_at
before update on public.portfolio_media_groups
for each row execute function private.set_updated_at();
create trigger portfolio_media_items_set_updated_at
before update on public.portfolio_media_items
for each row execute function private.set_updated_at();

create or replace function private.is_portfolio_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.portfolio_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_portfolio_admin() from public, anon;
grant execute on function private.is_portfolio_admin() to authenticated;

alter table public.portfolio_admins enable row level security;
alter table public.portfolio_clients enable row level security;
alter table public.portfolio_editions enable row level security;
alter table public.portfolio_sections enable row level security;
alter table public.portfolio_media_groups enable row level security;
alter table public.portfolio_media_items enable row level security;

create policy "Admins can read their own authorization"
on public.portfolio_admins for select to authenticated
using (user_id = (select auth.uid()));

create policy "Published clients are public"
on public.portfolio_clients for select to anon, authenticated
using (published);
create policy "Admins can read all clients"
on public.portfolio_clients for select to authenticated
using ((select private.is_portfolio_admin()));
create policy "Admins can insert clients"
on public.portfolio_clients for insert to authenticated
with check ((select private.is_portfolio_admin()));
create policy "Admins can update clients"
on public.portfolio_clients for update to authenticated
using ((select private.is_portfolio_admin()))
with check ((select private.is_portfolio_admin()));
create policy "Admins can delete clients"
on public.portfolio_clients for delete to authenticated
using ((select private.is_portfolio_admin()));

create policy "Published editions are public"
on public.portfolio_editions for select to anon, authenticated
using (
  exists (
    select 1 from public.portfolio_clients client
    where client.id = portfolio_editions.client_id
      and client.published
  )
);
create policy "Admins manage editions"
on public.portfolio_editions for all to authenticated
using ((select private.is_portfolio_admin()))
with check ((select private.is_portfolio_admin()));

create policy "Published sections are public"
on public.portfolio_sections for select to anon, authenticated
using (
  exists (
    select 1 from public.portfolio_clients client
    where client.id = portfolio_sections.client_id
      and client.published
  )
);
create policy "Admins manage sections"
on public.portfolio_sections for all to authenticated
using ((select private.is_portfolio_admin()))
with check ((select private.is_portfolio_admin()));

create policy "Published media groups are public"
on public.portfolio_media_groups for select to anon, authenticated
using (
  exists (
    select 1
    from public.portfolio_sections section
    join public.portfolio_clients client on client.id = section.client_id
    where section.id = portfolio_media_groups.section_id
      and client.published
  )
);
create policy "Admins manage media groups"
on public.portfolio_media_groups for all to authenticated
using ((select private.is_portfolio_admin()))
with check ((select private.is_portfolio_admin()));

create policy "Published media items are public"
on public.portfolio_media_items for select to anon, authenticated
using (
  exists (
    select 1
    from public.portfolio_sections section
    join public.portfolio_clients client on client.id = section.client_id
    where section.id = portfolio_media_items.section_id
      and client.published
  )
  or exists (
    select 1
    from public.portfolio_media_groups media_group
    join public.portfolio_sections section on section.id = media_group.section_id
    join public.portfolio_clients client on client.id = section.client_id
    where media_group.id = portfolio_media_items.group_id
      and client.published
  )
);
create policy "Admins manage media items"
on public.portfolio_media_items for all to authenticated
using ((select private.is_portfolio_admin()))
with check ((select private.is_portfolio_admin()));

grant select on public.portfolio_clients, public.portfolio_editions,
  public.portfolio_sections, public.portfolio_media_groups,
  public.portfolio_media_items to anon, authenticated;
grant select on public.portfolio_admins to authenticated;
grant insert, update, delete on public.portfolio_clients,
  public.portfolio_editions, public.portfolio_sections,
  public.portfolio_media_groups, public.portfolio_media_items to authenticated;
