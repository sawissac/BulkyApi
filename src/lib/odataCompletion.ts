/**
 * OData v4 completion vocabulary for the script editor.
 *
 * OData lives inside URL strings — `api.get("{{base}}/People?$filter=...")` —
 * where the TypeScript language service has nothing to offer, so the editor
 * needs its own provider. This module holds the Monaco-free half of it: where a
 * string literal starts, which OData context the caret sits in, and what to
 * offer there. `MonacoCodeEditor` maps the result onto Monaco completion items.
 */

/** Item flavor, mapped to a Monaco `CompletionItemKind` by the caller. */
export type OdataItemKind =
  | "keyword"
  | "operator"
  | "function"
  | "value"
  | "snippet";

export type OdataItem = {
  label: string;
  /** Text to insert; carries `${n:...}` placeholders when `snippet` is set. */
  insertText: string;
  kind: OdataItemKind;
  detail: string;
  documentation?: string;
  /** `insertText` is a snippet template, not literal text. */
  snippet?: boolean;
};

/**
 * Where the caret sits inside an OData URL.
 *
 * `option` — a system query option name is expected (`?`, `&`, `;`, `(`).
 * `path` — a `$`-prefixed path segment (`/$metadata`, `/$count`).
 * `expression` — a `$filter` / `$compute` / `$apply` value.
 * `none` — nothing OData-shaped to offer.
 */
export type OdataContext =
  | "option"
  | "path"
  | "expression"
  | "orderby"
  | "search"
  | "boolean"
  | "format"
  | "expand"
  | "none";

type StringFrame = { quote: "'" | '"' | "`"; start: number };

/**
 * The string literal the caret is inside, or `null` when it is in code.
 *
 * Runs a small lexer over the buffer up to `offset` so template literals that
 * span lines are tracked as accurately as single-line quotes; comments are
 * skipped, escapes consumed, and a `${...}` hole inside a template counts as
 * code (a nested string inside the hole is found again, one frame deeper). An
 * unterminated single- or double-quoted string ends at the newline, matching
 * how the tokenizer recovers.
 *
 * @param text - Full buffer.
 * @param offset - Caret offset into `text`.
 * @returns Quote character and the offset of the first content character.
 */
