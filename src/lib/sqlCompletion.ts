/**
 * Postgres completion vocabulary for SQL string literals.
 *
 * The SQL text lives inside a plain string — most often the first argument of
 * `api.query.pgsql("select * from users where id = $1")`, but scripts also
 * build the statement in a variable first (`const sql = "select ...";`) — and
 * either way the TypeScript language service has nothing to offer there, so
 * the editor needs its own provider, the same way
 * {@link "@/lib/odataCompletion"} covers OData URLs. This module holds the
 * Monaco-free half: whether the caret sits inside a SQL-shaped string, and
 * what to offer there. `MonacoCodeEditor` maps the result onto Monaco
 * completion items.
 */

import { stringLiteralAt } from "./odataCompletion";

/** Item flavor, mapped to a Monaco `CompletionItemKind` by the caller. */
export type SqlItemKind = "keyword" | "function" | "type" | "value";

export type SqlItem = {
  label: string;
  insertText: string;
  kind: SqlItemKind;
  detail: string;
  documentation?: string;
  /** `insertText` is a snippet template, not literal text. */
  snippet?: boolean;
};

/** Matches the open paren of `api.pgsql(` / `api.query.pgsql(` (any single
 *  namespace segment is accepted, mirroring the permissive verb match in
 *  `scriptAnalyzer`'s call regex) right up to the caret. A string opened here
 *  is SQL by construction, so it qualifies at any length — even empty. */
