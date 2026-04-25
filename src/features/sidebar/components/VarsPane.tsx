'use client';

import { useSelector } from 'react-redux';
import type { Theme } from '@/lib/themes';
import { selectActiveEnv } from '@/store/environmentSlice';

type Props = { T: Theme };

const SENSITIVE_KEYS = ['token', 'key', 'Key', 'secret', 'password'];

function isSensitive(k: string) {
  return SENSITIVE_KEYS.some((s) => k.includes(s));
}

export default function VarsPane({ T }: Props) {
  const env = useSelector(selectActiveEnv);
  if (!env) return null;

  return (
    <div style={{ padding: '10px' }}>
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.textDim, display: 'block', marginBottom: 8 }}>
        {env.name} Variables
      </span>
      {Object.entries(env.vars).map(([k, v]) => (
        <div key={k} style={{ marginBottom: 5, borderRadius: 6, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '3px 8px', background: T.bgHover, borderBottom: `1px solid ${T.border}` }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: T.cyan }}>{`{{${k}}}`}</span>
          </div>
          <div style={{ padding: '3px 8px' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: T.textDim }}>
              {isSensitive(k) ? '•'.repeat(Math.min(v.length, 18)) : v}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