export function stringLiteralAt(
  text: string,
  offset: number,
): StringFrame | null {
  const stack: (StringFrame | "expr")[] = [];
  let i = 0;
  while (i < offset) {
    const top = stack[stack.length - 1];
    const c = text[i];

    if (top && top !== "expr") {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === top.quote) {
        stack.pop();
        i += 1;
        continue;
      }
      if (c === "\n" && top.quote !== "`") {
        stack.pop();
        i += 1;
        continue;
      }
      if (c === "$" && top.quote === "`" && text[i + 1] === "{") {
        stack.push("expr");
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (c === "}" && top === "expr") {
      stack.pop();
      i += 1;
      continue;
    }
    if (c === "/" && text[i + 1] === "/") {
      const nl = text.indexOf("\n", i);
      i = nl === -1 ? offset : nl + 1;
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end === -1 ? offset : end + 2;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      stack.push({ quote: c, start: i + 1 });
      i += 1;
      continue;
    }
    i += 1;
  }

  const top = stack[stack.length - 1];
  return top && top !== "expr" ? top : null;
}

/** Length of the partial word before the caret — the range a completion replaces. */
export function odataWordLength(before: string): number {
  return (before.match(/[$A-Za-z0-9_]*$/) ?? [""])[0].length;
}

/**
 * Whether the string looks like a service URL rather than prose or a payload.
 *
 * `$` is common in strings that have nothing to do with OData — JSONPath
 * (`$..items`), jq programs, shell-style `$VAR` templates — so a lone `$` is
 * not enough to open the widget. The string also has to read like a URL:
 * absolute, environment-templated, or root-relative.
 */
function urlShaped(before: string): boolean {
  return (
    /^\s*(https?:|\{\{|\/)/.test(before) || /^\s*[A-Za-z][\w.-]*\//.test(before)
  );
}

/**
 * Classifies the caret position within the string content typed so far.
 *
 * Completions stay silent unless the string is {@link urlShaped} and either the
 * word being typed starts with `$` or the caret is past a `?`. A word preceded
 * by `.` is left alone whatever the context — that is property or JSONPath
 * syntax (`$..Id`, `data.name`), never an OData operator position.
 *
 * @param before - String-literal content from its first character to the caret.
 */
export function odataContextAt(before: string): OdataContext {
  const word = (before.match(/[$A-Za-z0-9_]*$/) ?? [""])[0];
  const rest = before.slice(0, before.length - word.length);
  const typedOption = word.startsWith("$");
  const query = rest.lastIndexOf("?");

  if (!urlShaped(before)) return "none";
  if (rest.endsWith(".")) return "none";
  if (typedOption && rest.endsWith("/")) return "path";
  if (query < 0 && !typedOption) return "none";
  if (/[?&;(]$/.test(rest)) return "option";

  const scope = query >= 0 ? rest.slice(query + 1) : rest;
  const assigned = scope.match(/\$([a-zA-Z]+)\s*=[^&;]*$/);
  if (!assigned) return typedOption ? "option" : "none";

  switch (assigned[1].toLowerCase()) {
    case "filter":
    case "compute":
    case "apply":
      return "expression";
    case "orderby":
      return "orderby";
    case "search":
      return "search";
    case "count":
      return "boolean";
    case "format":
      return "format";
    case "expand":
      return "expand";
    default:
      return typedOption ? "option" : "none";
  }
}

const OPTIONS: OdataItem[] = [
  {
    label: "$filter",
    insertText: "$filter=",
    kind: "keyword",
    detail: "Boolean restriction",
    documentation: "`$filter=FirstName eq 'Scott'` — values use OData literal syntax, not JSON.",
  },
  {
    label: "$select",
    insertText: "$select=",
    kind: "keyword",
    detail: "Projection",
    documentation: "`$select=Name,IcaoCode` — comma-separated property list.",
  },
  {
    label: "$expand",
    insertText: "$expand=",
    kind: "keyword",
    detail: "Include related entities",
    documentation:
      "`$expand=Friends($select=FirstName)` — nested options go in parens, semicolon-separated.",
  },
  {
    label: "$orderby",
    insertText: "$orderby=",
    kind: "keyword",
    detail: "Sort",
    documentation: "`$orderby=FirstName asc,LastName desc`",
  },
  {
    label: "$top",
    insertText: "$top=",
    kind: "keyword",
    detail: "Page size",
  },
  {
    label: "$skip",
    insertText: "$skip=",
    kind: "keyword",
    detail: "Page offset",
    documentation: "Do not rebuild paging with `$skip` when the payload gave an `@odata.nextLink`.",
  },
  {
    label: "$count",
    insertText: "$count=true",
    kind: "keyword",
    detail: "Include total",
    documentation:
      "Query option — adds `@odata.count` to the payload. The `/$count` path segment returns the number as `text/plain` instead.",
  },
  {
    label: "$search",
    insertText: "$search=",
    kind: "keyword",
    detail: "Free-text search",
    documentation: '`$search="Boise NOT Russell"`',
  },
  {
    label: "$format",
    insertText: "$format=json",
    kind: "keyword",
    detail: "Response format",
  },
  {
    label: "$apply",
    insertText: "$apply=",
    kind: "keyword",
    detail: "Aggregation (data aggregation ext.)",
    documentation: "`$apply=groupby((Category),aggregate(Amount with sum as Total))`",
  },
  {
    label: "$compute",
    insertText: "$compute=",
    kind: "keyword",
    detail: "Computed property",
    documentation: "`$compute=Price mul Qty as Total` — the alias is then usable in `$filter`/`$select`.",
  },
  {
    label: "$skiptoken",
    insertText: "$skiptoken=",
    kind: "keyword",
    detail: "Server paging token",
  },
  {
    label: "$levels",
    insertText: "$levels=",
    kind: "keyword",
    detail: "Recursion depth ($expand only)",
    documentation: "`$expand=Nav($levels=max)`",
  },
];

const PATH_SEGMENTS: OdataItem[] = [
  {
    label: "$metadata",
    insertText: "$metadata",
    kind: "keyword",
    detail: "CSDL XML schema",
  },
  {
    label: "$count",
    insertText: "$count",
    kind: "keyword",
    detail: "Collection size as text/plain",
  },
  {
    label: "$ref",
    insertText: "$ref",
    kind: "keyword",
    detail: "Relationship link",
    documentation: "Relates existing entities instead of creating them.",
  },
  {
    label: "$value",
    insertText: "$value",
    kind: "keyword",
    detail: "Raw property value (no JSON envelope)",
  },
  {
    label: "$batch",
    insertText: "$batch",
    kind: "keyword",
    detail: "Batch endpoint",
  },
];

const OPERATORS: OdataItem[] = [
  { label: "eq", insertText: "eq ", kind: "operator", detail: "equals" },
  { label: "ne", insertText: "ne ", kind: "operator", detail: "not equals" },
  { label: "gt", insertText: "gt ", kind: "operator", detail: "greater than" },
  { label: "ge", insertText: "ge ", kind: "operator", detail: "greater or equal" },
  { label: "lt", insertText: "lt ", kind: "operator", detail: "less than" },
  { label: "le", insertText: "le ", kind: "operator", detail: "less or equal" },
  { label: "and", insertText: "and ", kind: "operator", detail: "logical and" },
  { label: "or", insertText: "or ", kind: "operator", detail: "logical or" },
  { label: "not", insertText: "not ", kind: "operator", detail: "logical negation" },
  {
    label: "has",
    insertText: "has ",
    kind: "operator",
    detail: "flags enum membership",
    documentation: "`Style has Namespace.Colors'Yellow'`",
  },
  {
    label: "in",
    insertText: "in (${1:'a','b'})",
    kind: "operator",
    detail: "membership in a list",
    snippet: true,
  },
];

const FUNCTIONS: OdataItem[] = [
  {
    label: "contains",
    insertText: "contains(${1:Prop},'${2:value}')",
    kind: "function",
    detail: "substring test",
    snippet: true,
  },
  {
    label: "startswith",
    insertText: "startswith(${1:Prop},'${2:value}')",
    kind: "function",
    detail: "prefix test",
    snippet: true,
  },
  {
    label: "endswith",
    insertText: "endswith(${1:Prop},'${2:value}')",
    kind: "function",
    detail: "suffix test",
    snippet: true,
  },
  {
    label: "length",
    insertText: "length(${1:Prop})",
    kind: "function",
    detail: "string length",
    snippet: true,
  },
  {
    label: "indexof",
    insertText: "indexof(${1:Prop},'${2:value}')",
    kind: "function",
    detail: "position of substring",
    snippet: true,
  },
  {
    label: "substring",
    insertText: "substring(${1:Prop},${2:0})",
    kind: "function",
    detail: "substring from index",
    snippet: true,
  },
  {
    label: "tolower",
    insertText: "tolower(${1:Prop})",
    kind: "function",
    detail: "lowercase",
    snippet: true,
  },
  {
    label: "toupper",
    insertText: "toupper(${1:Prop})",
    kind: "function",
    detail: "uppercase",
    snippet: true,
  },
  {
    label: "trim",
    insertText: "trim(${1:Prop})",
    kind: "function",
    detail: "strip surrounding whitespace",
    snippet: true,
  },
  {
    label: "concat",
    insertText: "concat(${1:Prop},'${2:value}')",
    kind: "function",
    detail: "join strings",
    snippet: true,
  },
  {
    label: "year",
    insertText: "year(${1:Prop})",
    kind: "function",
    detail: "year component",
    snippet: true,
  },
  {
    label: "month",
    insertText: "month(${1:Prop})",
    kind: "function",
    detail: "month component",
    snippet: true,
  },
  {
    label: "day",
    insertText: "day(${1:Prop})",
    kind: "function",
    detail: "day component",
    snippet: true,
  },
  {
    label: "hour",
    insertText: "hour(${1:Prop})",
    kind: "function",
    detail: "hour component",
    snippet: true,
  },
  {
    label: "minute",
    insertText: "minute(${1:Prop})",
    kind: "function",
    detail: "minute component",
    snippet: true,
  },
  {
    label: "second",
    insertText: "second(${1:Prop})",
    kind: "function",
    detail: "second component",
    snippet: true,
  },
  {
    label: "date",
    insertText: "date(${1:Prop})",
    kind: "function",
    detail: "date part of a datetimeoffset",
    snippet: true,
  },
  {
    label: "time",
    insertText: "time(${1:Prop})",
    kind: "function",
    detail: "time part of a datetimeoffset",
    snippet: true,
  },
  {
    label: "now",
    insertText: "now()",
    kind: "function",
    detail: "current datetimeoffset",
  },
  {
    label: "round",
    insertText: "round(${1:Prop})",
    kind: "function",
    detail: "round to integer",
    snippet: true,
  },
  {
    label: "floor",
    insertText: "floor(${1:Prop})",
    kind: "function",
    detail: "round down",
    snippet: true,
  },
  {
    label: "ceiling",
    insertText: "ceiling(${1:Prop})",
    kind: "function",
    detail: "round up",
    snippet: true,
  },
  {
    label: "cast",
    insertText: "cast(${1:Prop},${2:Edm.String})",
    kind: "function",
    detail: "type conversion",
    snippet: true,
  },
  {
    label: "isof",
    insertText: "isof(${1:Prop},${2:Namespace.Type})",
    kind: "function",
    detail: "type test",
    snippet: true,
  },
  {
    label: "any",
    insertText: "${1:Nav}/any(${2:x}:${2:x}/${3:Prop} eq '${4:value}')",
    kind: "snippet",
    detail: "lambda — at least one match",
    documentation: "`Emails/any(s:endswith(s,'contoso.com'))`",
    snippet: true,
  },
  {
    label: "all",
    insertText: "${1:Nav}/all(${2:x}:${2:x}/${3:Prop} gt ${4:0})",
    kind: "snippet",
    detail: "lambda — every element matches",
    documentation: "`Trips/all(t:t/Budget gt 3000)`",
    snippet: true,
  },
];

const LITERALS: OdataItem[] = [
  { label: "true", insertText: "true", kind: "value", detail: "Edm.Boolean" },
  { label: "false", insertText: "false", kind: "value", detail: "Edm.Boolean" },
  { label: "null", insertText: "null", kind: "value", detail: "null literal" },
];

const ORDER_DIRECTIONS: OdataItem[] = [
  { label: "asc", insertText: "asc", kind: "keyword", detail: "ascending" },
  { label: "desc", insertText: "desc", kind: "keyword", detail: "descending" },
];

const SEARCH_OPERATORS: OdataItem[] = [
  { label: "AND", insertText: "AND ", kind: "operator", detail: "both terms" },
  { label: "OR", insertText: "OR ", kind: "operator", detail: "either term" },
  { label: "NOT", insertText: "NOT ", kind: "operator", detail: "exclude term" },
];

const FORMATS: OdataItem[] = [
  { label: "json", insertText: "json", kind: "value", detail: "application/json" },
  { label: "xml", insertText: "xml", kind: "value", detail: "application/xml" },
];

const EXPAND_ITEMS: OdataItem[] = [
  {
    label: "nested options",
    insertText: "${1:Nav}($select=${2:Prop};$filter=${3:Prop} eq '${4:value}')",
    kind: "snippet",
    detail: "expand with nested query options",
    documentation: "Nested options are semicolon-separated inside the parens.",
    snippet: true,
  },
];

/**
 * Completions for the caret position described by `before`.
 *
 * @param before - String-literal content from its first character to the caret.
 * @returns Items for the detected context; empty when the string is not
 *   OData-shaped at that point.
 */
export function odataCompletions(before: string): OdataItem[] {
  switch (odataContextAt(before)) {
    case "option":
      return OPTIONS;
    case "path":
      return PATH_SEGMENTS;
    case "expression":
      return [...OPERATORS, ...FUNCTIONS, ...LITERALS];
    case "orderby":
      return [...ORDER_DIRECTIONS, ...FUNCTIONS];
    case "search":
      return SEARCH_OPERATORS;
    case "boolean":
      return LITERALS.slice(0, 2);
    case "format":
      return FORMATS;
    case "expand":
      return EXPAND_ITEMS;
    default:
      return [];
  }
}