const PGSQL_CALL_OPEN =
  /\bapi\s*\.\s*(?:[A-Za-z_$][\w$]*\s*\.\s*)?pgsql\s*\(\s*$/i;

/** Statement-leading keywords a SQL string plausibly opens with. Checked
 *  against only the string's first word, so `select id from t` and a `sql`
 *  variable built up over several lines both qualify from that first word
 *  on. */
const LEADING_KEYWORDS = [
  "select",
  "insert",
  "update",
  "delete",
  "with",
  "create",
  "alter",
  "drop",
  "truncate",
  "begin",
  "commit",
  "rollback",
  "grant",
  "revoke",
  "explain",
  "vacuum",
  "analyze",
  "merge",
  "call",
  "copy",
  "refresh",
];

/**
 * Whether a string's content so far reads like the start of a SQL statement:
 * its first word is a leading keyword, or a prefix of one (so completions
 * already offer `select` while `sel` is still being typed). Requires at
 * least two letters — a bare empty or one-letter string is too little to
 * call SQL on content alone, unlike one opened directly by a `pgsql(` call.
 *
 * @param before - String content from its first character to the caret.
 */
function looksLikeSql(before: string): boolean {
  const word =
    before.replace(/^\s+/, "").match(/^[A-Za-z]*/)?.[0].toLowerCase() ?? "";
  if (word.length < 2) return false;
  return LEADING_KEYWORDS.some((k) => k === word || k.startsWith(word));
}

/**
 * Start offset of the SQL string literal the caret is inside, or `null` when
 * the caret is in code or in a string that is neither opened by a `pgsql(`
 * call nor {@link looksLikeSql} on its own content.
 *
 * @param text - Full buffer.
 * @param offset - Caret offset into `text`.
 */
export function pgsqlStringStart(text: string, offset: number): number | null {
  const frame = stringLiteralAt(text, offset);
  if (!frame) return null;
  const beforeQuote = text.slice(0, frame.start - 1);
  if (PGSQL_CALL_OPEN.test(beforeQuote)) return frame.start;
  return looksLikeSql(text.slice(frame.start, offset)) ? frame.start : null;
}

/** Length of the partial word before the caret — the range a completion replaces. */
export function sqlWordLength(before: string): number {
  return (before.match(/[A-Za-z0-9_]*$/) ?? [""])[0].length;
}

/**
 * Whether the caret position described by `before` (SQL-string content from
 * its first character up to the caret) is a spot to offer SQL vocabulary. A
 * word preceded by `.` is left alone — that is a qualified name
 * (`schema.table`, `t.column`), never a keyword position.
 */
function isKeywordPosition(before: string): boolean {
  const word = (before.match(/[A-Za-z0-9_]*$/) ?? [""])[0];
  const rest = before.slice(0, before.length - word.length);
  return !rest.endsWith(".");
}

// Keywords/literals render upper-case (label and insertText both), matching
// the conventional SQL style of shouting reserved words while leaving
// identifiers, functions and types (below) lower-case. `RESERVED_WORDS` and
// `looksLikeSql`/`LEADING_KEYWORDS` compare on `.toLowerCase()`, so this is
// purely a rendering choice — it doesn't touch matching or tokenizing.
const KEYWORDS: SqlItem[] = [
  { label: "SELECT", insertText: "SELECT ", kind: "keyword", detail: "projection" },
  { label: "FROM", insertText: "FROM ", kind: "keyword", detail: "source table" },
  { label: "WHERE", insertText: "WHERE ", kind: "keyword", detail: "row filter" },
  { label: "INSERT INTO", insertText: "INSERT INTO ${1:table} (${2:cols}) VALUES (${3:vals})", kind: "keyword", detail: "insert statement", snippet: true },
  { label: "VALUES", insertText: "VALUES (${1})", kind: "keyword", detail: "row literals", snippet: true },
  { label: "UPDATE", insertText: "UPDATE ${1:table} SET ${2:col} = ${3:value}", kind: "keyword", detail: "update statement", snippet: true },
  { label: "SET", insertText: "SET ", kind: "keyword", detail: "assignment (update)" },
  { label: "DELETE FROM", insertText: "DELETE FROM ${1:table} WHERE ${2:condition}", kind: "keyword", detail: "delete statement", snippet: true },
  { label: "JOIN", insertText: "JOIN ${1:table} ON ${2:condition}", kind: "keyword", detail: "inner join", snippet: true },
  { label: "LEFT JOIN", insertText: "LEFT JOIN ${1:table} ON ${2:condition}", kind: "keyword", detail: "left outer join", snippet: true },
  { label: "RIGHT JOIN", insertText: "RIGHT JOIN ${1:table} ON ${2:condition}", kind: "keyword", detail: "right outer join", snippet: true },
  { label: "FULL JOIN", insertText: "FULL JOIN ${1:table} ON ${2:condition}", kind: "keyword", detail: "full outer join", snippet: true },
  { label: "INNER JOIN", insertText: "INNER JOIN ${1:table} ON ${2:condition}", kind: "keyword", detail: "inner join", snippet: true },
  { label: "ON", insertText: "ON ", kind: "keyword", detail: "join condition" },
  { label: "AS", insertText: "AS ", kind: "keyword", detail: "alias" },
  { label: "GROUP BY", insertText: "GROUP BY ", kind: "keyword", detail: "aggregation grouping" },
  { label: "ORDER BY", insertText: "ORDER BY ", kind: "keyword", detail: "result ordering" },
  { label: "HAVING", insertText: "HAVING ", kind: "keyword", detail: "post-aggregation filter" },
  { label: "LIMIT", insertText: "LIMIT ${1:10}", kind: "keyword", detail: "row cap", snippet: true },
  { label: "OFFSET", insertText: "OFFSET ${1:0}", kind: "keyword", detail: "row skip", snippet: true },
  { label: "WITH", insertText: "WITH ${1:name} AS (${2:SELECT ...})", kind: "keyword", detail: "CTE", snippet: true },
  { label: "RETURNING", insertText: "RETURNING ", kind: "keyword", detail: "row(s) affected, Postgres extension" },
  { label: "DISTINCT", insertText: "DISTINCT ", kind: "keyword", detail: "dedupe rows" },
  { label: "UNION", insertText: "UNION\n", kind: "keyword", detail: "combine, dedupe" },
  { label: "UNION ALL", insertText: "UNION ALL\n", kind: "keyword", detail: "combine, keep duplicates" },
  { label: "CASE", insertText: "CASE WHEN ${1:condition} THEN ${2:value} ELSE ${3:value} END", kind: "keyword", detail: "conditional expression", snippet: true },
  { label: "WHEN", insertText: "WHEN ", kind: "keyword", detail: "case branch" },
  { label: "THEN", insertText: "THEN ", kind: "keyword", detail: "case result" },
  { label: "ELSE", insertText: "ELSE ", kind: "keyword", detail: "case default" },
  { label: "END", insertText: "END", kind: "keyword", detail: "case terminator" },
  { label: "AND", insertText: "AND ", kind: "keyword", detail: "logical and" },
  { label: "OR", insertText: "OR ", kind: "keyword", detail: "logical or" },
  { label: "NOT", insertText: "NOT ", kind: "keyword", detail: "logical negation" },
  { label: "IN", insertText: "IN (${1})", kind: "keyword", detail: "membership test", snippet: true },
  { label: "EXISTS", insertText: "EXISTS (${1:SELECT ...})", kind: "keyword", detail: "subquery test", snippet: true },
  { label: "BETWEEN", insertText: "BETWEEN ${1:a} AND ${2:b}", kind: "keyword", detail: "range test", snippet: true },
  { label: "LIKE", insertText: "LIKE '${1:%pattern%}'", kind: "keyword", detail: "pattern match", snippet: true },
  { label: "ILIKE", insertText: "ILIKE '${1:%pattern%}'", kind: "keyword", detail: "case-insensitive pattern match, Postgres extension", snippet: true },
  { label: "IS NULL", insertText: "IS NULL", kind: "keyword", detail: "null test" },
  { label: "IS NOT NULL", insertText: "IS NOT NULL", kind: "keyword", detail: "non-null test" },
  { label: "ASC", insertText: "ASC", kind: "keyword", detail: "ascending" },
  { label: "DESC", insertText: "DESC", kind: "keyword", detail: "descending" },
  { label: "CREATE TABLE", insertText: "CREATE TABLE ${1:name} (\n\t${2:id} ${3:serial} PRIMARY KEY\n)", kind: "keyword", detail: "DDL", snippet: true },
  { label: "ALTER TABLE", insertText: "ALTER TABLE ${1:name} ", kind: "keyword", detail: "DDL", snippet: true },
  { label: "DROP TABLE", insertText: "DROP TABLE ${1:name}", kind: "keyword", detail: "DDL", snippet: true },
  { label: "TRUNCATE", insertText: "TRUNCATE ${1:table}", kind: "keyword", detail: "DDL, wipes all rows", snippet: true },
  { label: "PRIMARY KEY", insertText: "PRIMARY KEY", kind: "keyword", detail: "constraint" },
  { label: "FOREIGN KEY", insertText: "FOREIGN KEY (${1:col}) REFERENCES ${2:table}(${3:col})", kind: "keyword", detail: "constraint", snippet: true },
  { label: "REFERENCES", insertText: "REFERENCES ${1:table}(${2:col})", kind: "keyword", detail: "FK target", snippet: true },
  { label: "UNIQUE", insertText: "UNIQUE", kind: "keyword", detail: "constraint" },
  { label: "CHECK", insertText: "CHECK (${1:condition})", kind: "keyword", detail: "constraint", snippet: true },
  { label: "DEFAULT", insertText: "DEFAULT ", kind: "keyword", detail: "column default" },
  { label: "NOT NULL", insertText: "NOT NULL", kind: "keyword", detail: "constraint" },
  { label: "CASCADE", insertText: "CASCADE", kind: "keyword", detail: "FK/drop propagation" },
  { label: "BEGIN", insertText: "BEGIN", kind: "keyword", detail: "start transaction" },
  { label: "COMMIT", insertText: "COMMIT", kind: "keyword", detail: "end transaction" },
  { label: "ROLLBACK", insertText: "ROLLBACK", kind: "keyword", detail: "abort transaction" },
  { label: "OVER", insertText: "OVER (${1:PARTITION BY col ORDER BY col})", kind: "keyword", detail: "window spec", snippet: true },
  { label: "PARTITION BY", insertText: "PARTITION BY ", kind: "keyword", detail: "window grouping" },
];

const FUNCTIONS: SqlItem[] = [
  { label: "count", insertText: "count(${1:*})", kind: "function", detail: "row count", snippet: true },
  { label: "sum", insertText: "sum(${1:col})", kind: "function", detail: "total", snippet: true },
  { label: "avg", insertText: "avg(${1:col})", kind: "function", detail: "mean", snippet: true },
  { label: "min", insertText: "min(${1:col})", kind: "function", detail: "smallest value", snippet: true },
  { label: "max", insertText: "max(${1:col})", kind: "function", detail: "largest value", snippet: true },
  { label: "coalesce", insertText: "coalesce(${1:col}, ${2:default})", kind: "function", detail: "first non-null", snippet: true },
  { label: "nullif", insertText: "nullif(${1:a}, ${2:b})", kind: "function", detail: "null when equal", snippet: true },
  { label: "cast", insertText: "cast(${1:expr} as ${2:type})", kind: "function", detail: "type conversion", snippet: true },
  { label: "now", insertText: "now()", kind: "function", detail: "current timestamptz" },
  { label: "current_timestamp", insertText: "current_timestamp", kind: "function", detail: "current timestamptz" },
  { label: "current_date", insertText: "current_date", kind: "function", detail: "current date" },
  { label: "extract", insertText: "extract(${1:field} from ${2:col})", kind: "function", detail: "date/time component", snippet: true },
  { label: "date_trunc", insertText: "date_trunc('${1:day}', ${2:col})", kind: "function", detail: "truncate to precision", snippet: true },
  { label: "to_char", insertText: "to_char(${1:col}, '${2:YYYY-MM-DD}')", kind: "function", detail: "format as text", snippet: true },
  { label: "to_date", insertText: "to_date(${1:col}, '${2:YYYY-MM-DD}')", kind: "function", detail: "parse text to date", snippet: true },
  { label: "to_timestamp", insertText: "to_timestamp(${1:col}, '${2:YYYY-MM-DD HH24:MI:SS}')", kind: "function", detail: "parse text to timestamp", snippet: true },
  { label: "lower", insertText: "lower(${1:col})", kind: "function", detail: "lowercase", snippet: true },
  { label: "upper", insertText: "upper(${1:col})", kind: "function", detail: "uppercase", snippet: true },
  { label: "trim", insertText: "trim(${1:col})", kind: "function", detail: "strip surrounding whitespace", snippet: true },
  { label: "length", insertText: "length(${1:col})", kind: "function", detail: "string length", snippet: true },
  { label: "substring", insertText: "substring(${1:col} from ${2:1} for ${3:n})", kind: "function", detail: "substring", snippet: true },
  { label: "concat", insertText: "concat(${1:a}, ${2:b})", kind: "function", detail: "join strings", snippet: true },
  { label: "array_agg", insertText: "array_agg(${1:col})", kind: "function", detail: "collect into array, Postgres extension", snippet: true },
  { label: "json_agg", insertText: "json_agg(${1:col})", kind: "function", detail: "collect into json array, Postgres extension", snippet: true },
  { label: "jsonb_build_object", insertText: "jsonb_build_object('${1:key}', ${2:value})", kind: "function", detail: "build a jsonb object, Postgres extension", snippet: true },
  { label: "row_number", insertText: "row_number() over (${1:order by col})", kind: "function", detail: "window row index", snippet: true },
  { label: "rank", insertText: "rank() over (${1:order by col})", kind: "function", detail: "window rank, ties share", snippet: true },
  { label: "dense_rank", insertText: "dense_rank() over (${1:order by col})", kind: "function", detail: "window rank, no gaps", snippet: true },
  { label: "generate_series", insertText: "generate_series(${1:1}, ${2:10})", kind: "function", detail: "row generator, Postgres extension", snippet: true },
];

const TYPES: SqlItem[] = [
  { label: "integer", insertText: "integer", kind: "type", detail: "4-byte int" },
  { label: "bigint", insertText: "bigint", kind: "type", detail: "8-byte int" },
  { label: "smallint", insertText: "smallint", kind: "type", detail: "2-byte int" },
  { label: "serial", insertText: "serial", kind: "type", detail: "auto-incrementing integer, Postgres extension" },
  { label: "bigserial", insertText: "bigserial", kind: "type", detail: "auto-incrementing bigint, Postgres extension" },
  { label: "text", insertText: "text", kind: "type", detail: "unbounded string, Postgres extension" },
  { label: "varchar", insertText: "varchar(${1:255})", kind: "type", detail: "bounded string", snippet: true },
  { label: "char", insertText: "char(${1:1})", kind: "type", detail: "fixed-length string", snippet: true },
  { label: "boolean", insertText: "boolean", kind: "type", detail: "true/false" },
  { label: "date", insertText: "date", kind: "type", detail: "calendar date" },
  { label: "timestamp", insertText: "timestamp", kind: "type", detail: "date + time, no zone" },
  { label: "timestamptz", insertText: "timestamptz", kind: "type", detail: "date + time with zone, Postgres extension" },
  { label: "numeric", insertText: "numeric(${1:10},${2:2})", kind: "type", detail: "exact decimal", snippet: true },
  { label: "real", insertText: "real", kind: "type", detail: "4-byte float" },
  { label: "double precision", insertText: "double precision", kind: "type", detail: "8-byte float" },
  { label: "uuid", insertText: "uuid", kind: "type", detail: "128-bit identifier" },
  { label: "json", insertText: "json", kind: "type", detail: "text-stored JSON" },
  { label: "jsonb", insertText: "jsonb", kind: "type", detail: "binary JSON, indexable, Postgres extension" },
  { label: "bytea", insertText: "bytea", kind: "type", detail: "binary blob" },
];

const LITERALS: SqlItem[] = [
  { label: "NULL", insertText: "NULL", kind: "value", detail: "null literal" },
  { label: "TRUE", insertText: "TRUE", kind: "value", detail: "boolean literal" },
  { label: "FALSE", insertText: "FALSE", kind: "value", detail: "boolean literal" },
];

/**
 * Completions for the caret position described by `before`.
 *
 * @param before - SQL-string content from its first character to the caret.
 * @returns Keyword, function, type and literal items; empty right after a
 *   `.`, where a qualified name is expected instead.
 */
export function sqlCompletions(before: string): SqlItem[] {
  if (!isKeywordPosition(before)) return [];
  return [...KEYWORDS, ...FUNCTIONS, ...TYPES, ...LITERALS];
}

// ── Syntax highlighting ─────────────────────────────────────────────────────
//
// Monaco's TypeScript tokenizer colors an entire SQL string as one uniform
// "string" span; everything below finds the qualifying sub-ranges of a
// buffer and classifies the words inside them so `MonacoCodeEditor` can lay
// semantic-token overrides on top. Vocabulary is derived from the completion
// lists above rather than duplicated, so the two stay in sync on their own.

/** Reserved words, derived from every (possibly multi-word) keyword and
 *  literal label above — `"insert into"` contributes both `insert` and
 *  `into`. */
const RESERVED_WORDS = new Set(
  [...KEYWORDS, ...LITERALS].flatMap((item) =>
    item.label.toLowerCase().split(/\s+/),
  ),
);

/** Data-type words, derived the same way — `"double precision"` contributes
 *  both `double` and `precision`. */
const TYPE_WORDS = new Set(
  TYPES.flatMap((item) => item.label.toLowerCase().split(/\s+/)),
);

/** Function names that count only when the word is actually called —
 *  `count` bare is just an identifier, `count(` is the aggregate. */
const FUNCTION_NAMES = new Set(FUNCTIONS.map((item) => item.label.toLowerCase()));

export type SqlTokenType =
  | "keyword"
  | "function"
  | "type"
  | "string"
  | "number"
  | "placeholder"
  | "comment";

export type SqlToken = {
  /** Offset into the SQL substring passed to {@link tokenizeSql} — not the buffer. */
  start: number;
  end: number;
  type: SqlTokenType;
};

/**
 * Classifies the words, literals, placeholders and comments inside one SQL
 * string's content. A small hand-rolled scanner rather than a real SQL
 * lexer — good enough for coloring, not for validating the statement.
 * Punctuation, operators and identifiers (table/column names) are left
 * unclassified, so they keep whatever color the surrounding TypeScript
 * string token already had.
 *
 * @param sql - SQL string content, e.g. the slice {@link findSqlLiteralRanges}
 *   located.
 * @returns Tokens in ascending order, offsets relative to `sql` itself.
 */
export function tokenizeSql(sql: string): SqlToken[] {
  const tokens: SqlToken[] = [];
  const n = sql.length;
  let i = 0;

  while (i < n) {
    const c = sql[i];

    if (c === "-" && sql[i + 1] === "-") {
      const nl = sql.indexOf("\n", i);
      const end = nl === -1 ? n : nl;
      tokens.push({ start: i, end, type: "comment" });
      i = end;
      continue;
    }

    if (c === "/" && sql[i + 1] === "*") {
      const close = sql.indexOf("*/", i + 2);
      const end = close === -1 ? n : close + 2;
      tokens.push({ start: i, end, type: "comment" });
      i = end;
      continue;
    }

    if (c === "'") {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === "'" && sql[j + 1] === "'") {
          j += 2;
          continue;
        }
        if (sql[j] === "'") {
          j += 1;
          break;
        }
        j += 1;
      }
      tokens.push({ start: i, end: j, type: "string" });
      i = j;
      continue;
    }

    if (c === "$" && /[0-9]/.test(sql[i + 1] ?? "")) {
      let j = i + 1;
      while (j < n && /[0-9]/.test(sql[j])) j += 1;
      tokens.push({ start: i, end: j, type: "placeholder" });
      i = j;
      continue;
    }

    if (/[0-9]/.test(c)) {
      let j = i + 1;
      while (j < n && /[0-9.]/.test(sql[j])) j += 1;
      tokens.push({ start: i, end: j, type: "number" });
      i = j;
      continue;
    }

    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_]/.test(sql[j])) j += 1;
      const word = sql.slice(i, j).toLowerCase();

      let k = j;
      while (k < n && /\s/.test(sql[k])) k += 1;
      const calledAsFunction = sql[k] === "(" && FUNCTION_NAMES.has(word);

      if (calledAsFunction) {
        tokens.push({ start: i, end: j, type: "function" });
      } else if (TYPE_WORDS.has(word)) {
        tokens.push({ start: i, end: j, type: "type" });
      } else if (RESERVED_WORDS.has(word)) {
        tokens.push({ start: i, end: j, type: "keyword" });
      }
      i = j;
      continue;
    }

    i += 1;
  }

  return tokens;
}

