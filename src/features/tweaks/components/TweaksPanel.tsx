'use client';

import { useDispatch, useSelector } from 'react-redux';
import { X } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import type { ThemeKey } from '@/lib/themes';
import type { LayoutKey } from '@/store/uiSlice';
import { selectTheme, selectLayout, setTheme, setLayout, setTweaksOpen } from '@/store/uiSlice';

type Props = { T: Theme };

export default function TweaksPanel({ T }: Props) {
  const dispatch = useDispatch();
  const theme = useSelector(selectTheme);
  const layout = useSelector(selectLayout);

  const pill = <TVal extends string>(
    val: TVal,
    cur: TVal,
    setter: (v: TVal) => void,
    label: string
  ) => (
    <button
      onClick={() => setter(val)}
      style={{
        padding: '4px 11px', borderRadius: 9999,
        border: `1px solid ${cur === val ? T.borderAccent : T.border}`,
        background: cur === val ? T.bgSelected : 'transparent',
        color: cur === val ? T.cyan : T.textDim,
        fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, fontWeight: 700,
        letterSpacing: '0.07em', cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      position: 'fixed', bottom: 18, right: 18, width: 234,
      background: T.bgPanel,
      border: `1px solid ${T.borderMid}`,
      borderRadius: 14, padding: 16, zIndex: 1000,
      boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      animation: 'fadeUp 0.2s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.textBright }}>
          Tweaks
        </span>
        <button
          onClick={() => dispatch(setTweaksOpen(false))}
          style={{ background: 'transparent', border: 'none', color: T.textDim, lineHeight: 1, cursor: 'pointer', padding: 2 }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.textDim, marginBottom: 6 }}>
          Color Theme
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {pill<ThemeKey>('midnight', theme, (v) => dispatch(setTheme(v)), 'Midnight')}
          {pill<ThemeKey>('ocean', theme, (v) => dispatch(setTheme(v)), 'Ocean')}
          {pill<ThemeKey>('light', theme, (v) => dispatch(setTheme(v)), 'Light')}
          {pill<ThemeKey>('purple', theme, (v) => dispatch(setTheme(v)), 'Purple')}
          {pill<ThemeKey>('green', theme, (v) => dispatch(setTheme(v)), 'Green')}
          {pill<ThemeKey>('rose', theme, (v) => dispatch(setTheme(v)), 'Rose')}
          {pill<ThemeKey>('amber', theme, (v) => dispatch(setTheme(v)), 'Amber')}
          {pill<ThemeKey>('slate', theme, (v) => dispatch(setTheme(v)), 'Slate')}
        </div>
      </div>

      <div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.textDim, marginBottom: 6 }}>
          Layout
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {pill<LayoutKey>('balanced', layout, (v) => dispatch(setLayout(v)), 'Balanced')}
          {pill<LayoutKey>('editor-focus', layout, (v) => dispatch(setLayout(v)), 'Editor Focus')}
          {pill<LayoutKey>('response-focus', layout, (v) => dispatch(setLayout(v)), 'Response Focus')}
        </div>
      </div>
    </div>
  );
}
