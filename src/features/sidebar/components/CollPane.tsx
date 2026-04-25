'use client';

import { useDispatch, useSelector } from 'react-redux';
import { FileText, Plus } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import type { CollectionItem } from '@/lib/sampleData';
import MethodPill from '@/components/MethodPill';
import { setActiveId, selectActiveId, selectCollections } from '@/store/collectionsSlice';
import { setCode } from '@/store/editorSlice';

type Props = { T: Theme };

export default function CollPane({ T }: Props) {
  const dispatch = useDispatch();
  const collections = useSelector(selectCollections);
  const activeId = useSelector(selectActiveId);
  const files: CollectionItem[] = collections.flatMap((col) => col.items);

  const onSelect = (item: CollectionItem) => {
    dispatch(setActiveId(item.id));
    dispatch(setCode(item.code));
  };

  return (
    <div style={{ paddingTop: 4 }}>
      <div style={{ padding: '4px 10px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.textDim }}>
          Test Cases
        </span>
        <button
          style={{ background: 'transparent', border: 'none', color: T.cyanDim, lineHeight: 1, padding: '0 2px', cursor: 'pointer' }}
          title="New Test Case"
        >
          <Plus size={14} />
        </button>
      </div>

      {files.map((item) => (
        <div
          key={item.id}
          onClick={() => onSelect(item)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '6px 10px',
            cursor: 'pointer',
            background: activeId === item.id ? T.bgSelected : 'transparent',
            borderLeft: `2px solid ${activeId === item.id ? T.cyan : 'transparent'}`,
            transition: 'all 0.12s',
          }}
          onMouseEnter={(e) => { if (activeId !== item.id) e.currentTarget.style.background = T.bgHover; }}
          onMouseLeave={(e) => { if (activeId !== item.id) e.currentTarget.style.background = 'transparent'; }}
        >
          <FileText size={12} color={activeId === item.id ? T.cyan : T.textDim} />
          <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: 11, color: activeId === item.id ? T.textBright : T.text, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.name}
          </span>
          <MethodPill method={item.method} sm />
        </div>
      ))}
    </div>
  );
}
