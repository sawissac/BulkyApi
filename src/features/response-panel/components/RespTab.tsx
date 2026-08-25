"use client";

import { useState, useMemo } from "react";
import { Loader2, Radio, Copy, Check } from "lucide-react";
import type { Theme } from "@/lib/themes";
import type { ApiCall } from "@/lib/types";
import JNode from "@/components/JsonTreeViewer";
import { jsonToTypeScript } from "@/lib/jsonToTypeScript";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** View-toggle container: bordered, clipped so PRETTY/RAW/TS read as one
 *  segmented group instead of three loose pills. */
const VIEW_GROUP = "shrink-0 overflow-hidden rounded-md border border-app-border";

/** View-toggle button: ghost hover/active tracks the runtime theme via the
 *  `app-*` tokens instead of Button's default (static) muted/foreground. */
const VIEW_BTN =
  "rounded-none border-0 text-[8px] font-bold uppercase tracking-widest text-app-dim hover:bg-app-hover hover:text-app-accent data-active:bg-app-selected data-active:text-app-accent";

/** Copy button: outlined at rest, fills with the accent color on hover
 *  (rather than a themed border tint) so the affordance reads as an action,
 *  not a passive toggle. Swaps to a success tint once the copy lands. */
const COPY_BTN_IDLE =
  "bg-transparent border-app-border text-app-dim hover:border-app-accent hover:bg-app-accent hover:text-app-on-solid";
const COPY_BTN_COPIED = "border-app-success bg-app-success/10 text-app-success";

type Props = { T: Theme; call: ApiCall };

const SSE_CLR = "#f472b6";

type ParsedSseEvent = { type: string; data: string; id?: string };

function isSseBody(response: unknown): boolean {
  if (typeof response !== "string") return false;
  return /^(data|event|id|retry):/m.test(response);
}

function parseSseBody(text: string): ParsedSseEvent[] {
  const events: ParsedSseEvent[] = [];
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  let type = "message";
  let data = "";
  let id: string | undefined;
  for (const line of lines) {
    if (line === "") {
      if (data) events.push({ type, data, id });
      type = "message";
      data = "";
      id = undefined;
    } else if (line.startsWith("event:")) {
      type = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      data += (data ? "\n" : "") + line.slice(5).trim();
    } else if (line.startsWith("id:")) {
      id = line.slice(3).trim();
    }
  }
  if (data) events.push({ type, data, id });
  return events;
}

