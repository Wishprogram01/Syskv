import type { Settings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  settings: Settings;
  onClose: () => void;
  onToggleDark: () => void;
  onEnableNotifications: () => void;
}

export function SettingsModal({ isOpen, settings, onClose, onToggleDark, onEnableNotifications }: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div id="settingsOverlay" className="overlay" onClick={onClose} />
      <div id="settingsModal" className="modal">
        <div className="modal-head">
          <h3>Settings</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close settings">×</button>
        </div>
        <label className="setting-row">
          <span>Dark mode</span>
          <input type="checkbox" checked={settings.dark} onChange={onToggleDark} />
        </label>
        <label className="setting-row">
          <span>Enable reminders & notifications</span>
          <button className="btn ghost" onClick={onEnableNotifications}>Enable</button>
        </label>
        <label className="setting-row">
          <span>Keyboard shortcuts</span>
          <span className="muted small">Ctrl+K palette · Ctrl+N new · Ctrl+S save · Ctrl+Z undo · Ctrl+Shift+Z redo · Esc close</span>
        </label>
      </div>
    </>
  );
}
