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

export type Assertion = {
  ok: boolean;
  message: string;
  detail?: string;
};

/** One field of a multipart body, as stored on the call record — never the
 *  live `FormData`/`File`, which can't sit in Redux state or survive
 *  persistence. `file` is present only for a `File`/`Blob` field. */
export type RequestBodyPart = {
  key: string;
  value: string;
  file?: { name: string; size: number; type: string };
};

/** Serializable stand-in for a `FormData` or raw `Blob`/`File` request body —
 *  what `ApiCall.requestBody` holds instead of the live object. */
export type RequestBodySummary =
  | { kind: "multipart"; parts: RequestBodyPart[] }
  | { kind: "binary"; name: string; size: number; type: string };

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
  assertions?: Assertion[];
};

export type LogEntry = {
  level: "log" | "warn" | "error" | "info";
  msg: string;
};
