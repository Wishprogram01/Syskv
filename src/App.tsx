import { useState, useEffect, useCallback } from 'react';
import type { Note } from './types';
import { useNotes, useSettings } from './hooks/useNotes';
import { Sidebar } from './components/Sidebar';
import { NoteGrid } from './components/NoteGrid';
import { Editor } from './components/Editor';
import { CommandPalette } from './components/CommandPalette';
import { GraphModal } from './components/GraphModal';
import { SettingsModal } from './components/SettingsModal';
import { ShareModal } from './components/ShareModal';
import { ViewerModal } from './components/ViewerModal';
import ScrollReveal from './components/ScrollReveal/ScrollReveal';
import './styles/global.css';

type ViewType = 'all' | 'pinned' | 'notebook' | 'tag' | 'trash';

export default function App() {
  const { notes, loading, error, loadNotes, createNote, updateNote, deleteNote } = useNotes();
  const { settings, toggleDark } = useSettings();

  const [view, setView] = useState<{ type: ViewType; value?: string }>({ type: 'all' });
  const [searchQuery, setSearchQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerNote, setViewerNote] = useState<Note | null>(null);

  const currentNote = notes.find(n => n.id === currentNoteId) || null;

  const viewTitle =
    view.type === 'pinned' ? 'Pinned'
    : view.type === 'notebook' ? `Notebook: ${view.value}`
    : view.type === 'tag' ? `Tag: #${view.value}`
    : view.type === 'trash' ? 'Trash'
    : 'All Notes';

  const notebooks = [...new Set(notes.filter(n => n.notebook && !n.trashed).map(n => n.notebook))].sort();

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    loadNotes({ view: view.type, search: searchQuery || undefined, tag: view.type === 'tag' ? view.value : undefined, notebook: view.type === 'notebook' ? view.value : undefined });
  }, [view, searchQuery, loadNotes]);

  useEffect(() => {
    document.body.classList.toggle('dark', settings.dark);
  }, [settings.dark]);

  useEffect(() => {
    const handleHash = () => {
      const m = location.hash.match(/^#note-(.+)$/);
      if (m) {
        const note = notes.find(n => n.id === m[1]);
        if (note) {
          setCurrentNoteId(note.id);
          setEditorOpen(true);
          history.replaceState(null, '', location.pathname);
        }
      }
      const shareMatch = location.hash.match(/^#share=(.+)$/);
      if (shareMatch) {
        try {
          const data = JSON.parse(decodeURIComponent(escape(atob(shareMatch[1]))));
          setViewerNote({
            id: 'shared',
            title: data.title || 'Untitled',
            body: data.body || '',
            tags: data.tags || [],
            notebook: '',
            color: '',
            due: null,
            pinned: false,
            trashed: false,
            created: data.created || Date.now(),
            updated: Date.now(),
          });
          setViewerOpen(true);
        } catch { /* ignore */ }
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [notes]);

  const handleNewNote = useCallback(() => {
    setCurrentNoteId(null);
    setEditorOpen(true);
  }, []);

  const handleOpenNote = useCallback((id: string) => {
    setCurrentNoteId(id || null);
    setEditorOpen(true);
  }, []);

  const handleSaveNote = useCallback(async (data: Partial<Note>) => {
    if (currentNoteId) {
      await updateNote(currentNoteId, data);
    } else {
      const newNote = await createNote({
        title: data.title || '',
        body: data.body || '',
        tags: data.tags || [],
        notebook: data.notebook || '',
        color: data.color || '',
        due: data.due || null,
        pinned: data.pinned || false,
      });
      if (newNote) {
        setCurrentNoteId(newNote.id);
      }
    }
    setEditorOpen(false);
  }, [currentNoteId, createNote, updateNote]);

  const handleDeleteNote = useCallback(async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (note?.trashed) {
      await deleteNote(id);
    } else {
      await updateNote(id, { trashed: true });
    }
  }, [notes, updateNote, deleteNote]);

  const handleRestoreNote = useCallback(async (id: string) => {
    await updateNote(id, { trashed: false });
  }, [updateNote]);

  const handleViewChange = useCallback((type: ViewType, value?: string) => {
    setView({ type, value });
  }, []);

  const handleShareNote = useCallback(() => {
    if (currentNote) {
      setShareOpen(true);
    }
  }, [currentNote]);

  const handleSaveSharedNote = useCallback(async () => {
    if (viewerNote) {
      await createNote({
        title: viewerNote.title,
        body: viewerNote.body,
        tags: viewerNote.tags,
        notebook: '',
        color: '',
        due: null,
        pinned: false,
      });
      setViewerOpen(false);
      setViewerNote(null);
    }
  }, [viewerNote, createNote]);

  const handleBackup = useCallback(() => {
    const a = document.createElement('a');
    a.download = 'notes-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.href = URL.createObjectURL(new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' }));
    a.click();
    URL.revokeObjectURL(a.href);
  }, [notes]);

  const handleRestore = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (!Array.isArray(data)) throw new Error('Invalid backup');
        if (confirm(`Replace all ${notes.length} notes with ${data.length} from backup?`)) {
          for (const note of data) {
            if (note.id && !notes.find(n => n.id === note.id)) {
              await createNote(note);
            }
          }
          loadNotes();
        }
      } catch {
        alert('Invalid backup file.');
      }
    };
    input.click();
  }, [notes, createNote, loadNotes]);

  const handleEnableNotifications = useCallback(() => {
    if (!('Notification' in window)) {
      alert('Notifications not supported in this browser.');
      return;
    }
    Notification.requestPermission().then(p => {
      if (p === 'granted') alert('Notifications enabled. Set a date on a note to get reminded.');
      else alert('Permission denied. You can change it in your browser settings.');
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (paletteOpen) { setPaletteOpen(false); return; }
        if (graphOpen) { setGraphOpen(false); return; }
        if (shareOpen) { setShareOpen(false); return; }
        if (settingsOpen) { setSettingsOpen(false); return; }
        if (viewerOpen) { setViewerOpen(false); return; }
        if (editorOpen) { setEditorOpen(false); return; }
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(true); }
        if (e.key.toLowerCase() === 'n') { e.preventDefault(); handleNewNote(); }
        if (e.key.toLowerCase() === 's') { e.preventDefault(); if (currentNoteId) handleSaveNote({}); }
        if (e.key.toLowerCase() === 'd' && e.shiftKey) { e.preventDefault(); toggleDark(); }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [paletteOpen, graphOpen, shareOpen, settingsOpen, viewerOpen, editorOpen, currentNoteId, handleNewNote, handleSaveNote, toggleDark]);

  if (error) {
    return (
      <div className="layout">
        <main className="main">
          <div className="error-state" role="alert">
            <div className="empty-icon" aria-hidden="true">⚠️</div>
            <h3>Something went wrong</h3>
            <p>We couldn't load your notes. Check your connection and try again — your data is safe.</p>
            <p className="muted small">{error}</p>
            <button className="btn primary" onClick={() => loadNotes()}>Try again</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="layout">
      <Sidebar
        notes={notes}
        viewType={view.type}
        settings={settings}
        onNewNote={handleNewNote}
        onViewChange={handleViewChange as (type: string, value?: string) => void}
        onToggleSidebar={() => {}}
        onOpenGraph={() => setGraphOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onBackup={handleBackup}
        onRestore={handleRestore}
      />

      <main className="main">
        <header className="app-header">
          <button className="icon-btn hidden" title="Show sidebar" aria-label="Show sidebar">»</button>
          <div>
            {!loading && notes.length > 0 ? (
              <ScrollReveal mode="mount" key={`${view.type}:${view.value ?? ''}`}>
                {viewTitle}
              </ScrollReveal>
            ) : (
              <h2 id="viewTitle">{viewTitle}</h2>
            )}
            <span id="viewSub" className="muted">{notes.length} {notes.length === 1 ? 'note' : 'notes'}</span>
          </div>
          <div className="header-actions">
            <button className="icon-btn" onClick={toggleDark} title="Toggle dark mode" aria-label="Toggle dark mode">{settings.dark ? '☀' : '☾'}</button>
            <button className="btn ghost" onClick={() => setPaletteOpen(true)} title="Command palette (Ctrl+K)">Ctrl+K</button>
          </div>
        </header>

        <div className="search-row">
          <input
            id="searchInput"
            type="text"
            placeholder="Search notes... (try #tag)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {loading && notes.length === 0 ? (
          <NoteGrid
            notes={[]}
            viewType={view.type}
            searchQuery={searchQuery}
            loading
            onNoteClick={handleOpenNote}
            onRestore={handleRestoreNote}
            onDeletePermanent={handleDeleteNote}
            onNewNote={handleNewNote}
          />
        ) : (
          <NoteGrid
            notes={notes}
            viewType={view.type}
            searchQuery={searchQuery}
            onNoteClick={handleOpenNote}
            onRestore={handleRestoreNote}
            onDeletePermanent={handleDeleteNote}
            onNewNote={handleNewNote}
          />
        )}
      </main>

      <Editor
        note={currentNote}
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveNote}
        notebooks={notebooks}
        onShare={handleShareNote}
      />

      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        notes={notes}
        onNewNote={handleNewNote}
        onOpenNote={handleOpenNote}
        onToggleDark={toggleDark}
        onBackup={handleBackup}
        onRestore={handleRestore}
        onOpenGraph={() => setGraphOpen(true)}
        onOpenTrash={() => handleViewChange('trash')}
        onEnableNotifications={handleEnableNotifications}
      />

      <GraphModal
        isOpen={graphOpen}
        notes={notes}
        onClose={() => setGraphOpen(false)}
        onOpenNote={handleOpenNote}
      />

      <SettingsModal
        isOpen={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onToggleDark={toggleDark}
        onEnableNotifications={handleEnableNotifications}
      />

      <ShareModal
        isOpen={shareOpen}
        note={currentNote}
        onClose={() => setShareOpen(false)}
      />

      <ViewerModal
        isOpen={viewerOpen}
        note={viewerNote}
        onClose={() => setViewerOpen(false)}
        onSave={handleSaveSharedNote}
      />
    </div>
  );
}
