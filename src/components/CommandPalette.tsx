import { useState, useEffect, useRef } from 'react';
import type { Note } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onNewNote: () => void;
  onOpenNote: (id: string) => void;
  onToggleDark: () => void;
  onBackup: () => void;
  onRestore: () => void;
  onOpenGraph: () => void;
  onOpenTrash: () => void;
  onEnableNotifications: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  notes,
  onNewNote,
  onOpenNote,
  onToggleDark,
  onBackup,
  onRestore,
  onOpenGraph,
  onOpenTrash,
  onEnableNotifications,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const items = query.trim() ? getSearchItems(query, notes, onOpenNote) : getDefaultItems(
    onNewNote, onToggleDark, onBackup, onRestore, onOpenGraph, onOpenTrash, onEnableNotifications, notes, onOpenNote
  );

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(s => (s + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(s => (s - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      items[selected]?.action();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div id="paletteOverlay" className="overlay" onClick={onClose} />
      <div id="palette" className="palette">
        <input
          ref={inputRef}
          type="text"
          placeholder="Type a command or search notes..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div id="paletteList" className="palette-list">
          {items.map((item, i) => (
            <button
              key={i}
              className={`palette-item${i === selected ? ' sel' : ''}`}
              onClick={item.action}
              onMouseEnter={() => setSelected(i)}
            >
              <span>{item.label}</span>
              {item.hint && <span className="kbd">{item.hint}</span>}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

interface PaletteItem {
  label: string;
  hint?: string;
  action: () => void;
}

function getDefaultItems(
  onNewNote: () => void,
  onToggleDark: () => void,
  onBackup: () => void,
  onRestore: () => void,
  onOpenGraph: () => void,
  onOpenTrash: () => void,
  onEnableNotifications: () => void,
  notes: Note[],
  onOpenNote: (id: string) => void
): PaletteItem[] {
  const items: PaletteItem[] = [
    { label: 'New note', hint: 'Ctrl+N', action: onNewNote },
    { label: 'Toggle dark mode', hint: 'Ctrl+Shift+D', action: onToggleDark },
    { label: 'Backup all notes (JSON)', action: onBackup },
    { label: 'Restore from backup', action: onRestore },
    { label: 'Open graph view', action: onOpenGraph },
    { label: 'Trash', action: onOpenTrash },
    { label: 'Enable notifications', action: onEnableNotifications },
  ];
  notes.slice(0, 8).forEach(n => {
    items.push({ label: `Open: ${n.title || 'Untitled'}`, action: () => onOpenNote(n.id) });
  });
  return items;
}

function getSearchItems(query: string, notes: Note[], onOpenNote: (id: string) => void): PaletteItem[] {
  const items: PaletteItem[] = [
    { label: `New note: "${query}"`, action: () => { onOpenNote(''); } },
  ];
  notes.slice(0, 20).forEach(n => {
    items.push({ label: `Open: ${n.title || 'Untitled'}`, action: () => onOpenNote(n.id) });
  });
  return items;
}
