export type Theme = {
  isLight?: boolean;
  bg: string;
  bgPanel: string;
  bgSidebar: string;
  bgHover: string;
  bgSelected: string;
  border: string;
  borderMid: string;
  borderAccent: string;
  cyan: string;
  cyanDim: string;
  cyanFaint: string;
  text: string;
  textBright: string;
  textDim: string;
  editorBg: string;
  gutterBg: string;
  lineNum: string;
  success: string;
  warn: string;
  error: string;
};

export type ThemeKey = 'midnight' | 'ocean' | 'light' | 'purple' | 'green' | 'rose' | 'amber' | 'slate' | 'flat' | 'coffee';

export const THEMES: Record<ThemeKey, Theme> = {
  midnight: {
    bg:           '#060d1a',
    bgPanel:      '#09111f',
    bgSidebar:    '#070e1c',
    bgHover:      'rgba(255,255,255,0.03)',
    bgSelected:   'rgba(34,211,238,0.07)',
    border:       'rgba(255,255,255,0.06)',
    borderMid:    'rgba(255,255,255,0.1)',
    borderAccent: 'rgba(34,211,238,0.25)',
    cyan:         '#22d3ee',
    cyanDim:      'rgba(34,211,238,0.55)',
    cyanFaint:    'rgba(34,211,238,0.08)',
    text:         '#94a3b8',
    textBright:   '#e2e8f0',
    textDim:      'rgba(100,116,139,0.8)',
    editorBg:     '#040b16',
    gutterBg:     '#060d1b',
    lineNum:      'rgba(34,211,238,0.18)',
    success:      '#10b981',
    warn:         '#f59e0b',
    error:        '#ef4444',
  },
  ocean: {
    bg:           '#061525',
    bgPanel:      '#0a2035',
    bgSidebar:    '#051220',
    bgHover:      'rgba(50,130,184,0.08)',
    bgSelected:   'rgba(3,246,255,0.08)',
    border:       'rgba(50,130,184,0.15)',
    borderMid:    'rgba(50,130,184,0.25)',
    borderAccent: 'rgba(3,246,255,0.3)',
    cyan:         '#03f6ff',
    cyanDim:      'rgba(3,246,255,0.6)',
    cyanFaint:    'rgba(3,246,255,0.08)',
    text:         '#9dc8e8',
    textBright:   '#daf0ff',
    textDim:      'rgba(100,160,200,0.7)',
    editorBg:     '#040f1c',
    gutterBg:     '#05111e',
    lineNum:      'rgba(3,246,255,0.18)',
    success:      '#10b981',
    warn:         '#f59e0b',
    error:        '#ef4444',
  },
  /**
   * Chocolate: the light half of the brown pair (dark `coffee` is the other).
   * No white anywhere — warm cream panels on a deeper oat canvas with a darker
   * latte sidebar, so the three surfaces still read as distinct layers. Borders
   * are visible hairlines; the accent is a deep mahogany. Every text token is
   * solid hex and clears WCAG AA on the cream panel — including the JSON tree,
   * whose colors switch to a dark set for light themes (see JsonTreeViewer).
   */
  light: {
    isLight: true,
    bg:           '#e6d8bf',
    bgPanel:      '#faf4e8',
    bgSidebar:    '#dcccae',
    bgHover:      'rgba(90,54,30,0.06)',
    bgSelected:   'rgba(124,45,18,0.14)',
    border:       'rgba(60,36,20,0.18)',
    borderMid:    'rgba(60,36,20,0.3)',
    borderAccent: 'rgba(124,45,18,0.55)',
    cyan:         '#7c2d12',
    cyanDim:      '#96492a',
    cyanFaint:    'rgba(124,45,18,0.09)',
    text:         '#382318',
    textBright:   '#1c110b',
    textDim:      '#6a5340',
    editorBg:     '#fdf8ec',
    gutterBg:     '#f0e6d3',
    lineNum:      'rgba(124,45,18,0.4)',
    success:      '#3f6212',
    warn:         '#b45309',
    error:        '#b91c1c',
  },
  purple: {
    bg:           '#170f23',
    bgPanel:      '#1f1430',
    bgSidebar:    '#1a1027',
    bgHover:      'rgba(255,255,255,0.03)',
    bgSelected:   'rgba(168,85,247,0.15)',
    border:       'rgba(168,85,247,0.1)',
    borderMid:    'rgba(168,85,247,0.2)',
    borderAccent: 'rgba(168,85,247,0.4)',
    cyan:         '#c084fc',
    cyanDim:      'rgba(192,132,252,0.55)',
    cyanFaint:    'rgba(192,132,252,0.1)',
    text:         '#d8b4fe',
    textBright:   '#f3e8ff',
    textDim:      'rgba(216,180,254,0.6)',
    editorBg:     '#140d1e',
    gutterBg:     '#170f23',
    lineNum:      'rgba(192,132,252,0.3)',
    success:      '#10b981',
    warn:         '#f59e0b',
    error:        '#ef4444',
  },
  green: {
    bg:           '#0f1c13',
    bgPanel:      '#132418',
    bgSidebar:    '#111f15',
    bgHover:      'rgba(255,255,255,0.03)',
    bgSelected:   'rgba(52,211,153,0.1)',
    border:       'rgba(52,211,153,0.1)',
    borderMid:    'rgba(52,211,153,0.2)',
    borderAccent: 'rgba(52,211,153,0.4)',
    cyan:         '#34d399',
    cyanDim:      'rgba(52,211,153,0.55)',
    cyanFaint:    'rgba(52,211,153,0.08)',
    text:         '#a7f3d0',
    textBright:   '#ecfdf5',
    textDim:      'rgba(167,243,208,0.6)',
    editorBg:     '#0d1710',
    gutterBg:     '#0f1c13',
    lineNum:      'rgba(52,211,153,0.3)',
    success:      '#10b981',
    warn:         '#f59e0b',
    error:        '#ef4444',
  },
  rose: {
    bg:           '#1a0f12',
    bgPanel:      '#231319',
    bgSidebar:    '#160c0f',
    bgHover:      'rgba(255,255,255,0.03)',
    bgSelected:   'rgba(251,113,133,0.12)',
    border:       'rgba(251,113,133,0.1)',
    borderMid:    'rgba(251,113,133,0.2)',
    borderAccent: 'rgba(251,113,133,0.4)',
    cyan:         '#fb7185',
    cyanDim:      'rgba(251,113,133,0.55)',
    cyanFaint:    'rgba(251,113,133,0.08)',
    text:         '#fda4af',
    textBright:   '#fff1f2',
    textDim:      'rgba(253,164,175,0.6)',
    editorBg:     '#130a0d',
    gutterBg:     '#1a0f12',
    lineNum:      'rgba(251,113,133,0.3)',
    success:      '#10b981',
    warn:         '#f59e0b',
    error:        '#ef4444',
  },
  amber: {
    bg:           '#1a1408',
    bgPanel:      '#22190a',
    bgSidebar:    '#150f05',
    bgHover:      'rgba(255,255,255,0.03)',
    bgSelected:   'rgba(251,191,36,0.1)',
    border:       'rgba(251,191,36,0.1)',
    borderMid:    'rgba(251,191,36,0.2)',
    borderAccent: 'rgba(251,191,36,0.35)',
    cyan:         '#fbbf24',
    cyanDim:      'rgba(251,191,36,0.55)',
    cyanFaint:    'rgba(251,191,36,0.08)',
    text:         '#fde68a',
    textBright:   '#fffbeb',
    textDim:      'rgba(253,230,138,0.6)',
    editorBg:     '#120e05',
    gutterBg:     '#1a1408',
    lineNum:      'rgba(251,191,36,0.3)',
    success:      '#10b981',
    warn:         '#f59e0b',
    error:        '#ef4444',
  },
  slate: {
    bg:           '#0d1117',
    bgPanel:      '#161b22',
    bgSidebar:    '#0d1117',
    bgHover:      'rgba(255,255,255,0.03)',
    bgSelected:   'rgba(148,163,184,0.1)',
    border:       'rgba(148,163,184,0.08)',
    borderMid:    'rgba(148,163,184,0.15)',
    borderAccent: 'rgba(148,163,184,0.3)',
    cyan:         '#94a3b8',
    cyanDim:      'rgba(148,163,184,0.55)',
    cyanFaint:    'rgba(148,163,184,0.08)',
    text:         '#cbd5e1',
    textBright:   '#f1f5f9',
    textDim:      'rgba(148,163,184,0.6)',
    editorBg:     '#090d12',
    gutterBg:     '#0d1117',
    lineNum:      'rgba(148,163,184,0.25)',
    success:      '#10b981',
    warn:         '#f59e0b',
    error:        '#ef4444',
  },
  /**
   * Sunset: warm dusk theme — a coral-orange accent over deep charcoal-brown
   * panels, with sand-toned text. Occupies the orange slot between Amber's
   * yellow-gold and Rose's pink, and keeps the shared status hues so success /
   * warn / error stay legible against the accent.
   *
   * Replaced the former poster-style light "flat" theme; the `flat` key is kept
   * so stored selections, test ids and `env` snapshots carry over.
   */
  flat: {
    bg:           '#1c1410',
    bgPanel:      '#241a14',
    bgSidebar:    '#181009',
    bgHover:      'rgba(255,255,255,0.03)',
    bgSelected:   'rgba(255,122,89,0.13)',
    border:       'rgba(255,122,89,0.1)',
    borderMid:    'rgba(255,122,89,0.2)',
    borderAccent: 'rgba(255,122,89,0.4)',
    cyan:         '#ff7a59',
    cyanDim:      'rgba(255,122,89,0.55)',
    cyanFaint:    'rgba(255,122,89,0.08)',
    text:         '#e7c9b3',
    textBright:   '#fff2e8',
    textDim:      'rgba(231,201,179,0.6)',
    editorBg:     '#160f0a',
    gutterBg:     '#1c1410',
    lineNum:      'rgba(255,122,89,0.3)',
    success:      '#10b981',
    warn:         '#f59e0b',
    error:        '#ef4444',
  },
  coffee: {
    bg:           '#1b120c',
    bgPanel:      '#241a12',
    bgSidebar:    '#170f0a',
    bgHover:      'rgba(255,255,255,0.03)',
    bgSelected:   'rgba(198,137,88,0.12)',
    border:       'rgba(198,137,88,0.1)',
    borderMid:    'rgba(198,137,88,0.2)',
    borderAccent: 'rgba(198,137,88,0.4)',
    cyan:         '#c68958',
    cyanDim:      'rgba(198,137,88,0.55)',
    cyanFaint:    'rgba(198,137,88,0.08)',
    text:         '#d9b99a',
    textBright:   '#f5e6d3',
    textDim:      'rgba(217,185,154,0.6)',
    editorBg:     '#140d08',
    gutterBg:     '#1b120c',
    lineNum:      'rgba(198,137,88,0.3)',
    success:      '#10b981',
    warn:         '#f59e0b',
    error:        '#ef4444',
  },
};

