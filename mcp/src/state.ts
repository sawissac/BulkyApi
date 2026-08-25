import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { config, hasCredentials, hasSupabaseEnv } from "./config.js";
import type { Collection, CollectionItem, Environment } from "./types.js";

type CollectionRow = {
  id: string;
  user_id: string;
  name: string;
  open: boolean;
  env_idx: number;
  position: number;
};

type CollectionItemRow = {
  id: string;
  collection_id: string;
  user_id: string;
  name: string;
  method: string;
  code: string;
  position: number;
};

type EnvironmentRow = {
  id: string;
  collection_id: string;
  user_id: string;
  name: string;
  vars: Record<string, string>;
  position: number;
};

const NANOID_ALPHABET = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

/**
 * Mints ids in the same shape Redux does (`nanoid()`, 21 chars), because the
 * app keys `activeId`, `viewByItemId`, `callsByItemId`, and `recentItemIds`
 * off these exact strings and the columns are `text`, not `uuid`.
 */
export function newId(): string {
  const bytes = randomBytes(21);
  let out = "";
  for (const byte of bytes) out += NANOID_ALPHABET[byte & 63];
  return out;
}

let client: SupabaseClient | null = null;
let signedInUserId: string | null = null;

/**
 * One lazily-created client for the process, authenticated as the configured
 * user. Row Level Security is what limits access, so the publishable key is
 * all this needs — a `service_role` key would bypass RLS and must not be used
 * here.
 *
 * Sign-in is deferred to the first state-backed tool call so the stateless
 * tools (`bulky_http_request`, `bulky_run_script`, `bulky_curl_to_script`)
 * work with no Supabase configuration at all.
 */
