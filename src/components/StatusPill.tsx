'use client';

import { statusColor, THEMES } from '@/lib/themes';

type Props = {
  code: number | null;
};

export default function StatusPill({ code }: Props) {
  const T = THEMES.ocean;
  const c = statusColor(code, T);
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        fontWeight: 700,
        color: c,
        background: `${c}18`,
        border: `1px solid ${c}30`,
        padding: '2px 7px',
        borderRadius: 4,
      }}
    >
      {code || '···'}
    </span>
  );
}