export const METHOD_CLR: Record<string, string> = {
  GET:     '#22d3ee',
  POST:    '#10b981',
  PUT:     '#f59e0b',
  PATCH:   '#a78bfa',
  DELETE:  '#ef4444',
  OPTIONS: '#6366f1',
  HEAD:    '#64748b',
  SSE:     '#f472b6',
  WS:      '#38bdf8',
  IO:      '#fb923c',
  DOCS:    '#a78bfa',
};

/**
 * Same hues, seated for light surfaces. The 400/500-level set above is tuned for
 * dark panels and drops to ~2:1 on white (GET cyan is the worst offender), so
 * light themes get the 700-level equivalents instead. All clear AA on white.
 */
export const METHOD_CLR_LIGHT: Record<string, string> = {
  GET:     '#0e7490',
  POST:    '#047857',
  PUT:     '#b45309',
  PATCH:   '#6d28d9',
  DELETE:  '#b91c1c',
  OPTIONS: '#4338ca',
  HEAD:    '#475569',
  SSE:     '#be185d',
  WS:      '#0369a1',
  IO:      '#c2410c',
  DOCS:    '#6d28d9',
};

export const STATUS_TXT: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  301: 'Moved Permanently',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

export function statusColor(code: number | null, T: Theme): string {
  if (!code) return '#64748b';
  if (code < 300) return T.success;
  if (code < 400) return T.warn;
  return T.error;
}

