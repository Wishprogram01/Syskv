import type { Note, Settings } from '../types';

interface SidebarProps {
  notes: Note[];
  viewType: string;
  settings: Settings;
  onNewNote: () => void;
  onViewChange: (type: string, value?: string) => void;
  onToggleSidebar: () => void;
  onOpenGraph: () => void;
  onOpenSettings: () => void;
  onBackup: () => void;
  onRestore: () => void;
}

export function Sidebar({
  notes,
  viewType,
  settings,
  onNewNote,
  onViewChange,
  onToggleSidebar,
  onOpenGraph,
  onOpenSettings,
  onBackup,
  onRestore,
}: SidebarProps) {
  const notebooks = [...new Set(notes.filter(n => n.notebook && !n.trashed).map(n => n.notebook))].sort();
  const tags = [...new Set(notes.flatMap(n => n.trashed ? [] : n.tags || []))].sort();

  const countAll = notes.filter(n => !n.trashed).length;
  const countPinned = notes.filter(n => n.pinned && !n.trashed).length;
  const countTrash = notes.filter(n => n.trashed).length;

  return (
    <aside id="sidebar" className={`sidebar${settings.sidebarOpen ? '' : ' closed'}`}>
      <div className="sidebar-head">
        <h1>Notes</h1>
        <button id="toggleSidebarBtn" className="icon-btn" title="Hide sidebar" onClick={onToggleSidebar}>
          «
        </button>
      </div>

      <button id="newNoteBtn" className="btn primary block" onClick={onNewNote}>+ New Note</button>

      <nav className="side-nav">
        <button className={`side-item${viewType === 'all' ? ' active' : ''}`} onClick={() => onViewChange('all')}>
          <span>All Notes</span>
          <span className="badge">{countAll}</span>
        </button>
        <button className={`side-item${viewType === 'pinned' ? ' active' : ''}`} onClick={() => onViewChange('pinned')}>
          <span>📌 Pinned</span>
          <span className="badge">{countPinned}</span>
        </button>
      </nav>

      <div className="side-section">
        <div className="side-label">Notebooks</div>
        <div id="notebookList" className="side-list">
          {notebooks.map(nb => (
            <button
              key={nb}
              className={`side-item${viewType === 'notebook' ? ' active' : ''}`}
              onClick={() => onViewChange('notebook', nb)}
            >
              <span>{nb}</span>
              <span className="badge">{notes.filter(n => n.notebook === nb && !n.trashed).length}</span>
            </button>
          ))}
          <button className="side-item notebook-new" onClick={() => {
            const name = prompt('Notebook name:');
            if (name && name.trim()) onViewChange('notebook', name.trim());
          }}>
            + Notebook
          </button>
        </div>
      </div>

      <div className="side-section">
        <div className="side-label">Tags</div>
        <div id="tagList" className="side-list">
          {tags.map(t => (
            <button
              key={t}
              className={`side-item${viewType === 'tag' ? ' active' : ''}`}
              onClick={() => onViewChange('tag', t)}
            >
              <span>#{t}</span>
              <span className="badge">{notes.filter(n => !n.trashed && (n.tags || []).includes(t)).length}</span>
            </button>
          ))}
        </div>
      </div>

      <nav className="side-nav" style={{ marginTop: 'auto' }}>
        <button className={`side-item${viewType === 'trash' ? ' active' : ''}`} onClick={() => onViewChange('trash')}>
          <span>🗑️ Trash</span>
          <span className="badge">{countTrash}</span>
        </button>
        <button className="side-item" onClick={onOpenGraph}>
          <span>🔗 Graph</span>
        </button>
        <button className="side-item" onClick={onOpenSettings}>
          <span>⚙️ Settings</span>
        </button>
      </nav>

      <footer className="sidebar-foot">
        <button className="side-item" onClick={onBackup}>
          <span>💾 Backup</span>
        </button>
        <button className="side-item" onClick={onRestore}>
          <span>📂 Restore</span>
        </button>
      </footer>
    </aside>
  );
}
