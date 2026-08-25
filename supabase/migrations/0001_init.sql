-- BulkyApi Supabase schema
--
-- IDs are `text`, not `uuid`: Redux already mints ids client-side with
-- nanoid() (see collectionsSlice.ts) and every slice keys off those exact
-- strings (activeId, viewByItemId, callsByItemId, recentItemIds). Using
-- `text` lets ids pass straight through unchanged between Redux, localforage,
-- and Supabase — no server-side id remapping to reconcile back into state.
--
-- Normalization strategy: `collections`, `collection_items`, and
-- `environments` are real relational tables (FKs, cascade delete, per-row
-- RLS) because that's the part of Redux state that's actual user-authored
-- content — the same shape as collectionsSlice.ts. `ui`, `editor`, and
-- `runner` slice state is small, always-read-together UI/session state
-- (theme, layout, the live run cache, response payloads of arbitrary shape)
-- with no query benefit from being split into columns, so it lives as jsonb
-- on one `user_state` row per user — one table serving three slices,
-- mirroring how they already sit in a single localforage blob today.
-- See src/lib/persist.ts and src/store/*Slice.ts.

-- ── collections ────────────────────────────────────────────────────────────
create table if not exists public.collections (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  open        boolean not null default true,
  env_idx     int not null default 0,
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists collections_user_id_idx on public.collections(user_id);

-- ── collection_items (CollectionItem) ──────────────────────────────────────
create table if not exists public.collection_items (
  id            text primary key,
  collection_id text not null references public.collections(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null default 'New Test',
  method        text not null default 'GET',
  code          text not null default '',
  position      int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists collection_items_collection_id_idx on public.collection_items(collection_id);
create index if not exists collection_items_user_id_idx on public.collection_items(user_id);

-- ── environments ────────────────────────────────────────────────────────────
create table if not exists public.environments (
  id            text primary key,
  collection_id text not null references public.collections(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  vars          jsonb not null default '{}'::jsonb,
  position      int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists environments_collection_id_idx on public.environments(collection_id);
create index if not exists environments_user_id_idx on public.environments(user_id);

-- ── user_state (ui + editor + runner slices, one row per user) ─────────────
create table if not exists public.user_state (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  active_item_id    text references public.collection_items(id) on delete set null,
  recent_item_ids   text[] not null default '{}',
  editor_code       text not null default '',
  theme             text not null default 'ocean',
  layout            text not null default 'editor-focus',
  tweaks_open       boolean not null default false,
  response_view     text not null default 'cards',
  sidebar_tab       text not null default 'collections',
  call_timeout      int not null default 0,
  view_by_item_id   jsonb not null default '{}'::jsonb,
  -- runner snapshot: { builtCalls, callsByItemId, currentItemId } — same shape
  -- persist.ts already writes (transient running/paused/logs already excluded).
  runner_snapshot   jsonb not null default '{"builtCalls":[],"callsByItemId":{},"currentItemId":null}'::jsonb,
  updated_at        timestamptz not null default now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.collections      enable row level security;
alter table public.collection_items enable row level security;
alter table public.environments     enable row level security;
alter table public.user_state       enable row level security;

create policy "own collections"      on public.collections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own collection_items" on public.collection_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own environments"     on public.environments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own user_state"       on public.user_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
