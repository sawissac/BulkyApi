import type { ApiCall } from './types';

export function analyzeScript(code: string, envVars: Record<string, string> = {}): ApiCall[] {
  const calls: ApiCall[] = [];
  const re = /await\s+api\.(get|post|put|patch|delete|options)\s*\(/gi;
  let m: RegExpExecArray | null;

  while ((m = re.exec(code)) !== null) {
    const method = m[1].toUpperCase();
    const after = code.slice(m.index + m[0].length);

    let urlExpr = '';
    let depth = 0;
    let inStr = false;
    let strCh = '';

    for (let i = 0; i < after.length; i++) {
      const ch = after[i];
      const prev = after[i - 1];
      if (!inStr && (ch === "'" || ch === '"' || ch === '`')) {
        inStr = true; strCh = ch; urlExpr += ch; continue;
      }
      if (inStr && ch === strCh && prev !== '\\') {
        inStr = false; urlExpr += ch; continue;
      }
      if (inStr) { urlExpr += ch; continue; }
      if (ch === ',' && depth === 0) break;
      if (ch === ')' && depth === 0) break;
      if ('([{'.includes(ch)) depth++;
      if (')]}'.includes(ch)) depth--;
      urlExpr += ch;
    }

    urlExpr = urlExpr.trim();
    let url = urlExpr;
    if (/^['"`]/.test(url) && url.length > 1) url = url.slice(1, -1);
    url = url.replace(/\$\{env\.(\w+)\}/g, (_, k) => envVars[k] || `[${k}]`);
    url = url.replace(/env\.(\w+)/g, (_, k) => envVars[k] || `[${k}]`);
    url = url.replace(/[`'"]\s*\+\s*[`'"]/g, '');
    url = url.replace(/\s*\+\s*/g, '');
    url = url.replace(/[`'"]/g, '');

    calls.push({
      idx: calls.length,
      method,
      url,
      urlExpr,
      status: 'idle',
      statusCode: null,
      response: null,
      responseHeaders: {},
      requestBody: null,
      requestHeaders: {},
      authInfo: null,
      duration: 0,
      error: null,
      timestamp: null,
    });
  }

  return calls;
}
