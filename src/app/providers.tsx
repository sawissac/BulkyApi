'use client';

import { Provider } from 'react-redux';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useEffect } from 'react';
import { store } from '@/store';
import { loadPersistedState } from '@/lib/persist';
import { hydrateCollections } from '@/store/collectionsSlice';
import { hydrateEnvironment } from '@/store/environmentSlice';
import { hydrateEditor } from '@/store/editorSlice';
import { hydrateUi } from '@/store/uiSlice';
import { hydrateRunner } from '@/store/runnerSlice';

function HydrateStore() {
  useEffect(() => {
    loadPersistedState().then((saved) => {
      if (!saved) return;
      if (saved.collections) store.dispatch(hydrateCollections(saved.collections as Parameters<typeof hydrateCollections>[0]));
      if (saved.environment) store.dispatch(hydrateEnvironment(saved.environment as Parameters<typeof hydrateEnvironment>[0]));
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
      <ErrorBoundary>{children}</ErrorBoundary>
    </Provider>
  );
}
