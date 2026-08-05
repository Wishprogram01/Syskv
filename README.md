# Syskv Notes

An **advanced** note-taking app built with plain HTML, CSS, and vanilla JavaScript. No build step, no backend — everything runs in your browser and stores notes in `localStorage`. This means **every feature works on static hosting like GitHub Pages**.

## Features

### Core
- Create, edit, and delete notes
- Autosave while typing (800ms debounce)
- Full-text search + fuzzy highlight, supports `#tag` search
- Grid view with color-coded cards

### Structure
- **Notebooks** — organize notes, drag a card onto a notebook to move it
- **Tags** — comma-separated, filterable from the sidebar
- **Pinned notes** — always stay on top
- **Trash** — move to trash, restore, or delete forever

### Markdown
- Live preview tab (headings, bold, italic, strike, code, lists, quotes, tables, links)
- **Backlinks** — write `[[Another Note]]` and it becomes a clickable link

### Productivity
- **Command Palette** (`Ctrl+K`) — new note, open note, dark mode, backup, graph, trash
- **Reminders / notifications** — set a datetime on any note
- **Keyboard shortcuts** — see below
- **Undo / Redo** (`Ctrl+Z` / `Ctrl+Shift+Z`)

### Sharing & Data
- **Share via link** — one click, receiver can "Save to my notes"
- **Export** — download a note as `.md`, or full JSON backup
- **Restore** — import a JSON backup
- **Print / PDF** — prints a clean readable version

### App
- **Dark mode** (persisted)
- **PWA** — installable, works fully offline

## Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `Ctrl+K` | Command palette |
| `Ctrl+N` | New note |
| `Ctrl+S` | Save |
| `Ctrl+Enter` | Save |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / Redo |
| `Ctrl+Shift+D` | Toggle dark mode |
| `Esc` | Close |

## Files

- `index.html` — structure & modals
- `style.css` — styling (light/dark, responsive)
- `script.js` — all logic
- `manifest.webmanifest`, `sw.js`, `icon.svg` — PWA
- `README.md` — this file

## Usage

Open `index.html` in any browser, or serve the folder locally:

```
npx serve .
```

> Note: Notes are stored per-browser via `localStorage`. Clearing browser data removes notes — use **Backup** to keep a copy.

## GitHub Pages Deployment (free)

1. Create a repo on GitHub and push these files.
2. **Repo → Settings → Pages → Source** → pick your branch + `/ (root)`, Save.
3. Done — it's live at `https://<username>.github.io/<repo-name>/`.
   - PWA + notifications activate automatically over HTTPS.

## Notes on limitations

- **Reminders**: notifications only fire while the app/tab is open. For background reminders you'd need a push server (Service Worker push, Firebase).
- **Sync across devices / accounts**: not included by default. To add it, connect Firebase or Supabase (both have free tiers) and swap the `loadJSON`/`persistAll` functions for their realtime database calls. Everything else stays the same.