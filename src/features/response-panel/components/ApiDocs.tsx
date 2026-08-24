import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Theme } from '@/lib/themes';
import type { ApiCall } from '@/lib/types';
import { Copy, FileText, FileCode2 } from 'lucide-react';

type Props = {
  T: Theme;
  calls: ApiCall[];
};

export default function ApiDocs({ T, calls }: Props) {
  const [viewMode, setViewMode] = useState<'view' | 'raw'>('view');

  const markdown = useMemo(() => {
    if (calls.length === 0) return '# API Documentation\n\nNo API calls found.';

    let md = '# API Documentation\n\n';

    calls.forEach((c) => {
      md += `## ${c.method} ${c.urlExpr}\n\n`;
      md += `**Resolved URL:** \`${c.url}\`\n\n`;
      
      if (c.status === 'success' || c.status === 'error') {
        md += `**Status:** ${c.statusCode} ${c.status === 'success' ? '✅' : '❌'}\n\n`;
        md += `**Duration:** ${c.duration}ms\n\n`;
        
        if (c.requestHeaders && Object.keys(c.requestHeaders).length > 0) {
          md += `### Request Headers\n\n\`\`\`json\n${JSON.stringify(c.requestHeaders, null, 2)}\n\`\`\`\n\n`;
        }
        
        if (c.requestBody) {
          md += `### Request Body\n\n\`\`\`json\n${JSON.stringify(c.requestBody, null, 2)}\n\`\`\`\n\n`;
        }
        
        if (c.responseHeaders && Object.keys(c.responseHeaders).length > 0) {
          md += `### Response Headers\n\n\`\`\`json\n${JSON.stringify(c.responseHeaders, null, 2)}\n\`\`\`\n\n`;
        }
        
        if (c.response !== null) {
          md += `### Response Body\n\n\`\`\`json\n${JSON.stringify(c.response, null, 2)}\n\`\`\`\n\n`;
        }
        
        if (c.error) {
          md += `### Error\n\n\`\`\`\n${c.error}\n\`\`\`\n\n`;
        }
      } else {
        md += `**Status:** Pending / Not Executed ⏳\n\n`;
      }
      md += '---\n\n';
    });

    return md;
  }, [calls]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', padding: '8px 12px', gap: 6, borderBottom: `1px solid ${T.border}`, alignItems: 'center' }}>
        <button
          onClick={() => setViewMode('view')}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6,
            background: viewMode === 'view' ? T.bgSelected : 'transparent',
            border: `1px solid ${viewMode === 'view' ? T.borderAccent : 'transparent'}`,
            color: viewMode === 'view' ? T.cyan : T.textDim,
            cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700
          }}
        >
          <FileText size={12} /> View
        </button>
        <button
          onClick={() => setViewMode('raw')}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6,
            background: viewMode === 'raw' ? T.bgSelected : 'transparent',
            border: `1px solid ${viewMode === 'raw' ? T.borderAccent : 'transparent'}`,
            color: viewMode === 'raw' ? T.cyan : T.textDim,
            cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700
          }}
        >
          <FileCode2 size={12} /> Raw
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => navigator.clipboard.writeText(markdown)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, background: T.bgHover, border: `1px solid ${T.border}`, color: T.textBright, cursor: 'pointer', fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700 }}
        >
          <Copy size={12} /> Copy Markdown
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', color: T.textBright, fontFamily: viewMode === 'raw' ? 'var(--font-mono)' : 'var(--font-display)' }}>
        {viewMode === 'raw' ? (
          <pre style={{ margin: 0, fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: T.textDim }}>
            {markdown}
          </pre>
        ) : (
          <div className="prose prose-invert max-w-none" style={{ fontSize: 12 }}>
            <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <h1 style={{ color: T.cyan, fontSize: '1.5em', marginTop: '0.5em', marginBottom: '1em', fontWeight: 'bold' }} {...props} />,
                h2: ({node, ...props}) => <h2 style={{ color: T.textBright, fontSize: '1.2em', marginTop: '1.5em', marginBottom: '0.5em', borderBottom: `1px solid ${T.border}`, paddingBottom: '4px', fontWeight: 'bold' }} {...props} />,
                h3: ({node, ...props}) => <h3 style={{ color: T.textBright, fontSize: '1.1em', marginTop: '1em', marginBottom: '0.5em', fontWeight: 'bold' }} {...props} />,
                p: ({node, ...props}) => <p style={{ marginBottom: '1em', lineHeight: 1.6 }} {...props} />,
                pre: ({node, ...props}) => <pre style={{ background: T.bgHover, padding: '12px', borderRadius: '8px', overflowX: 'auto', marginBottom: '1em', border: `1px solid ${T.border}` }} {...props} />,
                code: ({node, className, children, ...props}) => {
                  const match = /language-(\w+)/.exec(className || '')
                  return match ? (
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9em' }} {...props}>
                      {children}
                    </code>
                  ) : (
                    <code style={{ background: T.bgHover, padding: '2px 4px', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.9em', border: `1px solid ${T.border}` }} {...props}>
                      {children}
                    </code>
                  )
                },
                hr: ({node, ...props}) => <hr style={{ borderColor: T.border, margin: '2em 0' }} {...props} />
              }}
            >
              {markdown}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
