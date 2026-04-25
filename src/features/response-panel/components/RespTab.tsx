'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import type { ApiCall } from '@/lib/types';
import JNode from '@/components/JsonTreeViewer';

type Props = { T: Theme; call: ApiCall };

export default function RespTab({ T, call }: Props) {
  const [raw, setRaw] = useState(false);

  if (call.status === 'pending') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.textDim }}>
        <Loader2 size={12} style={{ animation: 'spin 0.7s linear infinite' }} color={T.cyan} />
        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: 12 }}>Awaiting response…</span>
      </div>
    );
  }

  if (call.error && !call.response) {
    return (
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: T.error, background: `${T.error}10`, border: `1px solid ${T.error}30`, borderRadius: 6, padding: 10 }}>
        {call.error}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 7 }}>
        <button
          onClick={() => setRaw(!raw)}
          style={{ padding: '2px 10px', borderRadius: 9999, border: `1px solid ${T.border}`, background: 'transparent', color: T.textDim, fontFamily: "'Space Grotesk', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer' }}
        >
          {raw ? 'PRETTY' : 'RAW'}
        </button>
      </div>
      {raw
        ? (
          <pre style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: T.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: T.bgHover, border: `1px solid ${T.border}`, borderRadius: 6, padding: 10 }}>
            {JSON.stringify(call.response, null, 2)}
          </pre>
        )
        : (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.7 }}>
            <JNode data={call.response} T={T} />
          </div>
        )}
    </div>
  );
}