export async function requireAuth(): Promise<{ supabase: SupabaseClient; userId: string }> {
  if (!hasSupabaseEnv()) {
    throw new Error(
      "Supabase is not configured. Set BULKY_SUPABASE_URL and BULKY_SUPABASE_KEY " +
        "(or run the server from a repo whose .env.local has NEXT_PUBLIC_SUPABASE_URL " +
        "and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).",
    );
  }
  if (!hasCredentials()) {
    throw new Error(
      "No BulkyApi credentials. Set BULKY_EMAIL and BULKY_PASSWORD to the account " +
        "whose collections this server should read and write.",
    );
  }

  if (!client) {
    client = createClient(config.supabaseUrl!, config.supabaseKey!, {
      auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }

  if (!signedInUserId) {
    const { data, error } = await client.auth.signInWithPassword({
      email: config.email!,
      password: config.password!,
    });
    if (error) throw new Error(`Supabase sign-in failed: ${error.message}`);
    if (!data.user) throw new Error("Supabase sign-in returned no user.");
    signedInUserId = data.user.id;
  }

  return { supabase: client, userId: signedInUserId };
}

/** Diagnostics for `bulky_whoami` — never throws, so it can report what is missing. */
export async function describeAuth(): Promise<Record<string, unknown>> {
  const base = {
    supabaseConfigured: hasSupabaseEnv(),
    supabaseUrl: config.supabaseUrl ?? null,
    credentialsConfigured: hasCredentials(),
    email: config.email ?? null,
    loadedEnvFile: config.loadedEnvFile,
    defaultTimeoutMs: config.defaultTimeoutMs,
    defaultMaxCalls: config.defaultMaxCalls,
  };
  if (!hasSupabaseEnv() || !hasCredentials()) {
    return { ...base, signedIn: false, reason: "missing configuration" };
  }
  try {
    const { userId } = await requireAuth();
    return { ...base, signedIn: true, userId };
  } catch (error) {
    return { ...base, signedIn: false, reason: (error as Error).message };
  }
}

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

/**
 * Rebuilds the nested Redux tree from the user's rows — the same shape
 * `pullRemoteState()` produces in the app, so anything this server returns
 * lines up with what the UI shows.
 */
export async function readCollections(): Promise<Collection[]> {
  const { supabase } = await requireAuth();

  const [cols, items, envs] = await Promise.all([
    supabase.from("collections").select("*"),
    supabase.from("collection_items").select("*"),
    supabase.from("environments").select("*"),
  ]);

  const failure = cols.error ?? items.error ?? envs.error;
  if (failure) throw new Error(`Supabase read failed: ${failure.message}`);

  const collectionRows = (cols.data ?? []) as CollectionRow[];
  const itemRows = (items.data ?? []) as CollectionItemRow[];
  const envRows = (envs.data ?? []) as EnvironmentRow[];

  return [...collectionRows].sort(byPosition).map((c) => ({
    id: c.id,
    name: c.name,
    open: c.open,
    envIdx: c.env_idx,
    items: itemRows
      .filter((i) => i.collection_id === c.id)
      .sort(byPosition)
      .map(({ id, name, method, code }) => ({ id, name, method, code })),
    environments: envRows
      .filter((e) => e.collection_id === c.id)
      .sort(byPosition)
      .map(({ id, name, vars }) => ({ id, name, vars: vars ?? {} })),
  }));
}

export type LocatedItem = {
  item: CollectionItem;
  collection: Collection;
};

/** Finds an item by id, or by name when `name` is given (case-insensitive). */
export async function findItem(ref: { itemId?: string; name?: string; collectionId?: string }): Promise<LocatedItem> {
  const collections = await readCollections();
  const scoped = ref.collectionId ? collections.filter((c) => c.id === ref.collectionId) : collections;

  for (const collection of scoped) {
    for (const item of collection.items) {
      if (ref.itemId && item.id === ref.itemId) return { item, collection };
    }
  }
  if (ref.name) {
    const wanted = ref.name.toLowerCase();
    const matches: LocatedItem[] = [];
    for (const collection of scoped) {
      for (const item of collection.items) {
        if (item.name.toLowerCase() === wanted) matches.push({ item, collection });
      }
    }
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      const ids = matches.map((m) => `${m.collection.name}/${m.item.name} (${m.item.id})`).join(", ");
      throw new Error(`Name "${ref.name}" matches several items: ${ids}. Pass itemId instead.`);
    }
  }
  throw new Error(`No item found for ${JSON.stringify(ref)}.`);
}

async function nextPosition(table: string, column: string, value: string): Promise<number> {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from(table)
    .select("position")
    .eq(column, value)
    .order("position", { ascending: false })
    .limit(1);
  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  const top = (data ?? [])[0] as { position: number } | undefined;
  return top ? top.position + 1 : 0;
}

export async function createCollection(name: string): Promise<Collection> {
  const { supabase, userId } = await requireAuth();
  const id = newId();
  const position = await nextPosition("collections", "user_id", userId);

  const { error } = await supabase
    .from("collections")
    .insert({ id, user_id: userId, name, open: true, env_idx: 0, position });
  if (error) throw new Error(`Create collection failed: ${error.message}`);

  return { id, name, open: true, envIdx: 0, items: [], environments: [] };
}

export async function deleteCollection(collectionId: string): Promise<void> {
  const { supabase, userId } = await requireAuth();
  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", collectionId)
    .eq("user_id", userId);
  if (error) throw new Error(`Delete collection failed: ${error.message}`);
}

export async function saveItem(input: {
  collectionId?: string;
  itemId?: string;
  name?: string;
  method?: string;
  code?: string;
}): Promise<CollectionItem & { collectionId: string; created: boolean }> {
  const { supabase, userId } = await requireAuth();

  if (input.itemId) {
    const existing = await findItem({ itemId: input.itemId });
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) patch.name = input.name;
    if (input.method !== undefined) patch.method = input.method.toUpperCase();
    if (input.code !== undefined) patch.code = input.code;
    if (input.collectionId !== undefined) patch.collection_id = input.collectionId;

    const { error } = await supabase
      .from("collection_items")
      .update(patch)
      .eq("id", input.itemId)
      .eq("user_id", userId);
    if (error) throw new Error(`Update item failed: ${error.message}`);

    return {
      id: input.itemId,
      name: input.name ?? existing.item.name,
      method: (input.method ?? existing.item.method).toUpperCase(),
      code: input.code ?? existing.item.code,
      collectionId: input.collectionId ?? existing.collection.id,
      created: false,
    };
  }

  if (!input.collectionId) throw new Error("collectionId is required when creating an item.");

  const id = newId();
  const position = await nextPosition("collection_items", "collection_id", input.collectionId);
  const row = {
    id,
    collection_id: input.collectionId,
    user_id: userId,
    name: input.name ?? "New Test",
    method: (input.method ?? "GET").toUpperCase(),
    code: input.code ?? "",
    position,
  };

  const { error } = await supabase.from("collection_items").insert(row);
  if (error) throw new Error(`Create item failed: ${error.message}`);

  return {
    id,
    name: row.name,
    method: row.method,
    code: row.code,
    collectionId: input.collectionId,
    created: true,
  };
}

