-- Sidebar/response-panel background pattern, chosen in Settings
-- (TweaksPanel's "Background Pattern" section).
--
-- Redux keeps it as two `uiSlice` fields, `patternStyle` (one of the
-- `app-panel-texture--*` utilities in globals.css, or `'none'`) and
-- `patternOpacity` (0-100, the `--app-pattern-alpha` multiplier those
-- utilities scale every gradient color by). This migration mirrors both onto
-- `user_state`, alongside the rest of the UI slice it already flattens.
--
-- Defaults ('checker', 20) match `uiSlice`'s own `initialState`, so a row
-- written before this migration existed (nulls backfilled by the column
-- defaults below) reads back as the same pattern a fresh install starts with.

alter table public.user_state
  add column if not exists pattern_style   text not null default 'checker',
  add column if not exists pattern_opacity int  not null default 20;

-- ── sync_state: thread pattern_style/pattern_opacity through user_state ───────
-- Identical to 0004's version otherwise; only the user_state insert/update at
-- the bottom changes.
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
    pattern_style, pattern_opacity, runner_snapshot, updated_at
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
    coalesce(v_state->>'patternStyle', 'checker'),
    coalesce((v_state->>'patternOpacity')::int, 20),
    coalesce(v_state->'runner', '{"builtCalls":[],"callsByItemId":{},"currentItemId":null}'::jsonb),
    now()
  )
  on conflict (user_id) do update set
    active_item_id   = excluded.active_item_id,
    recent_item_ids  = excluded.recent_item_ids,
    editor_code      = excluded.editor_code,
    theme            = excluded.theme,
    layout           = excluded.layout,
    tweaks_open      = excluded.tweaks_open,
    response_view    = excluded.response_view,
    sidebar_tab      = excluded.sidebar_tab,
    call_timeout     = excluded.call_timeout,
    view_by_item_id  = excluded.view_by_item_id,
    pattern_style    = excluded.pattern_style,
    pattern_opacity  = excluded.pattern_opacity,
    runner_snapshot  = excluded.runner_snapshot,
    updated_at       = now();
end;
$$;

grant execute on function public.sync_state(jsonb) to authenticated;
