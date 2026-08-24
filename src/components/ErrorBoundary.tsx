'use client';

import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', gap: 12, background: '#0a0e1a', color: '#94a3b8',
          fontFamily: 'var(--font-mono)',
        }}>
          <span style={{ fontSize: 13, color: '#f87171' }}>Runtime error</span>
          <pre style={{ fontSize: 11, color: '#64748b', maxWidth: 600, whiteSpace: 'pre-wrap', textAlign: 'center' }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: 8, padding: '6px 16px', borderRadius: 8,
              border: '1px solid #1e3a5f', background: 'transparent',
              color: '#67e8f9', fontSize: 11, cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
