"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Status tone is derived from the code and rendered through theme tokens, so the
 * pill follows the active theme. Background and border are `currentColor` mixes,
 * which keeps one color decision per tone instead of three.
 */
const TONE = {
  idle: "text-app-dim",
  ok: "text-app-success",
  redirect: "text-app-warn",
  error: "text-app-error",
} as const;

/** Name shown above the tooltip's description — the tone as a human label. */
const TONE_LABEL: Record<keyof typeof TONE, string> = {
  idle: "No response yet",
  ok: "Success",
  redirect: "Redirect",
  error: "Error",
};

/** Well-known codes get their canonical name; everything else falls back to
 *  the range description below. */
const KNOWN_CODES: Record<number, string> = {
  200: "OK",
  201: "Created",
  202: "Accepted",
  204: "No Content",
  301: "Moved Permanently",
  302: "Found",
  304: "Not Modified",
  307: "Temporary Redirect",
  308: "Permanent Redirect",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  409: "Conflict",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

function toneFor(code: number | null): keyof typeof TONE {
  if (!code) return "idle";
  if (code < 300) return "ok";
  if (code < 400) return "redirect";
  return "error";
}

/** Description sentence for the tooltip: the code's range meaning, plus its
 *  canonical name when the code is one of the common ones above. */
function describe(code: number | null, tone: keyof typeof TONE): string {
  if (tone === "idle") return "Run the call to see its status.";
  const named = code !== null ? KNOWN_CODES[code] : undefined;
  const range =
    tone === "ok"
      ? "2xx — the request succeeded."
      : tone === "redirect"
        ? "3xx — the client should follow another URL."
        : code !== null && code < 500
          ? "4xx — the request itself was rejected."
          : "5xx — the server failed to fulfill a valid request.";
  return named ? `${named}. ${range}` : range;
}

/**
 * Status-code chip; tone derived from the code (idle before a call runs, ok /
 * redirect / error after) and rendered through the `app-*` theme tokens, so
 * it tracks the active theme. Fill and border are `currentColor` mixes via
 * the shared `tint-current` utility — one color decision drives all three.
 * Hovering or focusing it raises a tooltip naming the code's range and, for
 * well-known codes, its canonical name.
 *
 * @remarks
 * Status: stable — Type: primitive
 *
 * State & behavior: stateless. Tone is recomputed from `code` on every
 * render; the tooltip's open/close timing is owned by Radix's `Tooltip` — a
 * 300ms hover delay, instant on keyboard focus.
 *
 * Variants: `idle` (no code yet), `ok` (< 300), `redirect` (300–399), `error`
 * (>= 400) — the last splits into a 4xx vs 5xx sentence inside the tooltip
 * only, since both still render the same error tone.
 *
 * Composition: renders inside a Radix `Tooltip`; the pill itself is the
 * trigger (`asChild`), so no extra wrapping element changes its layout
 * footprint. The tooltip content portals to `document.body`, so it is never
 * clipped by a scrolling ancestor.
 *
 * Accessibility: `tabIndex={0}` makes the pill focusable even though it is a
 * `span`, so keyboard users reach the same tooltip mouse users get. Radix
 * wires `aria-describedby` from the trigger to the tooltip content
 * automatically. The visible code is preceded by an `sr-only` "Status: "
 * label for screen readers.
 *
 * Test ids: none. This is a repeated shared primitive with no stable
 * per-instance id of its own — per `react-data-test`, a hardcoded id here
 * would collide the moment two pills render on one screen, which every
 * caller (a call list) does. A caller needing to assert on one specific pill
 * selects it by position inside its own row's testid.
 *
 * CSS classes: none — Tailwind utilities plus the `tint-current` global
 * utility (`@/app/globals.css`) only.
 *
 * Edge cases: `code === null` renders `···` and the idle tone; the tooltip
 * says to run the call rather than describing a range. A code outside
 * `KNOWN_CODES` still gets a tooltip — just the range sentence, no name.
 *
 * Dependencies: `@/components/ui/tooltip` (Radix `Tooltip` wrapper).
 *
 * @example
 * ```tsx
 * <StatusPill code={404} />
 * ```
 */
export default function StatusPill({ code }: StatusPillProps) {
  const tone = toneFor(code);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={`cursor-help rounded-md border tint-current px-2 py-0.5 font-title text-[11px] font-semibold leading-none transition-[transform,filter] duration-200 hover:scale-105 hover:brightness-125 focus-visible:scale-105 focus-visible:brightness-125 focus-visible:outline-none ${TONE[tone]}`}
        >
          <span className="sr-only">Status: </span>
          {code || "···"}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <span className="block font-title text-[11px] font-semibold text-app-bright">
          {code ? `${code} · ${TONE_LABEL[tone]}` : TONE_LABEL[tone]}
        </span>
        <span className="mt-0.5 block font-description text-app-dim">{describe(code, tone)}</span>
      </TooltipContent>
    </Tooltip>
  );
}

export type StatusPillProps = {
  /** HTTP status code, or `null` before the call has run — renders `···`
   *  and the idle tone. */
  code: number | null;
};
