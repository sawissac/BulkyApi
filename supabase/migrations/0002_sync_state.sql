-- Atomic whole-snapshot sync.
--
-- Redux holds the entire collections tree in memory and every mutation
-- produces a new full tree, so the client has no reliable per-row diff to
-- send. This function takes the whole snapshot and reconciles it in one
-- transaction: upsert everything present, delete everything absent. That
-- makes a save idempotent and impossible to half-apply, which a sequence of
-- client-issued insert/update/delete calls would not be.
--
-- SECURITY INVOKER (the default) is deliberate — RLS policies still apply, so
-- this function cannot touch another user's rows even though it takes ids
-- straight from the client payload.

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
  insert into public.collections (id, user_id, name, open, env_idx, position, updated_at)
  select
    c.value->>'id',
    v_uid,
    coalesce(c.value->>'name', 'Untitled'),
    coalesce((c.value->>'open')::boolean, true),
    coalesce((c.value->>'envIdx')::int, 0),
    (c.ord - 1)::int,
    now()
  from jsonb_array_elements(v_cols) with ordinality as c(value, ord)
  where c.value->>'id' is not null
  on conflict (id) do update set
    name       = excluded.name,
    open       = excluded.open,
    env_idx    = excluded.env_idx,
    position   = excluded.position,
    updated_at = now();

  delete from public.collections t
  where t.user_id = v_uid
    and not exists (
      select 1 from jsonb_array_elements(v_cols) c where c.value->>'id' = t.id
    );

  -- ── collection_items ─────────────────────────────────────────────────────
  insert into public.collection_items (id, collection_id, user_id, name, method, code, position, updated_at)
  select
    i.value->>'id',
    c.value->>'id',
    v_uid,
    coalesce(i.value->>'name', 'New Test'),
    coalesce(i.value->>'method', 'GET'),
    coalesce(i.value->>'code', ''),
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
