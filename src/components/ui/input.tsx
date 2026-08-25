"use client";

import * as React from "react";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Bordered single-line text field with an optional leading icon and a
 * trailing clear button that appears once there is a value. The drop-in
 * replacement for a raw `<input>` styled with the `ui.input` recipe
 * (`src/lib/ui.ts`) — reach for it for any free-text or numeric field in the
 * app shell.
 *
 * @remarks
 * Status: stable — Type: primitive
 *
 * State & behavior: fully controlled — `value`/`onChange` are owned by the
 * caller, the component holds no state of its own. The clear button renders
 * only when `value` is a non-empty string/number, the field is not
 * `disabled`, and either `onClear` or `onChange` is supplied. Clicking it
 * calls `onClear` when given; otherwise it clears the underlying DOM node
 * directly and re-fires `onChange` with that node as `event.target`, then
 * returns focus to the field.
 *
 * Variants: none — one visual style, matching the `ui.input` recipe
 * (`bg-app-hover`, 2px transparent border, `focus:border-app-accent`).
 *
 * Composition: renders no children. `icon` accepts any `lucide-react` icon
 * component and is purely decorative (`aria-hidden`).
 *
 * Accessibility: renders a native `<input>`, so labeling follows the same
 * rules as any input — `aria-label`/`aria-labelledby` is the caller's
 * responsibility. The clear button carries its own `aria-label`
 * (`clearLabel`) and is only tabbable while visible.
 *
 * Test ids: the caller's `data-testid` lands on the `<input>`; the clear
 * button gets `` `${data-testid}-clear-button` `` when a base id is given,
 * otherwise it renders without one.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only.
 *
 * Edge cases:
 * - An icon and a visible clear button both add horizontal padding
 *   (`pl-7`/`pr-7`) merged via `cn()`, so a caller-supplied `className` can
 *   still override that padding on either side and visually crowd the icon
 *   or button.
 * - The clear button calls `preventDefault` on `mousedown` so clicking it
 *   never blurs the field first — several callers commit an edit `onBlur`,
 *   and without this a clear click would commit the stale value instead of
 *   clearing it.
 *
 * Dependencies: `lucide-react`, `@/lib/utils` (`cn`).
 *
 * @example
 * ```tsx
 * <Input
 *   icon={Feather}
 *   value={draft}
 *   onChange={(e) => setDraft(e.target.value)}
 *   aria-label="Rename collection"
 *   data-testid="coll-pane-rename-collection-input"
 * />
 * ```
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    icon: Icon,
    iconColor,
    onClear,
    clearLabel = "Clear",
    className,
    value,
    onChange,
    disabled,
    "data-testid": testId,
    ...props
  },
  forwardedRef,
) {
  const innerRef = React.useRef<HTMLInputElement>(null);
  React.useImperativeHandle(
    forwardedRef,
    () => innerRef.current as HTMLInputElement,
  );

  const hasValue =
    value !== undefined && value !== null && String(value).length > 0;
  const showClear = hasValue && !disabled && Boolean(onClear || onChange);

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange && innerRef.current) {
      innerRef.current.value = "";
      onChange(
        { target: innerRef.current } as unknown as React.ChangeEvent<HTMLInputElement>,
      );
    }
    innerRef.current?.focus();
  };

  return (
    <div data-slot="input-wrapper" className="relative flex w-full min-w-0 items-center">
      {Icon && (
        <Icon
          size={13}
          color={iconColor}
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2",
            !iconColor && "text-app-dim",
          )}
        />
      )}
      <input
        ref={innerRef}
        data-slot="input"
        data-testid={testId}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={cn(
          "w-full min-w-0 rounded-md border-2 border-transparent bg-app-hover px-2.5 py-1.5 text-[12px] text-app-bright outline-none transition-colors duration-200 placeholder:text-app-dim focus:border-app-accent focus:bg-app-panel disabled:pointer-events-none disabled:opacity-50",
          Icon && "pl-7",
          showClear && "pr-7",
          className,
        )}
        {...props}
      />
      {showClear && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleClear}
          aria-label={clearLabel}
          data-slot="input-clear-button"
          data-testid={testId ? `${testId}-clear-button` : undefined}
          className="absolute right-1 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm border-0 bg-transparent text-app-dim transition-colors duration-200 hover:text-app-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
        >
          <X size={12} aria-hidden="true" />
        </button>
      )}
    </div>
  );
});
Input.displayName = "Input";

export { Input };

export type InputProps = Omit<React.ComponentProps<"input">, "onChange"> & {
  /** Fires on every native change, receiving the native React `ChangeEvent`.
   *  Also invoked by the clear button (with an empty-value event) whenever
   *  `onClear` is not supplied. */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /**
   * Leading decorative icon rendered inside the field, left of the text.
   * Purely visual — `aria-hidden`.
   */
  icon?: LucideIcon;
  /**
   * Explicit stroke color for `icon`, passed straight through as the icon's
   * `color` prop. Unset falls back to the `text-app-dim` theme token; set it
   * only when a fixed, non-themed color is intentional.
   */
  iconColor?: string;
  /**
   * Overrides the clear button's default behavior (clearing the DOM node and
   * re-firing `onChange`). Use when clearing must also reset state that
   * `onChange` alone can't reach.
   */
  onClear?: () => void;
  /**
   * Accessible name for the clear button.
   * @defaultValue `"Clear"`
   */
  clearLabel?: string;
  /** Base test id. Lands on the `<input>`; the clear button derives
   *  `` `${data-testid}-clear-button` `` from it when present. */
  "data-testid"?: string;
};
