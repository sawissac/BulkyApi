'use client';

import { Download, Upload, BarChart2, Copy, FileText } from 'lucide-react';
import type { Theme } from '@/lib/themes';

type Props = { T: Theme };

const FILE_ACTIONS = [
  {
    icon: Download,
    label: 'Save Script',
    sub: 'Export current script as .js',
    colorKey: 'success' as const,
  },
  {
    icon: Upload,
    label: 'Import Script',
    sub: 'Load a .js automation file',
    colorKey: 'cyan' as const,
  },
  {
    icon: BarChart2,
    label: 'Export Collection',
    sub: 'Save as JSON',
    colorKey: 'warn' as const,
  },
  {
    icon: Copy,
    label: 'Import from cURL',
    sub: 'Paste a curl command',
    colorKey: 'purple' as const,
  },
];

const RECENT_FILES = ['chain-users-posts.js', 'httpbin-auth.js', 'create-post.js'];

export default function FilePane({ T }: Props) {
  const colorMap: Record<string, string> = {
    success: T.success,
    cyan: T.cyan,
    warn: T.warn,
    purple: '#a78bfa',
  };

  return (
    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.textDim, display: 'block', marginBottom: 4 }}>
        File Actions
      </span>

      {FILE_ACTIONS.map((a, i) => {
        const color = colorMap[a.colorKey];
        const Icon = a.icon;
        return (
          <div
            key={i}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgHover, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${color}50`; e.currentTarget.style.background = `${color}0a`; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.bgHover; }}
          >
            <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={13} color={color} />
            </div>
            <div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 600, color: T.textBright }}>{a.label}</div>
              <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 9, color: T.textDim, marginTop: 1 }}>{a.sub}</div>
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 4, height: 1, background: T.border }} />
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.textDim }}>
        Recent
      </span>

      {RECENT_FILES.map((f, i) => (
        <div
          key={i}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', borderRadius: 6, cursor: 'pointer', transition: 'background 0.12s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.bgHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <FileText size={11} color={T.cyanDim} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: T.textDim }}>{f}</span>
        </div>
      ))}
    </div>
  );
}