export async function deleteItem(itemId: string): Promise<void> {
  const { supabase, userId } = await requireAuth();
  const { error } = await supabase
    .from("collection_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", userId);
  if (error) throw new Error(`Delete item failed: ${error.message}`);
}

export async function upsertEnvironment(input: {
  environmentId?: string;
  collectionId?: string;
  name?: string;
  vars: Record<string, string>;
  replace?: boolean;
}): Promise<Environment & { collectionId: string; created: boolean }> {
  const { supabase, userId } = await requireAuth();
  const collections = await readCollections();

  const found = input.environmentId
    ? collections
        .flatMap((c) => c.environments.map((e) => ({ env: e, collection: c })))
        .find((x) => x.env.id === input.environmentId)
    : input.collectionId && input.name
      ? collections
          .filter((c) => c.id === input.collectionId)
          .flatMap((c) => c.environments.map((e) => ({ env: e, collection: c })))
          .find((x) => x.env.name.toLowerCase() === input.name!.toLowerCase())
      : undefined;

  if (found) {
    const vars = input.replace ? input.vars : { ...found.env.vars, ...input.vars };
    const patch: Record<string, unknown> = { vars, updated_at: new Date().toISOString() };
    if (input.name !== undefined) patch.name = input.name;

    const { error } = await supabase
      .from("environments")
      .update(patch)
      .eq("id", found.env.id)
      .eq("user_id", userId);
    if (error) throw new Error(`Update environment failed: ${error.message}`);

    return {
      id: found.env.id,
      name: input.name ?? found.env.name,
      vars,
      collectionId: found.collection.id,
      created: false,
    };
  }

  if (!input.collectionId) {
    throw new Error("collectionId is required when creating an environment.");
  }

  const id = newId();
  const position = await nextPosition("environments", "collection_id", input.collectionId);
  const row = {
    id,
    collection_id: input.collectionId,
    user_id: userId,
    name: input.name ?? "Untitled",
    vars: input.vars,
    position,
  };

  const { error } = await supabase.from("environments").insert(row);
  if (error) throw new Error(`Create environment failed: ${error.message}`);

  return { id, name: row.name, vars: row.vars, collectionId: input.collectionId, created: true };
}

export async function deleteEnvironment(environmentId: string): Promise<void> {
  const { supabase, userId } = await requireAuth();
  const { error } = await supabase
    .from("environments")
    .delete()
    .eq("id", environmentId)
    .eq("user_id", userId);
  if (error) throw new Error(`Delete environment failed: ${error.message}`);
}

export async function deleteEnvVars(environmentId: string, keys: string[]): Promise<Environment> {
  const { supabase, userId } = await requireAuth();
  const collections = await readCollections();
  const found = collections
    .flatMap((c) => c.environments)
    .find((e) => e.id === environmentId);
  if (!found) throw new Error(`No environment with id ${environmentId}.`);

  const vars = { ...found.vars };
  for (const key of keys) delete vars[key];

  const { error } = await supabase
    .from("environments")
    .update({ vars, updated_at: new Date().toISOString() })
    .eq("id", environmentId)
    .eq("user_id", userId);
  if (error) throw new Error(`Update environment failed: ${error.message}`);

  return { id: found.id, name: found.name, vars };
}

/**
 * Resolves the variable map a run should see.
 *
 * An explicit `environmentId` wins; otherwise the item's own collection
 * contributes the environment its `envIdx` points at — the same one the UI
 * would use for that item. `overrides` are merged last so a caller can patch
 * a single value without writing it back to the database.
 */
export async function resolveEnvVars(input: {
  environmentId?: string;
  collectionId?: string;
  overrides?: Record<string, string>;
}): Promise<{ vars: Record<string, string>; environmentName: string | null }> {
  if (!input.environmentId && !input.collectionId) {
    return { vars: { ...(input.overrides ?? {}) }, environmentName: null };
  }

  const collections = await readCollections();

  if (input.environmentId) {
    const env = collections.flatMap((c) => c.environments).find((e) => e.id === input.environmentId);
    if (!env) throw new Error(`No environment with id ${input.environmentId}.`);
    return { vars: { ...env.vars, ...(input.overrides ?? {}) }, environmentName: env.name };
  }

  const collection = collections.find((c) => c.id === input.collectionId);
  const env = collection?.environments[collection.envIdx];
  return {
    vars: { ...(env?.vars ?? {}), ...(input.overrides ?? {}) },
    environmentName: env?.name ?? null,
  };
}
