'use client';

import { useDispatch, useSelector } from 'react-redux';
import type { Theme } from '@/lib/themes';
import { selectEnvironments, selectEnvIdx, setEnvIdx } from '@/store/environmentSlice';

type Props = { T: Theme };

export default function EnvPane({ T }: Props) {
  const dispatch = useDispatch();
  const environments = useSelector(selectEnvironments);
  const envIdx = useSelector(selectEnvIdx);

  return (
    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.textDim, display: 'block', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        Active Environment
      </span>
      {environments.map((env, i) => (
        <div
          key={env.id}
          onClick={() => dispatch(setEnvIdx(i))}
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            border: `1px solid ${i === envIdx ? T.borderAccent : T.border}`,
            background: i === envIdx ? T.bgSelected : 'transparent',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: i === envIdx ? T.cyan : T.textDim, flexShrink: 0, transition: 'background 0.15s' }} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 600, color: i === envIdx ? T.textBright : T.text }}>
              {env.name}
            </span>
          </div>
          <div style={{ marginTop: 3, fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: T.textDim, paddingLeft: 13 }}>
            {Object.keys(env.vars).length} variables
          </div>
        </div>
      ))}
    </div>
  );
}
