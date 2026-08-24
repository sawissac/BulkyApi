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

export type ThemeKey = 'midnight' | 'ocean' | 'light' | 'purple' | 'green' | 'rose' | 'amber' | 'slate' | 'flat';

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
  light: {
    isLight: true,
    bg:           '#f8fafc',
    bgPanel:      '#ffffff',
    bgSidebar:    '#f1f5f9',
    bgHover:      'rgba(0,0,0,0.03)',
    bgSelected:   'rgba(34,211,238,0.1)',
    border:       'rgba(0,0,0,0.06)',
    borderMid:    'rgba(0,0,0,0.1)',
    borderAccent: 'rgba(34,211,238,0.4)',
    cyan:         '#0284c7',
    cyanDim:      'rgba(2,132,199,0.55)',
    cyanFaint:    'rgba(2,132,199,0.08)',
    text:         '#334155',
    textBright:   '#0f172a',
    textDim:      'rgba(71,85,105,0.8)',
    editorBg:     '#f8fafc',
    gutterBg:     '#f1f5f9',
    lineNum:      'rgba(2,132,199,0.3)',
    success:      '#047857',
    warn:         '#b45309',
    error:        '#dc2626',
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
   * Flat: poster-style light theme. Structure comes from solid color blocks
   * (gray-100 canvas / white panels / gray-200 chrome), never from shadow.
   * Accent shades are stepped one notch darker than the raw 500-level palette
   * so 8-11px UI text still clears WCAG AA on both white and gray-200.
   */
  flat: {
    isLight: true,
    bg:           '#f3f4f6',
    bgPanel:      '#ffffff',
    bgSidebar:    '#e5e7eb',
    bgHover:      'rgba(17,24,39,0.06)',
    bgSelected:   'rgba(59,130,246,0.12)',
    border:       'rgba(17,24,39,0.10)',
    borderMid:    'rgba(17,24,39,0.16)',
    borderAccent: '#2563eb',
    cyan:         '#1d4ed8',
    cyanDim:      '#2563eb',
    cyanFaint:    'rgba(59,130,246,0.10)',
    text:         '#374151',
    textBright:   '#111827',
    textDim:      '#4b5563',
    editorBg:     '#ffffff',
    gutterBg:     '#f3f4f6',
    lineNum:      '#9ca3af',
    success:      '#047857',
    warn:         '#b45309',
    error:        '#dc2626',
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
