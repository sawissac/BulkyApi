"use client";

import { useState } from "react";
import { useDispatch } from "react-redux";
import { ChevronDown, Loader2, DatabaseZap } from "lucide-react";
import type { Theme } from "@/lib/themes";
import type { ApiCall } from "@/lib/types";
import { statusColor } from "@/lib/themes";
import MethodPill from "@/components/MethodPill";
import StatusPill from "@/components/StatusPill";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import RespTab from "./RespTab";
import HeadTab from "./HeadTab";
import AuthTab from "./AuthTab";
import PayloadTab from "./PayloadTab";
import StatusTab from "./StatusTab";
import { toggleCallCache } from "@/store/runnerSlice";

type DetailTab = "response" | "headers" | "auth" | "payload" | "status";

type Props = { T: Theme; call: ApiCall; defaultOpen?: boolean };

/** Detail-tab container: bordered, clipped so the five tabs read as one
 *  segmented group instead of loose buttons in a row. */
const TAB_GROUP = "shrink-0 overflow-hidden rounded-md border border-app-border";

/** Detail-tab button: ghost hover/active tracks the runtime theme via the
 *  `app-*` tokens instead of Button's default (static) muted/foreground. */
const TAB_BTN =
  "rounded-none border-0 text-[9px] font-bold uppercase tracking-[0.08em] text-app-dim hover:bg-app-hover hover:text-app-accent data-active:bg-app-selected data-active:text-app-accent";

export default function CallCard({ T, call, defaultOpen }: Props) {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [tab, setTab] = useState<DetailTab>("response");
  const hasCachedResponse = call.response !== null;
  const isCached = call.cache;

  const sc = statusColor(call.statusCode, T);

  const borderColor = open
    ? T.cyan
    : call.status === "success"
      ? `${T.success}70`
      : call.status === "error"
        ? `${T.error}70`
        : "transparent";

  const tabBtn = (id: DetailTab, label: string) => (
    <Button
      key={id}
      type="button"
      variant="ghost"
      size="xs"
      onClick={(e) => {
        e.stopPropagation();
        setTab(id);
      }}
      data-active={tab === id || undefined}
      className={TAB_BTN}
    >
      {label}
    </Button>
  );

  return (
    <div
      style={{
        animation: "fadeUp 0.2s ease both",
        transition: "all 0.15s",
      }}
    >
      {/* Note block */}
      {call.note && (
        <div
          style={{
            padding: "5px 12px 5px 15px",
            borderLeft: `3px solid ${T.borderAccent}`,
            background: T.cyanFaint,
            borderBottom: `1px solid ${T.borderAccent}`,
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                style={{
                  fontFamily: 'var(--font-description)',
                  fontSize: 11,
                  fontWeight: 500,
                  color: T.cyan,
                  display: "block",
                  whiteSpace: "wrap",
                  overflow: "hidden",
                }}
              >
                {call.note}
              </span>
            </TooltipTrigger>
            <TooltipContent>{call.note}</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Header row */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "8px 12px",
          cursor: "pointer",
          borderLeft: `3px solid ${borderColor}`,
          background: open ? T.bgSelected : "transparent",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.background = T.bgHover;
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = "transparent";
        }}
      >
        {/* Step badge */}
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 5,
            background: open ? T.cyanFaint : T.bgHover,
            border: `1px solid ${open ? T.borderAccent : T.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              fontWeight: 700,
              color: open ? T.cyan : T.textDim,
            }}
          >
            {call.idx + 1}
          </span>
        </div>

        <MethodPill method={call.method} sm />

        <Tooltip>
          <TooltipTrigger asChild>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: open ? T.textBright : T.text,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {call.url}
            </span>
          </TooltipTrigger>
          <TooltipContent>{call.url}</TooltipContent>
        </Tooltip>

        {/* Progress bar */}
        <div
          style={{
            width: 36,
            height: 2,
            borderRadius: 9999,
            background: T.border,
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 9999,
              background: sc,
              width:
                call.status === "idle"
                  ? "0%"
                  : call.status === "pending"
                    ? "55%"
                    : "100%",
              transition: "width 0.4s ease",
            }}
          />
        </div>

        {call.duration > 0 && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              color: T.textDim,
              flexShrink: 0,
            }}
          >
            {call.duration}ms
          </span>
        )}

        {/* Per-call cache toggle — only visible when a cached response exists */}
        {hasCachedResponse && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch(toggleCallCache(call.idx));
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "2px 4px",
                  borderRadius: 4,
                  flexShrink: 0,
                  background: isCached ? `${T.cyan}20` : "transparent",
                  border: `1px solid ${isCached ? T.cyan : T.border}`,
                  color: isCached ? T.cyan : T.textDim,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <DatabaseZap size={10} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {isCached
                ? "Using cached response – click to disable"
                : "Cache available – click to enable"}
            </TooltipContent>
          </Tooltip>
        )}

        {call.status === "idle" && (
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              border: `1.5px dashed ${T.textDim}`,
              flexShrink: 0,
            }}
          />
        )}
        {call.status === "pending" && (
          <Loader2
            size={10}
            color={T.cyan}
            style={{ animation: "spin 0.7s linear infinite", flexShrink: 0 }}
          />
        )}
        {call.status === "success" && <StatusPill code={call.statusCode} />}
        {call.status === "error" &&
          (call.statusCode ? (
            <StatusPill code={call.statusCode} />
          ) : (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: T.error,
                flexShrink: 0,
              }}
            >
              ERR
            </span>
          ))}

        <ChevronDown
          size={10}
          color={T.textDim}
          style={{
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 0.2s",
          }}
        />
      </div>

      {/* Expanded detail */}
      {open && call.status !== "idle" && (
        <div
          style={{ borderTop: `1px solid ${T.border}`, background: T.bgPanel }}
        >
          <div
            style={{
              display: "flex",
              padding: "5px 10px",
              borderBottom: `1px solid ${T.border}`,
              overflowX: "auto",
            }}
          >
            <ButtonGroup className={TAB_GROUP}>
              {tabBtn("response", "Response")}
              {tabBtn("headers", "Headers")}
              {tabBtn("auth", "Auth")}
              {tabBtn("payload", "Payload")}
              {tabBtn("status", "Status")}
            </ButtonGroup>
          </div>
          <div style={{ padding: 10, maxHeight: 280, overflowY: "auto" }}>
            {tab === "response" && <RespTab T={T} call={call} />}
            {tab === "headers" && (
              <HeadTab T={T} headers={call.responseHeaders || {}} />
            )}
            {tab === "auth" && <AuthTab T={T} call={call} />}
            {tab === "payload" && <PayloadTab T={T} call={call} />}
            {tab === "status" && <StatusTab T={T} call={call} />}
          </div>
        </div>
      )}

      {open && call.status === "idle" && (
        <div
          style={{
            padding: "10px 12px",
            background: T.bgPanel,
            borderTop: `1px solid ${T.border}`,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-description)',
              fontSize: 11,
              color: T.textDim,
              fontStyle: "italic",
            }}
          >
            Run the script to see response data.
          </span>
        </div>
      )}
    </div>
  );
}
