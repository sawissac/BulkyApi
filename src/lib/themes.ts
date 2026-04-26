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

export type ThemeKey = 'midnight' | 'ocean' | 'light' | 'purple' | 'green';

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
    success:      '#059669',
    warn:         '#d97706',
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
};

export const METHOD_CLR: Record<string, string> = {
  GET:     '#22d3ee',
  POST:    '#10b981',
  PUT:     '#f59e0b',
  PATCH:   '#a78bfa',
  DELETE:  '#ef4444',
  OPTIONS: '#6366f1',
  HEAD:    '#64748b',
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
