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
