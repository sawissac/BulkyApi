import type { Collection, DbSsl } from '@/lib/sampleData';
import { getSupabaseBrowser } from './client';
import type {
  CollectionItemRow,
  CollectionRow,
  DbConnectionRow,
  EnvironmentRow,
  FolderRow,
  RunnerSnapshot,
  SyncSnapshot,
  UserStateRow,
} from './db-types';

/**
 * The four Redux slices in the exact shape the `hydrate*` actions accept, so a
 * pulled remote snapshot and a loaded localforage blob are interchangeable.
 */
export type PersistedShape = {
  collections?: { collections: Collection[]; activeId: string | null; recentItemIds: string[] };
  editor?: { code: string };
  ui?: Record<string, unknown>;
  runner?: RunnerSnapshot;
};

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

/** `db_connections.ssl` is plain text in Postgres, so a value the app no
 *  longer recognizes (an older or newer client wrote it) reads back as "no
 *  TLS" rather than as an unhandled mode. */
function toSsl(value: string): DbSsl {
  return value === 'require' || value === 'no-verify' ? value : '';
}

/**
 * Reads the user's rows and rebuilds the nested Redux tree from them.
 * Returns null when Supabase is not configured or nobody is signed in, and
 * when the account has no rows yet — an empty remote must not clobber local
 * work, so "nothing there" and "not signed in" are the same answer to callers.
 */
export async function pullRemoteState(): Promise<PersistedShape | null> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return null;

  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return null;

  const [colsRes, itemsRes, foldersRes, envsRes, connsRes, stateRes] = await Promise.all([
    supabase.from('collections').select('*'),
    supabase.from('collection_items').select('*'),
    supabase.from('folders').select('*'),
    supabase.from('environments').select('*'),
    supabase.from('db_connections').select('*'),
    supabase.from('user_state').select('*').maybeSingle(),
  ]);

  if (colsRes.error || itemsRes.error || foldersRes.error || envsRes.error || stateRes.error)
    return null;

  const cols = (colsRes.data ?? []) as CollectionRow[];
  const items = (itemsRes.data ?? []) as CollectionItemRow[];
  const folders = (foldersRes.data ?? []) as FolderRow[];
  const envs = (envsRes.data ?? []) as EnvironmentRow[];
  // A project still on 0003 has no `db_connections` table, so this query
  // errors where the others cannot. That is not a reason to discard an
  // otherwise complete pull — the collections just come back with no saved
  // connections, exactly as they did before the pane existed.
  const conns = (connsRes.error ? [] : (connsRes.data ?? [])) as DbConnectionRow[];
  const userState = stateRes.data as UserStateRow | null;

  if (cols.length === 0 && !userState) return null;

  const collections: Collection[] = [...cols].sort(byPosition).map((c) => ({
    id: c.id,
    name: c.name,
    open: c.open,
    envIdx: c.env_idx,
    items: items
      .filter((i) => i.collection_id === c.id)
      .sort(byPosition)
      .map(({ id, name, method, code, folder_id }) => ({
        id,
        name,
        method,
        code,
        folderId: folder_id ?? null,
      })),
    folders: folders
      .filter((f) => f.collection_id === c.id)
      .sort(byPosition)
      .map(({ id, name, parent_id, open }) => ({
        id,
        name,
        parentId: parent_id ?? null,
        open,
      })),
    environments: envs
      .filter((e) => e.collection_id === c.id)
      .sort(byPosition)
      .map(({ id, name, vars }) => ({ id, name, vars })),
    connIdx: c.conn_idx ?? 0,
    connections: conns
      .filter((x) => x.collection_id === c.id)
      .sort(byPosition)
      .map(({ id, name, host, port, database, username, password, ssl }) => ({
        id,
        name,
        host,
        port,
        database,
        user: username,
        password,
        ssl: toSsl(ssl),
      })),
  }));

  return {
    collections: {
      collections,
      activeId: userState?.active_item_id ?? null,
      recentItemIds: userState?.recent_item_ids ?? [],
    },
    editor: { code: userState?.editor_code ?? '' },
    ui: userState
      ? {
          theme: userState.theme,
          layout: userState.layout,
          tweaksOpen: userState.tweaks_open,
          responseView: userState.response_view,
          sidebarTab: userState.sidebar_tab,
          callTimeout: userState.call_timeout,
          viewByItemId: userState.view_by_item_id ?? {},
          patternStyle: userState.pattern_style ?? 'checker',
          patternOpacity: userState.pattern_opacity ?? 20,
        }
      : undefined,
    runner: userState?.runner_snapshot ?? undefined,
  };
}

/**
 * Sends the whole snapshot to the `sync_state` RPC, which reconciles it in one
 * transaction. No-ops without a client or a session so local-only mode and
 * signed-out use cost nothing.
 *
 * The session check reads the cached session rather than validating it over
 * the network — it only decides whether a push is worth attempting. RLS and
 * the RPC's own `auth.uid()` check are what actually enforce access.
 *
 * Resolves false on any failure — the caller has already written localforage,
 * so a failed push means "still only local", never lost data.
 */
export async function pushRemoteState(snapshot: SyncSnapshot): Promise<boolean> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return false;

  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return false;

  const { error } = await supabase.rpc('sync_state', { p_snapshot: snapshot });
  return !error;
}

/**
 * Flattens the Redux slices into the payload `sync_state` expects. The
 * `collections` array is passed through as-is, so each collection's `folders`
 * list and every item's `folderId` travel with it — `sync_state` (0003) reads
 * `c.value->'folders'` and `i.value->>'folderId'` straight from this shape.
 * `0004_connections.sql` extends that to `c.value->'connections'` and
 * `c.value->>'connIdx'`, which likewise need no shaping here.
 */
export function buildSnapshot(state: Record<string, unknown>): SyncSnapshot {
  const collections = state.collections as PersistedShape['collections'] | undefined;
  const editor = state.editor as { code?: string } | undefined;
  const ui = (state.ui ?? {}) as Record<string, unknown>;
  const runner = state.runner as Partial<RunnerSnapshot> | undefined;

  return {
    collections: collections?.collections ?? [],
    state: {
      activeId: collections?.activeId ?? null,
      recentItemIds: collections?.recentItemIds ?? [],
      editorCode: editor?.code ?? '',
      theme: ui.theme as SyncSnapshot['state']['theme'],
      layout: ui.layout as SyncSnapshot['state']['layout'],
      tweaksOpen: Boolean(ui.tweaksOpen),
      responseView: ui.responseView as SyncSnapshot['state']['responseView'],
      sidebarTab: ui.sidebarTab as SyncSnapshot['state']['sidebarTab'],
      callTimeout: Number(ui.callTimeout ?? 0),
      viewByItemId: (ui.viewByItemId ?? {}) as SyncSnapshot['state']['viewByItemId'],
      patternStyle: (ui.patternStyle ?? 'checker') as SyncSnapshot['state']['patternStyle'],
      patternOpacity: Number(ui.patternOpacity ?? 20),
      runner: {
        builtCalls: runner?.builtCalls ?? [],
        callsByItemId: runner?.callsByItemId ?? {},
        currentItemId: runner?.currentItemId ?? null,
      },
    },
  };
}
