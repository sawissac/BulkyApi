/**
 * Wire types shared with the BulkyApi web app (`src/lib/types.ts`,
 * `src/lib/sampleData.ts`).
 *
 * These are duplicated rather than imported: this package compiles with its
 * own `rootDir` and ships as a standalone stdio binary, so pulling a file in
 * from `../src` would drag the app's `@/` path aliases and Next-only globals
 * into the build. The shapes must stay byte-compatible with the app because
 * both read and write the same Supabase rows.
 */

export type CallStatus = "idle" | "pending" | "success" | "error";

export type AuthInfo =
  | { type: "Bearer Token"; token: string }
  | { type: "Bearer (env)"; token: string }
  | { type: "Basic Auth"; username: string }
  | { type: "API Key"; header: string; key: string }
  | null;

export type SseEvent = {
  type: string;
  data: string;
  id?: string;
  ts: number;
};

export type ApiCall = {
  idx: number;
  method: string;
  url: string;
  urlExpr: string;
  status: CallStatus;
  statusCode: number | null;
  response: unknown;
  responseHeaders: Record<string, string>;
  requestBody: unknown;
  requestHeaders: Record<string, string>;
  authInfo: AuthInfo;
  duration: number;
  error: string | null;
  timestamp: string | null;
  cache: boolean;
  note?: string;
  isSse?: boolean;
  sseEvents?: SseEvent[];
};

export type LogEntry = {
  level: "log" | "warn" | "error" | "info";
  msg: string;
};

export type CollectionItem = {
  id: string;
  name: string;
  method: string;
  code: string;
};

export type Environment = {
  id: string;
  name: string;
  vars: Record<string, string>;
};

export type Collection = {
  id: string;
  name: string;
  open: boolean;
  items: CollectionItem[];
  environments: Environment[];
  envIdx: number;
};
