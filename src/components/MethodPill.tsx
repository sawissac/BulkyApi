'use client';

import { METHOD_CLR } from '@/lib/themes';

type Props = {
  method: string;
  sm?: boolean;
};

export default function MethodPill({ method, sm }: Props) {
  const color = METHOD_CLR[method] || '#94a3b8';
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: sm ? 8 : 10,
        fontWeight: 700,
        letterSpacing: '0.04em',
        color,
        background: `${color}18`,
        border: `1px solid ${color}30`,
        padding: sm ? '1px 4px' : '2px 7px',
        borderRadius: 4,
        flexShrink: 0,
      }}
    >
      {method}
    </span>
  );
}
