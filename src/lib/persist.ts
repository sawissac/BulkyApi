import localforage from 'localforage';

const KEY = 'bulky-v1';
const MAX_RESPONSE_BYTES = 50_000;

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

let _timer: ReturnType<typeof setTimeout>;

export function scheduleSave(state: Record<string, unknown>): void {
  clearTimeout(_timer);
  _timer = setTimeout(() => {
    const { collections, editor, ui, runner } = state as Record<string, unknown>;
    const r = runner as Record<string, unknown> | undefined;
    // Only persist stable runner fields — skip transient running/paused/logs; cap large responses
    const runnerPersist = r
      ? {
          builtCalls: capCalls(r.builtCalls),
          callsByItemId: Object.fromEntries(
            Object.entries((r.callsByItemId as Record<string, unknown>) ?? {}).map(
              ([id, calls]) => [id, capCalls(calls)]
            )
          ),
          currentItemId: r.currentItemId,
        }
      : undefined;
    localforage.setItem(KEY, { collections, editor, ui, runner: runnerPersist }).catch(() => {});
  }, 400);
}
