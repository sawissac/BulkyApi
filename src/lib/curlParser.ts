// Minimal curl → bulky-api script translator.
// Handles: -X/--request, -H/--header, -d/--data/--data-raw/--data-binary, --url, positional URL.

type ParsedCurl = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
};

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  const s = input.trim().replace(/\\\n/g, ' ');
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++;
    if (i >= s.length) break;
    const ch = s[i];
    if (ch === "'" || ch === '"') {
      const quote = ch;
      i++;
      let buf = '';
      while (i < s.length && s[i] !== quote) {
        if (s[i] === '\\' && s[i + 1] === quote) { buf += quote; i += 2; }
        else { buf += s[i]; i++; }
      }
      i++;
      tokens.push(buf);
    } else {
      let buf = '';
      while (i < s.length && !/\s/.test(s[i])) { buf += s[i]; i++; }
      tokens.push(buf);
    }
  }
  return tokens;
}

export function parseCurl(input: string): ParsedCurl | null {
  const tokens = tokenize(input);
  if (!tokens.length) return null;
  if (tokens[0].toLowerCase() === 'curl') tokens.shift();

  let method = '';
  let url = '';
  const headers: Record<string, string> = {};
  let body: string | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if ((t === '-X' || t === '--request') && tokens[i + 1]) { method = tokens[++i].toUpperCase(); continue; }
    if ((t === '-H' || t === '--header') && tokens[i + 1]) {
      const h = tokens[++i];
      const idx = h.indexOf(':');
      if (idx > 0) headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
      continue;
    }
    if ((t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary' || t === '--data-ascii') && tokens[i + 1]) {
      body = tokens[++i];
      continue;
    }
    if (t === '--url' && tokens[i + 1]) { url = tokens[++i]; continue; }
    if (t === '-u' || t === '--user') { i++; continue; }
    if (t === '-b' || t === '--cookie') { i++; continue; }
    if (t.startsWith('-')) {
      // Skip unknown flags. If the next token is a value (no leading dash), skip it too.
      if (tokens[i + 1] && !tokens[i + 1].startsWith('-') && !/^https?:/i.test(tokens[i + 1])) i++;
      continue;
    }
    if (!url && /^https?:\/\//i.test(t)) url = t;
  }

  if (!url) return null;
  if (!method) method = body ? 'POST' : 'GET';
  return { method, url, headers, body };
}

export function curlToScript(parsed: ParsedCurl): string {
  const m = parsed.method.toLowerCase();
  const headerEntries = Object.keys(parsed.headers);
  const optsParts: string[] = [];
  if (headerEntries.length) optsParts.push(`headers: ${JSON.stringify(parsed.headers)}`);
  const optsStr = optsParts.length ? `, { ${optsParts.join(', ')} }` : '';

  let bodyJs = 'null';
  if (parsed.body !== null) {
    try {
      const parsedBody = JSON.parse(parsed.body);
      bodyJs = JSON.stringify(parsedBody, null, 2);
    } catch {
      bodyJs = JSON.stringify(parsed.body);
    }
  }

  if (m === 'get' || m === 'delete' || m === 'options' || m === 'head') {
    return `const r = await api.${m}('${parsed.url}'${optsStr});\nconsole.log(r.status, r.data);\n`;
  }
  return `const r = await api.${m}('${parsed.url}', ${bodyJs}${optsStr});\nconsole.log(r.status, r.data);\n`;
}
