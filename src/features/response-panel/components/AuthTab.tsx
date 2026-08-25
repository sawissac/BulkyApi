'use client';

import type { Theme } from '@/lib/themes';
import type { ApiCall } from '@/lib/types';

type Props = { T: Theme; call: ApiCall };

function Dot({ color }: { color: string }) {
  return <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />;
}

export default function AuthTab({ T, call }: Props) {
  const auth = call.authInfo;
  const hasHeader = !!call.requestHeaders?.['Authorization'];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 6,
        border: `1px solid ${T.border}`,
      }}
    >
      <div style={{ padding: 8, background: T.bgHover }}>
        <div style={{ fontFamily: 'var(--font-title)', fontSize: 8, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.textDim, marginBottom: 6 }}>
          Auth Method
        </div>
        {auth ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: T.text }}>
                {auth.type}
              </span>
            </div>
            {'token' in auth && auth.token && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: T.text, wordBreak: 'break-all' }}>
                {auth.token.slice(0, 26)}{'•'.repeat(8)}
              </div>
            )}
            {'username' in auth && auth.username && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: T.text }}>
                User: {auth.username}
              </div>
            )}
          </div>
        ) : hasHeader ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Dot color={T.warn} />
            <span style={{ fontFamily: 'var(--font-description)', fontSize: 12, color: T.text }}>
              Auto-injected from environment
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Dot color="#475569" />
            <span style={{ fontFamily: 'var(--font-description)', fontSize: 11, color: T.textDim }}>
              No authentication
            </span>
          </div>
        )}
      </div>

      {hasHeader && (
        <div style={{ padding: 8, borderTop: `1px solid ${T.border}`, background: T.bgHover }}>
          <div style={{ fontFamily: 'var(--font-title)', fontSize: 8, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.textDim, marginBottom: 4 }}>
            Authorization Header
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: T.text, wordBreak: 'break-all' }}>
            {call.requestHeaders['Authorization'].slice(0, 50)}…
          </div>
        </div>
      )}
    </div>
  );
}
