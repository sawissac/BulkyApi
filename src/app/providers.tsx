'use client';

import { Provider } from 'react-redux';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useEffect } from 'react';
import { store } from '@/store';
import { loadPersistedState } from '@/lib/persist';
import { hydrateCollections } from '@/store/collectionsSlice';
import { hydrateEditor } from '@/store/editorSlice';
import { hydrateUi } from '@/store/uiSlice';
import { hydrateRunner } from '@/store/runnerSlice';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { Collection, Environment } from '@/lib/sampleData';

function ServiceWorkerRegister() {
  useServiceWorker();
  return null;
}

function HydrateStore() {
  useEffect(() => {
    loadPersistedState().then((saved) => {
      if (!saved) return;
      
      // Migration: moving global environments to collections
      const collectionsState: any = saved.collections || { collections: [] };
      const envState: any = saved.environment;
      if (envState && envState.environments && envState.environments.length > 0) {
        collectionsState.collections.forEach((col: Collection) => {
          if (!col.environments || col.environments.length === 0) {
            col.environments = JSON.parse(JSON.stringify(envState.environments));
            col.envIdx = envState.envIdx || 0;
          }
        });
      }

      if (saved.collections || saved.environment) store.dispatch(hydrateCollections(collectionsState));
      if (saved.editor) store.dispatch(hydrateEditor(saved.editor as Parameters<typeof hydrateEditor>[0]));
      if (saved.ui) store.dispatch(hydrateUi(saved.ui as Parameters<typeof hydrateUi>[0]));
      if (saved.runner) store.dispatch(hydrateRunner(saved.runner as Parameters<typeof hydrateRunner>[0]));
    });
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
