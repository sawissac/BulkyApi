-- Saved Postgres connections for the DB pane.
--
-- Redux keeps them as a `connections` array on each collection plus a
-- `connIdx` naming the active one (see src/lib/sampleData.ts /
-- collectionsSlice.ts); a script reaches one as `api.query.pgsql(...)`. This
-- migration mirrors that: a `db_connections` table and a `conn_idx` column on
-- `collections`, modelled on `environments` from 0001/0002.
--
-- On the password column: it is stored as the client sends it, exactly as an
-- environment's `vars` blob already stores API tokens. RLS is what protects
-- both — a row is readable only by the user that owns it. A collection
-- exported to a file has its passwords blanked client-side first (see
-- `exportCollection` in src/hooks/useFileActions.ts), since a file leaving the
-- app has no such protection.
--
-- `user` is spelled `username` here: `user` is a reserved word in Postgres and
-- would need quoting at every use site. `sync.ts` maps it back on the way out.

-- ── db_connections (DbConnection) ────────────────────────────────────────────
create table if not exists public.db_connections (
  id            text primary key,
  collection_id text not null references public.collections(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  host          text not null default '',
  port          int  not null default 5432,
  database      text not null default '',
  username      text not null default '',
  password      text not null default '',
  -- '' (no TLS), 'require' (verify the certificate) or 'no-verify'. Plain text
  -- rather than an enum so a client that learns a fourth mode does not need a
  -- migration to save it; `toSsl` in sync.ts narrows on the way back.
  ssl           text not null default '',
  position      int  not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists db_connections_collection_id_idx on public.db_connections(collection_id);
create index if not exists db_connections_user_id_idx       on public.db_connections(user_id);

alter table public.collections
  add column if not exists conn_idx int not null default 0;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.db_connections enable row level security;

create policy "own db_connections" on public.db_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── sync_state: reconcile db_connections + collections.conn_idx ───────────────
-- Same whole-snapshot upsert-present / delete-absent strategy as 0002 and
-- 0003; this version adds the `db_connections` block (modelled on
-- `environments`) and threads `conn_idx` through the `collections` upsert.
create or replace function public.sync_state(p_snapshot jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid    uuid   := auth.uid();
  v_cols   jsonb  := coalesce(p_snapshot->'collections', '[]'::jsonb);
  v_state  jsonb  := coalesce(p_snapshot->'state', '{}'::jsonb);
  v_active text   := nullif(v_state->>'activeId', '');
begin
  if v_uid is null then
    raise exception 'sync_state: not authenticated';
  end if;

  -- ── collections ──────────────────────────────────────────────────────────
  insert into public.collections (id, user_id, name, open, env_idx, conn_idx, position, updated_at)
  select
    c.value->>'id',
    v_uid,
    coalesce(c.value->>'name', 'Untitled'),
    coalesce((c.value->>'open')::boolean, true),
    coalesce((c.value->>'envIdx')::int, 0),
    coalesce((c.value->>'connIdx')::int, 0),
    (c.ord - 1)::int,
    now()
  from jsonb_array_elements(v_cols) with ordinality as c(value, ord)
  where c.value->>'id' is not null
  on conflict (id) do update set
    name       = excluded.name,
    open       = excluded.open,
    env_idx    = excluded.env_idx,
    conn_idx   = excluded.conn_idx,
    position   = excluded.position,
    updated_at = now();

  delete from public.collections t
  where t.user_id = v_uid
    and not exists (
      select 1 from jsonb_array_elements(v_cols) c where c.value->>'id' = t.id
    );

  -- ── folders ──────────────────────────────────────────────────────────────
  insert into public.folders (id, collection_id, user_id, parent_id, name, open, position, updated_at)
  select
    f.value->>'id',
    c.value->>'id',
    v_uid,
    nullif(f.value->>'parentId', ''),
    coalesce(f.value->>'name', 'Folder'),
    coalesce((f.value->>'open')::boolean, true),
    (f.ord - 1)::int,
    now()
  from jsonb_array_elements(v_cols) as c(value)
  cross join lateral jsonb_array_elements(coalesce(c.value->'folders', '[]'::jsonb))
    with ordinality as f(value, ord)
  where f.value->>'id' is not null
  on conflict (id) do update set
    collection_id = excluded.collection_id,
    parent_id     = excluded.parent_id,
    name          = excluded.name,
    open          = excluded.open,
    position      = excluded.position,
    updated_at    = now();

  delete from public.folders t
  where t.user_id = v_uid
    and not exists (
      select 1
      from jsonb_array_elements(v_cols) as c(value)
      cross join lateral jsonb_array_elements(coalesce(c.value->'folders', '[]'::jsonb)) as f(value)
      where f.value->>'id' = t.id
    );

  -- ── collection_items ─────────────────────────────────────────────────────
  insert into public.collection_items (id, collection_id, user_id, name, method, code, folder_id, position, updated_at)
  select
    i.value->>'id',
    c.value->>'id',
    v_uid,
    coalesce(i.value->>'name', 'New Test'),
    coalesce(i.value->>'method', 'GET'),
    coalesce(i.value->>'code', ''),
    nullif(i.value->>'folderId', ''),
    (i.ord - 1)::int,
    now()
  from jsonb_array_elements(v_cols) as c(value)
  cross join lateral jsonb_array_elements(coalesce(c.value->'items', '[]'::jsonb))
    with ordinality as i(value, ord)
  where i.value->>'id' is not null
  on conflict (id) do update set
    collection_id = excluded.collection_id,
    name          = excluded.name,
    method        = excluded.method,
    code          = excluded.code,
    folder_id     = excluded.folder_id,
    position      = excluded.position,
    updated_at    = now();

  delete from public.collection_items t
  where t.user_id = v_uid
    and not exists (
      select 1
      from jsonb_array_elements(v_cols) as c(value)
      cross join lateral jsonb_array_elements(coalesce(c.value->'items', '[]'::jsonb)) as i(value)
      where i.value->>'id' = t.id
    );

  -- ── environments ─────────────────────────────────────────────────────────
  insert into public.environments (id, collection_id, user_id, name, vars, position, updated_at)
  select
    e.value->>'id',
    c.value->>'id',
    v_uid,
    coalesce(e.value->>'name', 'Untitled'),
    coalesce(e.value->'vars', '{}'::jsonb),
    (e.ord - 1)::int,
    now()
  from jsonb_array_elements(v_cols) as c(value)
  cross join lateral jsonb_array_elements(coalesce(c.value->'environments', '[]'::jsonb))
    with ordinality as e(value, ord)
  where e.value->>'id' is not null
  on conflict (id) do update set
    collection_id = excluded.collection_id,
    name          = excluded.name,
    vars          = excluded.vars,
    position      = excluded.position,
    updated_at    = now();

  delete from public.environments t
  where t.user_id = v_uid
    and not exists (
      select 1
      from jsonb_array_elements(v_cols) as c(value)
      cross join lateral jsonb_array_elements(coalesce(c.value->'environments', '[]'::jsonb)) as e(value)
      where e.value->>'id' = t.id
    );

  -- ── db_connections ───────────────────────────────────────────────────────
  insert into public.db_connections
    (id, collection_id, user_id, name, host, port, database, username, password, ssl, position, updated_at)
  select
    d.value->>'id',
    c.value->>'id',
    v_uid,
    coalesce(d.value->>'name', 'Connection'),
    coalesce(d.value->>'host', ''),
    coalesce((d.value->>'port')::int, 5432),
    coalesce(d.value->>'database', ''),
    coalesce(d.value->>'user', ''),
    coalesce(d.value->>'password', ''),
    coalesce(d.value->>'ssl', ''),
    (d.ord - 1)::int,
    now()
  from jsonb_array_elements(v_cols) as c(value)
  cross join lateral jsonb_array_elements(coalesce(c.value->'connections', '[]'::jsonb))
    with ordinality as d(value, ord)
  where d.value->>'id' is not null
  on conflict (id) do update set
    collection_id = excluded.collection_id,
    name          = excluded.name,
    host          = excluded.host,
    port          = excluded.port,
    database      = excluded.database,
    username      = excluded.username,
    password      = excluded.password,
    ssl           = excluded.ssl,
    position      = excluded.position,
    updated_at    = now();

  delete from public.db_connections t
  where t.user_id = v_uid
    and not exists (
      select 1
      from jsonb_array_elements(v_cols) as c(value)
      cross join lateral jsonb_array_elements(coalesce(c.value->'connections', '[]'::jsonb)) as d(value)
      where d.value->>'id' = t.id
    );

  -- An activeId pointing at an item this snapshot just deleted would violate
  -- the FK, so it degrades to null rather than failing the whole save.
  if v_active is not null and not exists (
    select 1 from public.collection_items where id = v_active and user_id = v_uid
  ) then
    v_active := null;
  end if;

  -- ── user_state (ui + editor + runner) ────────────────────────────────────
  insert into public.user_state (
    user_id, active_item_id, recent_item_ids, editor_code, theme, layout,
    tweaks_open, response_view, sidebar_tab, call_timeout, view_by_item_id,
    runner_snapshot, updated_at
  )
  values (
    v_uid,
    v_active,
    coalesce(
      (select array_agg(x) from jsonb_array_elements_text(coalesce(v_state->'recentItemIds', '[]'::jsonb)) x),
      '{}'
    ),
    coalesce(v_state->>'editorCode', ''),
    coalesce(v_state->>'theme', 'ocean'),
    coalesce(v_state->>'layout', 'editor-focus'),
    coalesce((v_state->>'tweaksOpen')::boolean, false),
    coalesce(v_state->>'responseView', 'cards'),
    coalesce(v_state->>'sidebarTab', 'collections'),
    coalesce((v_state->>'callTimeout')::int, 0),
    coalesce(v_state->'viewByItemId', '{}'::jsonb),
    coalesce(v_state->'runner', '{"builtCalls":[],"callsByItemId":{},"currentItemId":null}'::jsonb),
    now()
  )
  on conflict (user_id) do update set
    active_item_id  = excluded.active_item_id,
    recent_item_ids = excluded.recent_item_ids,
    editor_code     = excluded.editor_code,
    theme           = excluded.theme,
    layout          = excluded.layout,
    tweaks_open     = excluded.tweaks_open,
    response_view   = excluded.response_view,
    sidebar_tab     = excluded.sidebar_tab,
    call_timeout    = excluded.call_timeout,
    view_by_item_id = excluded.view_by_item_id,
    runner_snapshot = excluded.runner_snapshot,
    updated_at      = now();
end;
$$;

grant execute on function public.sync_state(jsonb) to authenticated;
