/** How a response body should be rendered in the Response tab. `json` covers
 *  both parsed objects and JSON-shaped strings; everything else is text the
 *  tree viewer would only mangle. */
export type ResponseKind = "json" | "xml" | "html" | "image" | "text";

function contentType(headers: Record<string, string>): string {
  for (const [k, v] of Object.entries(headers ?? {})) {
    if (k.toLowerCase() === "content-type") return v.toLowerCase();
  }
  return "";
}

/**
 * Classifies a response body from its value and its `Content-Type`. A non-string
 * `response` is already-parsed JSON. A string is sniffed: header first, then a
 * cheap shape check for XML / HTML.
 */
export function detectResponseKind(
  response: unknown,
  headers: Record<string, string> = {},
): ResponseKind {
  const ct = contentType(headers);
  if (ct.startsWith("image/")) return "image";
  if (typeof response !== "string") return "json";

  const s = response.trim();
  if (!s) return "text";
  if (ct.includes("json")) return "json";
  if (ct.includes("html") || /^<!doctype html/i.test(s) || /^<html[\s>]/i.test(s)) {
    return "html";
  }
  if (
    ct.includes("xml") ||
    /^<\?xml/i.test(s) ||
    (/^<[a-z!]/i.test(s) && /<\/[a-z][\w:-]*>\s*$/i.test(s))
  ) {
    return "xml";
  }
  return "text";
}

/**
 * Indents XML / HTML markup one level per open tag. Not a validating parser —
 * it splits on tag boundaries and tracks depth, which is enough to make a
 * one-line response readable.
 */
export function formatMarkup(src: string): string {
  const withBreaks = src.replace(/>\s*</g, ">\n<").trim();
  const selfClosing = /\/>$/;
  const openTag = /^<[^!?/][^>]*[^/]?>$/;
  const closeTag = /^<\//;

  let depth = 0;
  return withBreaks
    .split("\n")
    .map((raw) => {
      const line = raw.trim();
      if (closeTag.test(line)) depth = Math.max(depth - 1, 0);
      const out = "  ".repeat(depth) + line;
      if (openTag.test(line) && !selfClosing.test(line) && !closeTag.test(line)) {
        depth += 1;
      }
      return out;
    })
    .join("\n");
}
