'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Link2,
  Unlink,
  Image as ImageIcon,
  Undo2,
  Redo2,
  CodeXml,
  Eraser,
  Table as TableIcon,
  Minus,
  AlignLeft,
  AlignCenter,
} from 'lucide-react';
import { MediaPickerModal } from './MediaPicker';
import { cn } from '@/lib/utils';

/** Lightweight WYSIWYG editor (no external dependency) with HTML source mode */
export default function RichEditor({ value, onChange, minHeight = 180 }: { value?: string; onChange: (html: string) => void; minHeight?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [source, setSource] = useState(false);
  const [picker, setPicker] = useState(false);
  const savedRange = useRef<Range | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || source) return;
    if (document.activeElement !== el && el.innerHTML !== (value || '')) el.innerHTML = value || '';
  }, [value, source]);

  const emit = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const saveSel = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && ref.current?.contains(sel.anchorNode)) savedRange.current = sel.getRangeAt(0).cloneRange();
  };
  const restoreSel = () => {
    const sel = window.getSelection();
    if (savedRange.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  };

  const cmd = (c: string, v?: string) => {
    ref.current?.focus();
    restoreSel();
    document.execCommand(c, false, v);
    emit();
  };

  const block = (tag: string) => cmd('formatBlock', `<${tag}>`);

  const link = () => {
    saveSel();
    const url = prompt('Link URL (https://… or /page):');
    if (url) cmd('createLink', url);
  };

  const table = () => {
    const html =
      '<table><thead><tr><th>Heading</th><th>Heading</th></tr></thead><tbody><tr><td>Cell</td><td>Cell</td></tr><tr><td>Cell</td><td>Cell</td></tr></tbody></table><p></p>';
    cmd('insertHTML', html);
  };

  const B = ({ onClick, title, children, active }: { onClick: () => void; title: string; children: React.ReactNode; active?: boolean }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        saveSel();
      }}
      onClick={onClick}
      className={cn('grid h-8 w-8 place-items-center rounded-md text-gray-600 hover:bg-gray-200 hover:text-gray-900', active && 'bg-gray-900 text-white hover:bg-gray-800 hover:text-white')}
    >
      {children}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-gray-200 focus-within:ring-gold bg-white">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
        <select
          onMouseDown={saveSel}
          onChange={(e) => {
            block(e.target.value);
            e.target.value = '';
          }}
          defaultValue=""
          className="mr-1 h-8 rounded-md border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700"
          disabled={source}
        >
          <option value="" disabled>
            Text style
          </option>
          <option value="p">Paragraph</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
        </select>
        {!source && (
          <>
            <B title="Bold" onClick={() => cmd('bold')}><Bold className="h-4 w-4" /></B>
            <B title="Italic" onClick={() => cmd('italic')}><Italic className="h-4 w-4" /></B>
            <B title="Underline" onClick={() => cmd('underline')}><Underline className="h-4 w-4" /></B>
            <span className="mx-1 h-5 w-px bg-gray-200" />
            <B title="Bullet list" onClick={() => cmd('insertUnorderedList')}><List className="h-4 w-4" /></B>
            <B title="Numbered list" onClick={() => cmd('insertOrderedList')}><ListOrdered className="h-4 w-4" /></B>
            <B title="Quote" onClick={() => block('blockquote')}><Quote className="h-4 w-4" /></B>
            <B title="Align left" onClick={() => cmd('justifyLeft')}><AlignLeft className="h-4 w-4" /></B>
            <B title="Align center" onClick={() => cmd('justifyCenter')}><AlignCenter className="h-4 w-4" /></B>
            <span className="mx-1 h-5 w-px bg-gray-200" />
            <B title="Link" onClick={link}><Link2 className="h-4 w-4" /></B>
            <B title="Remove link" onClick={() => cmd('unlink')}><Unlink className="h-4 w-4" /></B>
            <B title="Image" onClick={() => { saveSel(); setPicker(true); }}><ImageIcon className="h-4 w-4" /></B>
            <B title="Table" onClick={table}><TableIcon className="h-4 w-4" /></B>
            <B title="Divider" onClick={() => cmd('insertHorizontalRule')}><Minus className="h-4 w-4" /></B>
            <B title="Clear formatting" onClick={() => cmd('removeFormat')}><Eraser className="h-4 w-4" /></B>
            <span className="mx-1 h-5 w-px bg-gray-200" />
            <B title="Undo" onClick={() => cmd('undo')}><Undo2 className="h-4 w-4" /></B>
            <B title="Redo" onClick={() => cmd('redo')}><Redo2 className="h-4 w-4" /></B>
          </>
        )}
        <span className="flex-1" />
        <B title="HTML source" active={source} onClick={() => setSource((s) => !s)}><CodeXml className="h-4 w-4" /></B>
      </div>
      {source ? (
        <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} className="block w-full resize-y bg-gray-900 p-4 font-mono text-xs text-green-200 outline-none" style={{ minHeight }} spellCheck={false} />
      ) : (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onBlur={() => {
            saveSel();
            emit();
          }}
          onKeyUp={saveSel}
          onMouseUp={saveSel}
          onPaste={(e) => {
            // paste as clean text to avoid messy Word/Google Docs styles
            const html = e.clipboardData.getData('text/html');
            if (html) {
              e.preventDefault();
              const clean = html
                .replace(/<!--[\s\S]*?-->/g, '')
                .replace(/<(meta|style|script|link)[^>]*>[\s\S]*?<\/\1>/gi, '')
                .replace(/<(meta|link)[^>]*>/gi, '')
                .replace(/\s(style|class|id|lang|dir|data-[\w-]+)="[^"]*"/gi, '')
                .replace(/<\/?(span|font|o:p)[^>]*>/gi, '');
              document.execCommand('insertHTML', false, clean);
              emit();
            }
          }}
          className="rte max-w-none p-4 text-sm outline-none [&_h2]:text-2xl [&_h3]:text-xl"
          style={{ minHeight }}
        />
      )}
      <MediaPickerModal
        open={picker}
        onClose={() => setPicker(false)}
        onSelect={(url) => {
          setTimeout(() => cmd('insertHTML', `<img src="${url}" alt="" />`), 50);
        }}
      />
    </div>
  );
}
