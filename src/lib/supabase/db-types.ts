import type { ApiCall } from '@/lib/types';
import type { DisplayMode, LayoutKey, PatternStyle, ResponseView, SidebarTab } from '@/store/uiSlice';
import type { ThemeKey } from '@/lib/themes';

/** Row of `public.collections`. Ids are nanoid strings minted by Redux, not uuids. */
export type CollectionRow = {
  id: string;
  user_id: string;
  name: string;
  open: boolean;
  env_idx: number;
  /** Index of the collection's active database connection — added by
   *  `0004_connections.sql`, so a project still on 0003 answers null. */
  conn_idx: number | null;
  position: number;
};

/** Row of `public.collection_items`. `folder_id` is a plain (un-keyed) folder
 *  id or null for a root-level item — see `0003_folders.sql`. */
export type CollectionItemRow = {
  id: string;
  collection_id: string;
  user_id: string;
  name: string;
  method: string;
  code: string;
  folder_id: string | null;
  position: number;
};

/** Row of `public.folders`. `parent_id` is another folder's id in the same
 *  collection, or null for a root-level folder. Not a foreign key — the
 *  `sync_state` reconcile trusts client ids (see `0003_folders.sql`). */
export type FolderRow = {
  id: string;
  collection_id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  open: boolean;
  position: number;
};

/** Row of `public.environments`. */
export type EnvironmentRow = {
  id: string;
  collection_id: string;
  user_id: string;
  name: string;
  vars: Record<string, string>;
  position: number;
};

/** Row of `public.db_connections` — one saved Postgres connection, mirroring
 *  `DbConnection` in `@/lib/sampleData`. The password is stored as sent: RLS
 *  keeps it to its owner, the same protection every environment variable in
 *  the `vars` blob above already relies on. */
export type DbConnectionRow = {
  id: string;
  collection_id: string;
  user_id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: string;
  position: number;
};

/** Runner fields worth persisting — mirrors what `persist.ts` already keeps. */
export type RunnerSnapshot = {
  builtCalls: ApiCall[];
  callsByItemId: Record<string, ApiCall[]>;
  currentItemId: string | null;
};

/** Row of `public.user_state` — the ui, editor, and runner slices flattened. */
export type UserStateRow = {
  user_id: string;
  active_item_id: string | null;
  recent_item_ids: string[];
  editor_code: string;
  theme: ThemeKey;
  layout: LayoutKey;
  tweaks_open: boolean;
  response_view: ResponseView;
  sidebar_tab: SidebarTab;
  call_timeout: number;
  view_by_item_id: Record<string, ResponseView>;
  runner_snapshot: RunnerSnapshot;
  /** Sidebar/response-panel background wash — added by `0005_pattern.sql`,
   *  so a project still on 0004 answers the column's own default. */
  pattern_style: PatternStyle;
  pattern_opacity: number;
};

/**
 * Hand-written stand-in for `supabase gen types`. Every table needs a
 * `Relationships` entry even when empty — postgrest-js checks the schema
 * against its `GenericTable` shape, and one missing key collapses the whole
 * schema to `never`, which silently turns `.rpc()` args into `never` rather
 * than reporting the actual mismatch.
 */
export type Database = {
  __InternalSupabase: { PostgrestVersion: '13' };
  public: {
    Tables: {
      collections: {
        Row: CollectionRow;
        Insert: Omit<CollectionRow, 'user_id'> & { user_id?: string };
        Update: Partial<CollectionRow>;
        Relationships: [];
      };
      collection_items: {
        Row: CollectionItemRow;
        Insert: Omit<CollectionItemRow, 'user_id'> & { user_id?: string };
        Update: Partial<CollectionItemRow>;
        Relationships: [];
      };
      folders: {
        Row: FolderRow;
        Insert: Omit<FolderRow, 'user_id'> & { user_id?: string };
        Update: Partial<FolderRow>;
        Relationships: [];
      };
      environments: {
        Row: EnvironmentRow;
        Insert: Omit<EnvironmentRow, 'user_id'> & { user_id?: string };
        Update: Partial<EnvironmentRow>;
        Relationships: [];
      };
      db_connections: {
        Row: DbConnectionRow;
        Insert: Omit<DbConnectionRow, 'user_id'> & { user_id?: string };
        Update: Partial<DbConnectionRow>;
        Relationships: [];
      };
      user_state: {
        Row: UserStateRow;
        Insert: Partial<UserStateRow> & { user_id: string };
        Update: Partial<UserStateRow>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      sync_state: {
        Args: { p_snapshot: SyncSnapshot };
        Returns: undefined;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

/** Payload accepted by the `sync_state` RPC. */
export type SyncSnapshot = {
  collections: unknown[];
  state: {
    activeId: string | null;
    recentItemIds: string[];
    editorCode: string;
    theme: ThemeKey;
    layout: LayoutKey;
    tweaksOpen: boolean;
    responseView: ResponseView;
    sidebarTab: SidebarTab;
    displayMode?: DisplayMode;
    callTimeout: number;
    viewByItemId: Record<string, ResponseView>;
    patternStyle: PatternStyle;
    patternOpacity: number;
    runner: RunnerSnapshot;
  };
};