function SseBodyEvents({
  T,
  events,
  raw,
  onToggleRaw,
  response,
}: {
  T: Theme;
  events: ParsedSseEvent[];
  raw: boolean;
  onToggleRaw: () => void;
  response: unknown;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 8,
        }}
      >
        <Radio size={10} color={SSE_CLR} />
        <span
          style={{
            fontFamily: 'var(--font-title)',
            fontSize: 8,
            fontWeight: 600,
            letterSpacing: "0.1em",
            color: SSE_CLR,
          }}
        >
          SSE
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            color: T.textDim,
          }}
        >
          {events.length} event{events.length !== 1 ? "s" : ""}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
          {(["SSE", "RAW"] as const).map((label) => {
            const active = label === "RAW" ? raw : !raw;
            const wantsRaw = label === "RAW";
            return (
              <button
                key={label}
                onClick={() => {
                  if (wantsRaw !== raw) onToggleRaw();
                }}
                style={{
                  padding: "2px 8px",
                  borderRadius: 9999,
                  cursor: active ? "default" : "pointer",
                  border: `1px solid ${active ? SSE_CLR : T.border}`,
                  background: active ? `${SSE_CLR}15` : "transparent",
                  color: active ? SSE_CLR : T.textDim,
                  fontFamily: 'var(--font-display)',
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {raw ? (
        <pre
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: T.text,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: T.bgHover,
            border: `1px solid ${T.border}`,
            borderRadius: 6,
            padding: 10,
            margin: 0,
          }}
        >
          {typeof response === "string"
            ? response
            : JSON.stringify(response, null, 2)}
        </pre>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {events.map((ev, i) => {
            let parsed: unknown = ev.data;
            try {
              parsed = JSON.parse(ev.data);
            } catch {
              /* string */
            }
            const isMsg = ev.type === "message";
            return (
              <div
                key={i}
                style={{
                  borderRadius: 5,
                  border: `1px solid ${SSE_CLR}20`,
                  background: `${SSE_CLR}08`,
                  padding: "5px 8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 7,
                      fontWeight: 700,
                      color: T.textDim,
                    }}
                  >
                    #{i + 1}
                  </span>
                  {!isMsg && (
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 7,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        color: SSE_CLR,
                        background: `${SSE_CLR}18`,
                        border: `1px solid ${SSE_CLR}30`,
                        padding: "1px 5px",
                        borderRadius: 3,
                      }}
                    >
                      {ev.type}
                    </span>
                  )}
                  {ev.id && (
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 7,
                        color: T.textDim,
                      }}
                    >
                      id: {ev.id}
                    </span>
                  )}
                </div>
                {typeof parsed === "string" ? (
                  <pre
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: T.text,
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {parsed}
                  </pre>
                ) : (
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      lineHeight: 1.6,
                    }}
                  >
                    <JNode data={parsed} T={T} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SseEvents({ T, call }: Props) {
  const events = call.sseEvents ?? [];
  const isStreaming = call.status === "success" || call.status === "pending";

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 8,
        }}
      >
        <Radio
          size={10}
          color={SSE_CLR}
          style={
            isStreaming && events.length === 0
              ? { animation: "pulse 1s ease-in-out infinite" }
              : undefined
          }
        />
        <span
          style={{
            fontFamily: 'var(--font-title)',
            fontSize: 8,
            fontWeight: 600,
            letterSpacing: "0.1em",
            color: SSE_CLR,
          }}
        >
          SSE STREAM
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            color: T.textDim,
          }}
        >
          {events.length} event{events.length !== 1 ? "s" : ""}
        </span>
      </div>

      {events.length === 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: T.textDim,
            padding: "8px 0",
          }}
        >
          {call.status === "pending" && (
            <Loader2
              size={11}
              color={SSE_CLR}
              style={{ animation: "spin 0.7s linear infinite" }}
            />
          )}
          <span
            style={{
              fontFamily: 'var(--font-description)',
              fontSize: 11,
              fontStyle: "italic",
            }}
          >
            {call.status === "pending" ? "Connecting…" : "No events received."}
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {events.map((ev, i) => {
            let parsed: unknown = ev.data;
            try {
              parsed = JSON.parse(ev.data);
            } catch {
              /* keep as string */
            }
            const isMsg = ev.type === "message";
            return (
              <div
                key={i}
                style={{
                  borderRadius: 5,
                  border: `1px solid ${SSE_CLR}20`,
                  background: `${SSE_CLR}08`,
                  padding: "5px 8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 7,
                      fontWeight: 700,
                      color: T.textDim,
                    }}
                  >
                    #{i + 1}
                  </span>
                  {!isMsg && (
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 7,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        color: SSE_CLR,
                        background: `${SSE_CLR}18`,
                        border: `1px solid ${SSE_CLR}30`,
                        padding: "1px 5px",
                        borderRadius: 3,
                      }}
                    >
                      {ev.type}
                    </span>
                  )}
                  {ev.id && (
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 7,
                        color: T.textDim,
                      }}
                    >
                      id: {ev.id}
                    </span>
                  )}
                  <span
                    style={{
                      marginLeft: "auto",
                      fontFamily: 'var(--font-mono)',
                      fontSize: 7,
                      color: T.textDim,
                    }}
                  >
                    {new Date(ev.ts).toLocaleTimeString()}
                  </span>
                </div>
                {typeof parsed === "string" ? (
                  <pre
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: T.text,
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {parsed}
                  </pre>
                ) : (
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      lineHeight: 1.6,
                    }}
                  >
                    <JNode data={parsed} T={T} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type ViewMode = "pretty" | "raw" | "ts";

export default function RespTab({ T, call }: Props) {
  const [view, setView] = useState<ViewMode>("pretty");
  const [copied, setCopied] = useState(false);

  const tsOutput = useMemo(() => {
    if (view !== "ts") return "";
    try {
      return jsonToTypeScript(call.response, "Response");
    } catch {
      return "// Could not generate TypeScript types from response";
    }
  }, [view, call.response]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  if (call.isSse) return <SseEvents T={T} call={call} />;

  if (call.status === "pending") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: T.textDim,
        }}
      >
        <Loader2
          size={12}
          style={{ animation: "spin 0.7s linear infinite" }}
          color={T.cyan}
        />
        <span style={{ fontFamily: 'var(--font-description)', fontSize: 12 }}>
          Awaiting response…
        </span>
      </div>
    );
  }

  if (call.error && !call.response) {
    return (
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: T.error,
          background: `${T.error}10`,
          border: `1px solid ${T.error}30`,
          borderRadius: 6,
          padding: 10,
        }}
      >
        {call.error}
      </div>
    );
  }

  if (isSseBody(call.response)) {
    const events = parseSseBody(call.response as string);
    return (
      <SseBodyEvents
        T={T}
        events={events}
        raw={view === "raw"}
        onToggleRaw={() => setView(view === "raw" ? "pretty" : "raw")}
        response={call.response}
      />
    );
  }

  const viewBtn = (mode: ViewMode, label: string) => (
    <Button
      key={mode}
      type="button"
      variant="ghost"
      size="xs"
      onClick={() => setView(mode)}
      data-active={view === mode || undefined}
      className={VIEW_BTN}
    >
      {label}
    </Button>
  );

  const copyText = view === "ts" ? tsOutput : JSON.stringify(call.response, null, 2);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 6,
          marginBottom: 7,
        }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => handleCopy(copyText)}
              className={cn(
                "gap-1 text-[8px] font-bold uppercase tracking-widest",
                copied ? COPY_BTN_COPIED : COPY_BTN_IDLE,
              )}
            >
              {copied ? <Check size={10} /> : <Copy size={10} />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy {view === "ts" ? "TypeScript" : "JSON"}</TooltipContent>
        </Tooltip>
        <ButtonGroup className={VIEW_GROUP}>
          {viewBtn("pretty", "PRETTY")}
          {viewBtn("raw", "RAW")}
          {viewBtn("ts", "TS")}
        </ButtonGroup>
      </div>
      {view === "raw" ? (
        <pre
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: T.text,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: T.bgHover,
            border: `1px solid ${T.border}`,
            borderRadius: 6,
            padding: 10,
          }}
        >
          {copyText}
        </pre>
      ) : view === "ts" ? (
        <pre
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: T.cyan,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: T.bgHover,
            border: `1px solid ${T.border}`,
            borderRadius: 6,
            padding: 10,
          }}
        >
          {tsOutput}
        </pre>
      ) : (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            lineHeight: 1.7,
            background: T.bgHover,
            border: `1px solid ${T.border}`,
            borderRadius: 6,
            padding: 10,
          }}
        >
          <JNode data={call.response} T={T} />
        </div>
      )}
    </div>
  );
}
