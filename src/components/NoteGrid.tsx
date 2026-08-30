import type { Note } from '../types';
import { NoteCard } from './NoteCard';

interface NoteGridProps {
  notes: Note[];
  viewType: string;
  searchQuery: string;
  loading?: boolean;
  onNoteClick: (id: string) => void;
  onRestore: (id: string) => void;
  onDeletePermanent: (id: string) => void;
  onNewNote?: () => void;
}

export function NoteGrid({ notes, viewType, searchQuery, loading, onNoteClick, onRestore, onDeletePermanent, onNewNote }: NoteGridProps) {
  const { words, tags } = parseSearch(searchQuery);
  const searchWords = [...words, ...tags];

  if (loading) {
    return (
      <div className="skeleton-grid" aria-busy="true" aria-label="Loading notes">
        {Array.from({ length: 8 }, (_, i) => (
          <div className="skeleton-card" key={i}>
            <div className="skeleton-line title" />
            <div className="skeleton-line w80" />
            <div className="skeleton-line w60" />
            <div className="skeleton-line w40" />
          </div>
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    const isTrash = viewType === 'trash' && !searchQuery;
    const isSearch = Boolean(searchQuery);
    return (
      <div className="empty-state">
        <div className="empty-icon" aria-hidden="true">{isTrash ? '🗑️' : isSearch ? '🔍' : '📝'}</div>
        <h3>{isTrash ? 'Trash is empty' : isSearch ? 'No matching notes' : 'No notes yet'}</h3>
        <p>
          {isTrash
            ? 'Deleted notes will appear here. Nothing to restore right now.'
            : isSearch
              ? 'Try a different keyword, or search by tag like #work. You can also press Ctrl+K.'
              : 'Create your first note to get started — it only takes a second.'}
        </p>
        {!isTrash && !isSearch && onNewNote && (
          <button className="btn primary" onClick={onNewNote}>+ Create your first note</button>
        )}
      </div>
    );
  }

  return (
    <div className="notes-grid">
      {notes.map(note => (
        <NoteCard
          key={note.id}
          note={note}
          onClick={() => onNoteClick(note.id)}
          onRestore={onRestore}
          onDelete={onDeletePermanent}
          showTrashActions={viewType === 'trash'}
          searchWords={searchWords.length > 0 ? searchWords : undefined}
        />
      ))}
    </div>
  );
}

function parseSearch(q: string): { words: string[]; tags: string[] } {
  const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const tags: string[] = [];
  const words: string[] = [];
  tokens.forEach(t => {
    if (t.startsWith('#')) tags.push(t.slice(1));
    else words.push(t);
  });
  return { words, tags };
}