/**
 * HTTP-method label color for the active theme. The dark palette's 400/500-level
 * hues drop to ~1.5:1 on a pale surface, so light themes get the 700-level set
 * ({@link METHOD_CLR_LIGHT}) instead. Falls back to dim text for unknown verbs.
 */
export function methodColor(method: string, T: Theme): string {
  const set = T.isLight ? METHOD_CLR_LIGHT : METHOD_CLR;
  return set[method.toUpperCase()] ?? T.textDim;
}

/**
 * Single source of truth for turning a Theme into CSS custom properties.
 *
 * Every visual token the app uses is published as `--app-*` so components can
 * style with real CSS (Tailwind utilities, `:hover`, `:focus-visible`) instead
 * of prop-drilled inline styles. `globals.css` maps these onto Tailwind's
 * `app-*` color namespace, so `bg-app-panel` / `text-app-dim` / `border-app-border`
 * all resolve to the active theme with no JS involved.
 */
export function themeVars(T: Theme): Record<string, string> {
  return {
    '--app-bg': T.bg,
    '--app-panel': T.bgPanel,
    '--app-sidebar': T.bgSidebar,
    '--app-hover': T.bgHover,
    '--app-selected': T.bgSelected,
    '--app-border': T.border,
    '--app-border-mid': T.borderMid,
    '--app-border-accent': T.borderAccent,
    '--app-accent': T.cyan,
    '--app-accent-dim': T.cyanDim,
    '--app-accent-faint': T.cyanFaint,
    '--app-text': T.text,
    '--app-bright': T.textBright,
    '--app-dim': T.textDim,
    '--app-editor': T.editorBg,
    '--app-gutter': T.gutterBg,
    '--app-line-num': T.lineNum,
    '--app-success': T.success,
    '--app-warn': T.warn,
    '--app-error': T.error,
    '--app-on-solid': T.isLight ? '#ffffff' : T.bg,
    ...methodVars(T),
  };
}

/** Per-method color tokens (`--method-get`, `--method-post`, ...). */
function methodVars(T: Theme): Record<string, string> {
  const set = T.isLight ? METHOD_CLR_LIGHT : METHOD_CLR;
  return Object.fromEntries(
    Object.entries(set).map(([method, color]) => [`--method-${method.toLowerCase()}`, color]),
  );
}
