'use client';

import { Provider } from 'react-redux';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useEffect } from 'react';
import { store } from '@/store';
import {
  clearPersistedState,
  closeRemoteSync,
  flushRemote,
  loadPersistedState,
  openRemoteSync,
} from '@/lib/persist';
import { hydrateCollections } from '@/store/collectionsSlice';
import { hydrateEditor } from '@/store/editorSlice';
import { hydrateUi } from '@/store/uiSlice';
import { hydrateRunner } from '@/store/runnerSlice';
import { clearSession, setConfigured, setSession, setSyncStatus } from '@/store/authSlice';
import { getSupabaseBrowser, isSupabaseConfigured } from '@/lib/supabase/client';
import { pullRemoteState, type PersistedShape } from '@/lib/supabase/sync';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { Collection, Environment } from '@/lib/sampleData';

/** Pre-migration blob shape, back when environments were global rather than
 *  owned by a collection. Only ever read, never written. */
type LegacyEnvState = { environments?: Environment[]; envIdx?: number };

function ServiceWorkerRegister() {
  useServiceWorker();
  return null;
}

function applySnapshot(saved: Record<string, unknown> | PersistedShape) {
  const s = saved as Record<string, unknown>;
  if (s.collections) {
    store.dispatch(hydrateCollections(s.collections as Parameters<typeof hydrateCollections>[0]));
  }
  if (s.editor) store.dispatch(hydrateEditor(s.editor as Parameters<typeof hydrateEditor>[0]));
  if (s.ui) store.dispatch(hydrateUi(s.ui as Parameters<typeof hydrateUi>[0]));
  if (s.runner) store.dispatch(hydrateRunner(s.runner as Parameters<typeof hydrateRunner>[0]));
}

/**
 * Loads the local cache, then reconciles it against Supabase.
 *
 * @remarks
 * Status: stable — Type: side-effect component (renders nothing)
 *
 * State & behavior: runs once on mount. The localforage blob is applied first
 * so the app paints its real content immediately and works with no network;
 * the remote pull then overwrites it when the account has data. Remote pushes
 * stay closed until that pull resolves — an empty local cache pushed ahead of
 * the pull would tell `sync_state` to delete the account's rows.
 *
 * A signed-in account with no rows yet is treated as first sign-in: whatever
 * is in this browser is uploaded rather than discarded, so local work survives
 * the moment an anonymous user creates an account.
 *
 * The `environment` key handled below is a legacy blob shape — environments
 * used to be global before they moved onto each collection.
 *
 * Edge cases: with no Supabase env vars the app stays local-only and this
 * component does nothing beyond the localforage load. `SIGNED_OUT` drops the
 * local cache so a shared browser does not leak the previous account's
 * collections into the next session.
 */
function HydrateStore() {
  useEffect(() => {
    let cancelled = false;

    const syncFromRemote = async () => {
      store.dispatch(setSyncStatus('pulling'));
      const remote = await pullRemoteState();
      if (cancelled) return;

      if (remote) {
        applySnapshot(remote);
        openRemoteSync();
        store.dispatch(setSyncStatus('synced'));
        return;
      }

      openRemoteSync();
      const ok = await flushRemote(store.getState() as Record<string, unknown>);
      if (!cancelled) store.dispatch(setSyncStatus(ok ? 'synced' : 'error'));
    };

    const boot = async () => {
      const saved = await loadPersistedState();
      if (cancelled) return;

      if (saved) {
        const collectionsState = (saved.collections ?? { collections: [] }) as Parameters<
          typeof hydrateCollections
        >[0];
        const envState = saved.environment as LegacyEnvState | undefined;
        if (envState?.environments?.length) {
          collectionsState.collections.forEach((col: Collection) => {
            if (!col.environments || col.environments.length === 0) {
              col.environments = JSON.parse(JSON.stringify(envState.environments));
              col.envIdx = envState.envIdx || 0;
            }
          });
        }
        if (saved.collections || saved.environment) {
          store.dispatch(hydrateCollections(collectionsState));
        }
        if (saved.editor) store.dispatch(hydrateEditor(saved.editor as Parameters<typeof hydrateEditor>[0]));
        if (saved.ui) store.dispatch(hydrateUi(saved.ui as Parameters<typeof hydrateUi>[0]));
        if (saved.runner) store.dispatch(hydrateRunner(saved.runner as Parameters<typeof hydrateRunner>[0]));
      }

      const configured = isSupabaseConfigured();
      store.dispatch(setConfigured(configured));
      if (!configured) return;

      const supabase = getSupabaseBrowser();
      if (!supabase) return;

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data.session?.user) {
        store.dispatch(
          setSession({ userId: data.session.user.id, email: data.session.user.email ?? null })
        );
        await syncFromRemote();
      } else {
        store.dispatch(clearSession());
      }
    };

    boot();

    const supabase = isSupabaseConfigured() ? getSupabaseBrowser() : null;
    const { data: sub } = supabase?.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        store.dispatch(setSession({ userId: session.user.id, email: session.user.email ?? null }));
        syncFromRemote();
      }
      if (event === 'SIGNED_OUT') {
        closeRemoteSync();
        store.dispatch(clearSession());
        clearPersistedState();
      }
    }) ?? { data: null };

    return () => {
      cancelled = true;
      sub?.subscription.unsubscribe();
    };
  }, []);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <HydrateStore />
      <ServiceWorkerRegister />
      <ErrorBoundary>{children}</ErrorBoundary>
    </Provider>
  );
}
