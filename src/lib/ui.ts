/**
 * Shared class recipes for the flat design system.
 *
 * These are the component-level decisions (a section label, an icon control, a
 * text field) expressed once, so panes compose them instead of re-declaring the
 * same strings. Colors come from the `app-*` Tailwind namespace, which resolves
 * to the active theme's `--app-*` variables — see `themeVars()` in `./themes`.
 *
 * Flat rules baked in here: no shadows, no gradients, borders only where a block
 * boundary is not enough, and interaction feedback via color/border rather than
 * depth. Focus rings are explicit because there is no elevation to fall back on.
 */

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2';

/** Section heading above a group of controls. */
export const label =
  'font-title text-[11px] font-semibold uppercase tracking-[0.14em] text-app-dim';

/** Monospace metadata (counts, keys, ids). */
export const meta = 'font-mono text-[11px] text-app-dim';

/** Icon-only control. 32px hit area regardless of glyph size. */
export const iconBtn =
  `flex size-8 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-app-dim transition-colors duration-200 ` +
  `hover:bg-app-hover hover:text-app-accent disabled:pointer-events-none disabled:opacity-50 ` +
  `${FOCUS} focus-visible:ring-offset-app-sidebar`;

/**
 * Destructive icon-only control. Deliberately sets no opacity of its own — pair
 * it with `reveal` or `dim` so the two never fight over the same property.
 */
export const iconBtnDanger =
  `flex size-8 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-app-error transition-all duration-200 ` +
  `hover:bg-app-error/10 ` +
  `${FOCUS} focus-visible:ring-app-error focus-visible:ring-offset-app-sidebar`;

/** Hidden until the enclosing `group` is hovered, or something in it takes focus. */
export const reveal =
  'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100';

/** Present but recessive; comes forward on row hover or focus. */
export const dim =
  'opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100';

/** Bordered label button — the flat "secondary" action. */
export const ghostBtn =
  `flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-app-border bg-transparent px-2.5 ` +
  `text-[11px] font-semibold uppercase tracking-[0.07em] text-app-dim transition-colors duration-200 ` +
  `hover:border-app-border-accent hover:bg-app-selected hover:text-app-accent ` +
  `disabled:pointer-events-none disabled:opacity-50 ` +
  `data-active:border-app-border-accent data-active:bg-app-accent-faint data-active:text-app-accent ` +
  `${FOCUS} focus-visible:ring-offset-app-panel`;

/** Solid action block. Foreground uses `--app-on-solid` so it stays legible on
 *  bright dark-theme accents and dark light-theme accents alike. */
export const solidBtn =
  `flex h-8 shrink-0 items-center gap-1.5 rounded-md border-0 bg-app-accent px-4 ` +
  `text-[11px] font-bold uppercase tracking-[0.08em] text-app-on-solid ` +
  `transition-transform duration-200 hover:scale-105 ${FOCUS} focus-visible:ring-offset-app-panel`;

/**
 * Text field. Muted fill, no visible border at rest; focus swaps to the panel
 * background with a hard 2px accent border. The transparent border is always
 * present so focusing never shifts layout.
 */
export const input =
  `w-full min-w-0 rounded-md border-2 border-transparent bg-app-hover px-2.5 py-1.5 ` +
  `text-[12px] text-app-bright outline-none transition-colors duration-200 ` +
  `placeholder:text-app-dim focus:border-app-accent focus:bg-app-panel`;

/** Selectable list row. Pair with `data-selected` on the element. */
export const row =
  `group flex w-full items-center gap-2 rounded-md border border-app-border bg-transparent px-2.5 py-2 text-left ` +
  `transition-colors duration-200 hover:bg-app-hover ` +
  `data-selected:border-app-border-accent data-selected:bg-app-selected`;

/** The clickable name inside a row that also carries its own action buttons. */
export const rowSelect =
  `min-w-0 flex-1 truncate rounded-sm border-0 bg-transparent p-0 text-left font-title text-[12px] font-semibold ` +
  `text-app-text transition-colors duration-200 hover:text-app-bright ` +
  `data-selected:text-app-bright ${FOCUS} focus-visible:ring-offset-0`;

/**
 * Icon-plus-label action tile inside a bordered list wrapper (single outer
 * border, `overflow-hidden` to clip the first/last tile to its radius,
 * `divide-y` between tiles — see `FILE_LIST` in `FilePane` for the concrete
 * recipe). Expects its color set via inline `style={{ color: tone }}` so the
 * icon block and hover tint can derive from `currentColor`. Carries no
 * border/radius of its own — the wrapper owns the outer edge and its
 * `divide-y` owns the interior dividers.
 */
export const actionCard =
  `group flex items-center gap-2.5 bg-app-hover p-2 text-left transition-colors duration-200 hover:bg-current/5 ` +
  `${FOCUS.replace('ring-app-accent', 'ring-current')} focus-visible:ring-offset-app-sidebar`;

/** Icon block inside an `actionCard`, tinted via `tint-current`. */
export const actionCardIcon =
  'flex size-9 shrink-0 items-center justify-center rounded-md border tint-current transition-transform duration-200 group-hover:scale-110';

/** Title text inside an `actionCard`. */
export const actionCardTitle = 'block font-title text-[12px] font-semibold text-app-bright';

/** Subtitle text inside an `actionCard`. */
export const actionCardSub = 'mt-0.5 block truncate font-description text-[11px] text-app-dim';
