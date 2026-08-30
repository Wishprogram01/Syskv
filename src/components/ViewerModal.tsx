import type { Note } from '../types';
import { renderMarkdown } from '../utils/markdown';

interface ViewerModalProps {
  isOpen: boolean;
  note: Note | null;
  onClose: () => void;
  onSave: () => void;
}

export function ViewerModal({ isOpen, note, onClose, onSave }: ViewerModalProps) {
  if (!isOpen || !note) return null;

  return (
    <>
      <div id="viewerOverlay" className="overlay" onClick={onClose} />
      <div id="viewer" className="viewer">
        <div className="modal-head">
          <h3 id="viewerTitle">{note.title || 'Untitled'}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close viewer">×</button>
        </div>
        <div id="viewerBody" className="preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(note.body || '') }} />
        <div className="modal-foot">
          <button className="btn primary" onClick={onSave}>Save to my notes</button>
        </div>
      </div>
    </>
  );
}
