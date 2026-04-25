'use client';

import type { Theme } from '@/lib/themes';
import type { ApiCall } from '@/lib/types';
import KVRow from '@/components/KVRow';

type Props = { T: Theme; call: ApiCall };

export default function PayloadTab({ T, call }: Props) {
  const label = (text: string) => (
    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.textDim, marginBottom: 6 }}>
      {text}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        {label('Request Headers')}
        {Object.entries(call.requestHeaders || {}).map(([k, v]) => (
          <KVRow key={k} T={T} k={k} v={v} masked={k.toLowerCase() === 'authorization'} />
        ))}
      </div>
      {!!call.requestBody && (
        <div>
          {label('Request Body')}
          <pre style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: T.text, whiteSpace: 'pre-wrap', background: T.bgHover, border: `1px solid ${T.border}`, borderRadius: 6, padding: 10 }}>
            {JSON.stringify(call.requestBody, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
