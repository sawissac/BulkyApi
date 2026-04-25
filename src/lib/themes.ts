export type Theme = {
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

export type ThemeKey = 'midnight' | 'ocean';

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
