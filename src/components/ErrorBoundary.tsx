'use client';

import { Component, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { THEMES } from '@/lib/themes';
import { store } from '@/store';
import StatusScreen, { STATUS_ACTION } from '@/components/StatusScreen';

type Props = {
  /** Subtree the boundary guards. */
  children: ReactNode;
  /** Replaces the default screen. Pass one when the boundary guards a small
   *  region — the default fills the viewport. */
  fallback?: ReactNode;
};

type State = {
  /** The caught error, or `null` while the subtree is healthy. */
  error: Error | null;
};

/**
 * Catches a render error anywhere in its subtree and shows the app's own error
 * screen in place of the crashed tree.
 *
 * @remarks
 * Status: stable — Type: boundary
 *
 * State & behavior: `error` is set by `getDerivedStateFromError` and cleared by
 * Try again, which re-renders the children — a crash caused by transient state
 * recovers, one caused by the data itself throws straight back. The theme is
 * read from the store directly rather than through a hook, because the
 * fallback must render even where no Redux context is above it.
 *
 * Variants: `fallback` swaps the whole screen for caller-supplied UI.
 *
 * Composition: renders {@link StatusScreen} with the error message as its
 * detail block; the boundary itself renders nothing while healthy.
 *
 * Accessibility: inherited from {@link StatusScreen} — a `role="alert"` region
 * with a real button.
 *
 * Test ids: `error-boundary-retry-button`; the screen carries the
 * `error-boundary-*` ids {@link StatusScreen} derives.
 *
 * CSS classes: none — the shared action recipe over `app-*` theme tokens.
 *
 * Edge cases: React error boundaries catch render, lifecycle and constructor
 * errors only — an error thrown from an event handler or a promise never
 * reaches this. Script failures are not errors here either: the runner reports
 * those into the console panel.
 *
 * Dependencies: `lucide-react`, `@/components/StatusScreen`, `@/lib/themes`,
 * `@/store`.
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <BulkyApp />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const themeKey = store.getState().ui.theme;

    return (
      <StatusScreen
        testId="error-boundary"
        T={THEMES[themeKey] ?? THEMES.ocean}
        tone="error"
        code="500"
        title="A panel stopped rendering"
        description="Part of the workspace threw while rendering and was replaced by this screen. Trying again re-mounts it — your collections, environments and scripts stay as they were."
        meta="runtime error"
        detail={error.message || 'No message was attached to this error.'}
      >
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          data-testid="error-boundary-retry-button"
          className={STATUS_ACTION}
        >
          <RotateCcw size={13} aria-hidden="true" />
          Try again
        </button>
      </StatusScreen>
    );
  }
}
