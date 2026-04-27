import localforage from 'localforage';

const KEY = 'bulky-v1';

export async function loadPersistedState(): Promise<Record<string, unknown> | undefined> {
  try {
    const saved = await localforage.getItem<Record<string, unknown>>(KEY);
    return saved ?? undefined;
  } catch {
    return undefined;
  }
}

let _timer: ReturnType<typeof setTimeout>;

export function scheduleSave(state: Record<string, unknown>): void {
  clearTimeout(_timer);
  _timer = setTimeout(() => {
    const { collections, environment, editor, ui, runner } = state as Record<string, unknown>;
    // Only persist stable runner fields — skip transient running/paused/logs
    const runnerPersist = runner
      ? (({ builtCalls, callsByItemId, currentItemId }: Record<string, unknown>) =>
          ({ builtCalls, callsByItemId, currentItemId }))(runner as Record<string, unknown>)
      : undefined;
    localforage.setItem(KEY, { collections, environment, editor, ui, runner: runnerPersist }).catch(() => {});
  }, 400);
}
