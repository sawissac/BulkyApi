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
    const { collections, environment, editor, ui } = state as Record<string, unknown>;
    localforage.setItem(KEY, { collections, environment, editor, ui }).catch(() => {});
  }, 400);
}
