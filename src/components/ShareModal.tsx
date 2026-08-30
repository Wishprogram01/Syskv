import { useState } from 'react';
import type { Note } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  note: Note | null;
  onClose: () => void;
}

export function ShareModal({ isOpen, note, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !note) return null;

  const payload = { v: 1, title: note.title, body: note.body, tags: note.tags || [], created: note.created };
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const url = location.origin + location.pathname + '#share=' + b64;

  const handleCopy = async () => {
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <div id="shareOverlay" className="overlay" onClick={onClose} />
      <div id="shareModal" className="modal">
        <div className="modal-head">
          <h3>Share Note</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close share dialog">×</button>
        </div>
        <p className="muted">Copy this link. Anyone who opens it sees a read-only version and can save it to their own notes.</p>
        <div className="share-box">
          <input id="shareUrl" type="text" readOnly value={url} />
          <button className="btn primary" onClick={handleCopy}>{copied ? 'Copied!' : 'Copy'}</button>
        </div>
      </div>
    </>
  );
}