/**
 * Every SQL-qualifying string literal in the whole buffer — same
 * qualification {@link pgsqlStringStart} uses (opened by a `pgsql(` call, or
 * {@link looksLikeSql} on its own content), but a single pass over the whole
 * text rather than one offset, for redrawing decorations after an edit.
 * Mirrors {@link stringLiteralAt}'s lexer (comments skipped, escapes
 * consumed, template holes tracked) but only reports a frame once it closes,
 * and only at the top nesting level — a string inside a template literal's
 * `${...}` hole is never itself the SQL argument.
 *
 * @param text - Full buffer.
 * @returns Content ranges (`start` inclusive, `end` exclusive of the closing
 *   quote), in ascending order.
 */
export function findSqlLiteralRanges(
  text: string,
): Array<{ start: number; end: number }> {
  type Frame = { quote: "'" | '"' | "`"; start: number };
  const ranges: Array<{ start: number; end: number }> = [];
  const stack: (Frame | "expr")[] = [];
  const n = text.length;
  let i = 0;

  while (i < n) {
    const top = stack[stack.length - 1];
    const c = text[i];

    if (top && top !== "expr") {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === top.quote) {
        const { start } = top;
        const end = i;
        stack.pop();
        if (stack.length === 0) {
          const beforeQuote = text.slice(0, start - 1);
          const content = text.slice(start, end);
          if (PGSQL_CALL_OPEN.test(beforeQuote) || looksLikeSql(content)) {
            ranges.push({ start, end });
          }
        }
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
      i = nl === -1 ? n : nl + 1;
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      stack.push({ quote: c, start: i + 1 });
      i += 1;
      continue;
    }
    i += 1;
  }

  return ranges;
}
