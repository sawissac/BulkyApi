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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ padding: 12, borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgHover }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.textDim, marginBottom: 8 }}>
          Auth Method
        </div>
        {auth ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Dot color={T.success} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, color: T.textBright }}>
                {auth.type}
              </span>
            </div>
            {'token' in auth && auth.token && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: T.cyanDim, background: T.cyanFaint, border: `1px solid ${T.borderAccent}`, borderRadius: 5, padding: '4px 8px' }}>
                {auth.token.slice(0, 26)}{'•'.repeat(8)}
              </div>
            )}
            {'username' in auth && auth.username && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: T.text }}>
                User: {auth.username}
              </div>
            )}
          </div>
        ) : hasHeader ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Dot color={T.warn} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: T.text }}>
              Auto-injected from environment
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Dot color="#475569" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: T.textDim }}>
              No authentication
            </span>
          </div>
        )}
      </div>

      {hasHeader && (
        <div style={{ padding: 10, borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgHover }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.textDim, marginBottom: 5 }}>
            Authorization Header
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: T.cyanDim, wordBreak: 'break-all' }}>
            {call.requestHeaders['Authorization'].slice(0, 50)}…
          </div>
        </div>
      )}
    </div>
  );
}
