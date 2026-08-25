import localforage from 'localforage';
import { buildSnapshot, pushRemoteState } from '@/lib/supabase/sync';

const KEY = 'bulky-v1';
const MAX_RESPONSE_BYTES = 50_000;
const LOCAL_DEBOUNCE_MS = 400;
const REMOTE_DEBOUNCE_MS = 1_500;

export async function loadPersistedState(): Promise<Record<string, unknown> | undefined> {
  try {
    const saved = await localforage.getItem<Record<string, unknown>>(KEY);
    return saved ?? undefined;
  } catch {
    return undefined;
  }
}

function capCall(call: Record<string, unknown>): Record<string, unknown> {
  const resp = call.response;
  if (typeof resp === 'string' && resp.length > MAX_RESPONSE_BYTES) {
    return { ...call, response: resp.slice(0, MAX_RESPONSE_BYTES) + '…[truncated for storage]' };
  }
  if (resp !== null && typeof resp === 'object') {
    try {
      if (JSON.stringify(resp).length > MAX_RESPONSE_BYTES) {
        return { ...call, response: '[response too large to persist]' };
      }
    } catch {
      return { ...call, response: '[response not serializable]' };
    }
  }
  return call;
}

function capCalls(calls: unknown): unknown {
  if (!Array.isArray(calls)) return calls;
  return calls.map((c) => (c && typeof c === 'object' ? capCall(c as Record<string, unknown>) : c));
}

/**
 * Strips transient runner fields and caps oversized responses. The result
 * feeds both localforage and Supabase, so a response too large for IndexedDB
 * is never shipped to Postgres either.
 */
function buildPayload(state: Record<string, unknown>): Record<string, unknown> {
  const { collections, editor, ui, runner } = state;
  const r = runner as Record<string, unknown> | undefined;
  const runnerPersist = r
    ? {
        builtCalls: capCalls(r.builtCalls),
        callsByItemId: Object.fromEntries(
          Object.entries((r.callsByItemId as Record<string, unknown>) ?? {}).map(([id, calls]) => [
            id,
            capCalls(calls),
          ])
        ),
        currentItemId: r.currentItemId,
      }
    : undefined;

  return { collections, editor, ui, runner: runnerPersist };
}

let _localTimer: ReturnType<typeof setTimeout>;
let _remoteTimer: ReturnType<typeof setTimeout>;
let _remoteReady = false;

/**
 * Opens the gate on remote pushes. Until this is called, saves stay local-only.
 *
 * This is load-bearing, not an optimization: hydrating from localforage
 * dispatches actions, which schedules a save. On a second device that local
 * cache is empty, so an ungated push would send an empty snapshot to
 * `sync_state` — which reconciles by deletion — and destroy the account's data
 * before the pull that was going to populate it ever resolved.
 */
export function openRemoteSync(): void {
  _remoteReady = true;
}

/** Closes the gate again — used on sign-out. */
export function closeRemoteSync(): void {
  _remoteReady = false;
  clearTimeout(_remoteTimer);
}

/**
 * Write-through save: localforage on a short debounce so the app stays instant
 * and fully usable offline, Supabase on a longer one because it costs a round
 * trip. A failed remote push leaves the local copy authoritative until the
 * next save succeeds.
 */
export function scheduleSave(state: Record<string, unknown>): void {
  clearTimeout(_localTimer);
  _localTimer = setTimeout(() => {
    localforage.setItem(KEY, buildPayload(state)).catch(() => {});
  }, LOCAL_DEBOUNCE_MS);

  if (!_remoteReady) return;

  clearTimeout(_remoteTimer);
  _remoteTimer = setTimeout(() => {
    pushRemoteState(buildSnapshot(buildPayload(state))).catch(() => {});
  }, REMOTE_DEBOUNCE_MS);
}

/**
 * Forces an immediate remote push, bypassing the debounce and the gate — used
 * on sign-in to upload local work the account has never seen.
 */
export async function flushRemote(state: Record<string, unknown>): Promise<boolean> {
  clearTimeout(_remoteTimer);
  try {
    return await pushRemoteState(buildSnapshot(buildPayload(state)));
  } catch {
    return false;
  }
}

/** Clears the local cache so a signed-out session leaves nothing behind. */
export async function clearPersistedState(): Promise<void> {
  clearTimeout(_localTimer);
  closeRemoteSync();
  try {
    await localforage.removeItem(KEY);
  } catch {
    // Nothing actionable — the cache is best-effort.
  }
}
