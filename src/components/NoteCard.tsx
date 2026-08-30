import type { Note } from '../types';
import { stripMd, formatDate } from '../utils/helpers';
import { highlightText } from '../utils/markdown';

interface NoteCardProps {
  note: Note;
  onClick: () => void;
  onRestore?: (id: string) => void;
  onDelete?: (id: string) => void;
  showTrashActions?: boolean;
  searchWords?: string[];
}

export function NoteCard({ note, onClick, onRestore, onDelete, showTrashActions, searchWords }: NoteCardProps) {
  return (
    <article
      className={`note-card${note.pinned ? ' pinned' : ''}`}
      style={{ borderLeftColor: note.color || undefined }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`Open note: ${note.title || 'Untitled'}`}
    >
      <div className="card-title">
        {note.pinned && <span className="pin-ic" title="Pinned">📌</span>}
        <h3>{searchWords && searchWords.length > 0 ? highlightText(note.title || 'Untitled', searchWords) : (note.title || 'Untitled')}</h3>
      </div>
      <div className="preview">
        {searchWords && searchWords.length > 0
          ? highlightText(stripMd(note.body) || 'Empty note', searchWords)
          : (stripMd(note.body) || 'Empty note')}
      </div>
      <div className="card-meta">
        <div className="chips">
          {(note.tags || []).slice(0, 3).map(t => (
            <span key={t} className="chip">#{t}</span>
          ))}
          {note.due && (
            <span className={`chip due-chip${note.due < Date.now() ? ' over' : ''}`}>
              ⏳ Due {formatDate(note.due)}
            </span>
          )}
        </div>
        <time dateTime={new Date(note.updated).toISOString()}>{formatDate(note.updated)}</time>
      </div>
      {showTrashActions && (
        <div className="card-meta">
          <button className="btn ghost small-btn" onClick={(e) => { e.stopPropagation(); onRestore?.(note.id); }}>
            Restore
          </button>
          <button
            className="btn danger small-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Delete this note forever? This cannot be undone.')) {
                onDelete?.(note.id);
              }
            }}
          >
            Delete forever
          </button>
        </div>
      )}
    </article>
  );
}
