import { useState, useEffect, useRef } from 'react';
import type { Note } from '../types';
import { toLocalInput, fromLocalInput, parseTags } from '../utils/helpers';
import { renderMarkdown, getWordCount } from '../utils/markdown';

interface EditorProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: Partial<Note>) => void;
  notebooks: string[];
  onShare?: () => void;
}

export function Editor({ note, isOpen, onClose, onSave, notebooks, onShare }: EditorProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [notebook, setNotebook] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [pinned, setPinned] = useState(false);
  const [color, setColor] = useState('');
  const [previewDirty, setPreviewDirty] = useState(true);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (note) {
        setTitle(note.title || '');
        setBody(note.body || '');
        setTags((note.tags || []).join(', '));
        setNotebook(note.notebook || '');
        setDueDate(toLocalInput(note.due));
        setPinned(note.pinned || false);
        setColor(note.color || '');
      } else {
        setTitle('');
        setBody('');
        setTags('');
        setNotebook('');
        setDueDate('');
        setPinned(false);
        setColor('');
      }
      setActiveTab('write');
      setPreviewDirty(true);
    }
  }, [isOpen, note]);

  useEffect(() => {
    if (activeTab === 'preview' && previewDirty && previewRef.current) {
      previewRef.current.innerHTML = renderMarkdown(body || 'Nothing to preview');
      setPreviewDirty(false);
    }
  }, [activeTab, previewDirty, body]);

  const handleSave = () => {
    onSave({
      title: title.trim(),
      body: body.trim(),
      tags: parseTags(tags),
      notebook,
      due: fromLocalInput(dueDate),
      pinned,
      color,
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div id="overlay" className="overlay" onClick={onClose} />
      <aside id="editor" className="editor">
        <div className="editor-tabs">
          <button className={`tab${activeTab === 'write' ? ' active' : ''}`} onClick={() => setActiveTab('write')}>
            Write
          </button>
          <button className={`tab${activeTab === 'preview' ? ' active' : ''}`} onClick={() => setActiveTab('preview')}>
            Preview
          </button>
          <span className="spacer" />
          <button className="icon-btn" onClick={onClose} aria-label="Close editor">×</button>
        </div>

        <div id="writePane" style={{ display: activeTab === 'write' ? 'flex' : 'none' }}>
          <input
            id="noteTitle"
            type="text"
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
          <textarea
            id="noteBody"
            placeholder="Write your note here... Markdown supported: **bold**, # heading, `code`, [[backlink]]"
            value={body}
            onChange={e => { setBody(e.target.value); setPreviewDirty(true); }}
          />
        </div>
        <div id="previewPane" className="preview" ref={previewRef} style={{ display: activeTab === 'preview' ? 'block' : 'none' }} />

        <div className="editor-meta">
          <input
            id="tagInput"
            type="text"
            placeholder="Tags: work, ideas"
            value={tags}
            onChange={e => setTags(e.target.value)}
          />
          <div className="meta-row">
            <select id="notebookSelect" value={notebook} onChange={e => setNotebook(e.target.value)}>
              <option value="">No notebook</option>
              {notebooks.map(nb => (
                <option key={nb} value={nb}>{nb}</option>
              ))}
            </select>
            <div id="colorSwatches" className="swatches" title="Note color" role="group" aria-label="Note color">
              {['', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ef4444'].map(c => (
                <button
                  key={c}
                  type="button"
                  className={`swatch${color === c ? ' active' : ''}`}
                  data-c={c}
                  aria-label={c ? `Set note color ${c}` : 'No color'}
                  aria-pressed={color === c}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c || 'transparent', border: c ? 'none' : '2px solid var(--border)' }}
                />
              ))}
            </div>
          </div>
          <div className="meta-row">
            <input
              id="dueDate"
              type="datetime-local"
              title="Reminder"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
            <label className="pin-toggle">
              <input
                id="pinToggle"
                type="checkbox"
                checked={pinned}
                onChange={e => setPinned(e.target.checked)}
              />
              <span>📌 Pin</span>
            </label>
          </div>
        </div>

        <div className="editor-footer">
          <span id="noteStats" className="muted">
            {getWordCount(body)} words · {body.length} chars · {Math.max(1, Math.round(getWordCount(body) / 200))} min read
          </span>
          <div className="editor-actions">
            {onShare && <button className="btn ghost" onClick={onShare} aria-label="Share note">🔗</button>}
            <button className="btn primary" onClick={handleSave}>Save note</button>
          </div>
        </div>
      </aside>
    </>
  );
}
