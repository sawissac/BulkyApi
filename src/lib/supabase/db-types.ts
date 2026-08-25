import type { ApiCall } from '@/lib/types';
import type { DisplayMode, LayoutKey, ResponseView, SidebarTab } from '@/store/uiSlice';
import type { ThemeKey } from '@/lib/themes';

/** Row of `public.collections`. Ids are nanoid strings minted by Redux, not uuids. */
export type CollectionRow = {
  id: string;
  user_id: string;
  name: string;
  open: boolean;
  env_idx: number;
  position: number;
};

/** Row of `public.collection_items`. */
export type CollectionItemRow = {
  id: string;
  collection_id: string;
  user_id: string;
  name: string;
  method: string;
  code: string;
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
      environments: {
        Row: EnvironmentRow;
        Insert: Omit<EnvironmentRow, 'user_id'> & { user_id?: string };
        Update: Partial<EnvironmentRow>;
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
    runner: RunnerSnapshot;
  };
};
