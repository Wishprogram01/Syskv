"use strict";

/* ============================================================
   Syskv Notes — advanced note taker
   Storage: localStorage only. All features work on static hosting.
   ============================================================ */

const NOTES_KEY = "syskv_notes";
const SETTINGS_KEY = "syskv_settings";
const NOTIFIED_KEY = "syskv_notified";

/* ---------------- State ---------------- */
let notes = loadJSON(NOTES_KEY, []);
let settings = loadJSON(SETTINGS_KEY, { dark: false, sidebarOpen: true });
let notified = loadJSON(NOTIFIED_KEY, {});

let currentId = null;
let searchQuery = "";
let view = { type: "all", value: null }; // all | pinned | notebook | tag | trash
let undoStack = [];
let redoStack = [];
let paletteItems = [];
let paletteSel = 0;
let autosaveTimer = null;
let previewDirty = true;

/* ---------------- Helpers ---------------- */
const $ = (id) => document.getElementById(id);

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function saveJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function persistAll() { saveJSON(NOTES_KEY, notes); saveJSON(SETTINGS_KEY, settings); }

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function formatDate(ts) {
  return new Date(ts).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function stripMd(s) {
  return String(s).replace(/[#*`>|\[\]()_~-]/g, " ").replace(/\s+/g, " ").trim();
}
function noteById(id) { return notes.find((n) => n.id === id); }
function now() { return Date.now(); }

/* ---------------- Undo / Redo ---------------- */
function snapshot() {
  undoStack.push(JSON.stringify(notes));
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
}
function undo() {
  if (!undoStack.length) return;
  redoStack.push(JSON.stringify(notes));
  notes = JSON.parse(undoStack.pop());
  persistAll(); render();
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(JSON.stringify(notes));
  notes = JSON.parse(redoStack.pop());
  persistAll(); render();
}

/* ---------------- Markdown ---------------- */
function renderMarkdown(md) {
  const lines = String(md).split("\n");
  const out = [];
  let inCode = false, codeBuf = [];
  let listStack = [];

  const closeList = () => { while (listStack.length) { out.push(listStack.pop()); } };
  const flushCode = () => {
    out.push("<pre><code>" + esc(codeBuf.join("\n")) + "</code></pre>");
    codeBuf = [];
  };

  for (const raw of lines) {
    if (inCode) {
      if (raw.trim().startsWith("```")) { inCode = false; flushCode(); }
      else codeBuf.push(raw);
      continue;
    }
    if (raw.trim().startsWith("```")) { closeList(); inCode = true; continue; }

    const t = raw.trim();
    if (!t) { closeList(); continue; }

    // headings
    const h = t.match(/^(#{1,6})\s+(.*)$/);
    if (h) { closeList(); out.push(`<h${h[1].length}>${inline(t.slice(h[1].length + 1))}</h${h[1].length}>`); continue; }

    // hr
    if (/^(-{3,}|\*{3,})$/.test(t)) { closeList(); out.push("<hr>"); continue; }

    // table
    if (t.startsWith("|")) { out.push(renderTable(lines, lines.indexOf(raw))); continue; }

    // list
    const ul = t.match(/^[-*+]\s+(.*)$/);
    const ol = t.match(/^\d+[.)]\s+(.*)$/);
    if (ul) { openList(out, listStack, "ul"); out.push(`<li>${inline(ul[1])}</li>`); continue; }
    if (ol) { openList(out, listStack, "ol"); out.push(`<li>${inline(ol[1])}</li>`); continue; }

    closeList();
    if (t.startsWith("> ")) out.push(`<blockquote>${inline(t.slice(2))}</blockquote>`);
    else out.push(`<p>${inline(t)}</p>`);
  }
  closeList();
  if (inCode) flushCode();
  return out.join("\n");
}
function openList(out, stack, tag) {
  if (stack.length && stack[stack.length - 1] === tag) return;
  if (stack.length) out.push(stack.pop());
  out.push(`<${tag}>`);
  stack.push(`</${tag}>`);
}
function inline(s) {
  let h = esc(s);
  h = h.replace(/`([^`]+)`/g, (m, c) => `<code>${c}</code>`);
  h = h.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  h = h.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  h = h.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  h = h.replace(/\[\[([^\]]+)\]\]/g, (m, title) => {
    const hit = notes.find((n) => n.title.toLowerCase() === title.trim().toLowerCase() && !n.trashed);
    if (hit) return `<a class="backlink" href="#note-${hit.id}">${esc(hit.title)}</a>`;
    return `<span class="backlink muted">[[${esc(title)}]]</span>`;
  });
  return h;
}
function renderTable(lines, i) {
  const rows = [];
  for (let j = i; j < lines.length; j++) {
    if (!lines[j].trim().startsWith("|")) break;
    rows.push(lines[j].trim());
  }
  const cells = rows.map((r) => r.replace(/^\||\|$/g, "").split("|").map((c) => inline(c.trim())));
  const head = cells[0] || [];
  let html = "<table><thead><tr>" + head.map((c) => `<th>${c}</th>`).join("") + "</tr></thead><tbody>";
  for (let r = 2; r < cells.length; r++) {
    html += "<tr>" + cells[r].map((c) => `<td>${c}</td>`).join("") + "</tr>";
  }
  return html + "</tbody></table>";
}

/* ---------------- Reminders ---------------- */
function requestNotifyPermission() {
  if (!("Notification" in window)) { alert("Notifications not supported in this browser."); return; }
  Notification.requestPermission().then((p) => {
    if (p === "granted") alert("Notifications enabled. Set a date on a note to get reminded.");
    else alert("Permission denied. You can change it in your browser settings.");
  });
}
function checkReminders() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const nowTs = now();
  notes.forEach((n) => {
    if (!n.due || notified[n.id] === n.due) return;
    if (n.due <= nowTs) {
      notified[n.id] = n.due;
      saveJSON(NOTIFIED_KEY, notified);
      new Notification(n.title || "Untitled", { body: "Reminder for your note" });
    }
  });
}

/* ---------------- Search & filters ---------------- */
function parseSearch(q) {
  const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const tags = [];
  const words = [];
  tokens.forEach((t) => {
    if (t.startsWith("#")) tags.push(t.slice(1));
    else if (t.startsWith("notebook:")) { /* handled separately if needed */ }
    else words.push(t);
  });
  return { tags, words };
}
function getVisibleNotes() {
  const { tags, words } = parseSearch(searchQuery);
  let list = notes.filter((n) => {
    if (view.type === "trash") return n.trashed;
    if (n.trashed) return false;
    if (view.type === "pinned" && !n.pinned) return false;
    if (view.type === "notebook" && n.notebook !== view.value) return false;
    if (view.type === "tag" && !(n.tags || []).includes(view.value)) return false;
    return true;
  });
  list = list.filter((n) => {
    const hay = (n.title + " " + n.body + " " + (n.tags || []).join(" ")).toLowerCase();
    if (!words.every((w) => hay.includes(w))) return false;
    if (!tags.every((t) => (n.tags || []).map((x) => x.toLowerCase()).includes(t))) return false;
    return true;
  });
  return list.sort((a, b) => (b.pinned - a.pinned) || (b.updated - a.updated));
}
function highlight(s) {
  const { words } = parseSearch(searchQuery);
  if (!words.length) return esc(s);
  let h = esc(s);
  words.forEach((w) => {
    h = h.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"), "<mark>$1</mark>");
  });
  return h;
}

/* ---------------- Render ---------------- */
function render() {
  renderSidebar();
  updateViewTitle();
  const list = getVisibleNotes();
  const grid = $("notesGrid");
  grid.innerHTML = "";
  const empty = $("emptyState");

  if (!list.length) {
    empty.classList.remove("hidden");
    empty.innerHTML = view.type === "trash" && !searchQuery
      ? "<p>Trash is empty.</p>"
      : `<p>No notes match. Try Ctrl+K or "+ New Note".</p>`;
    return;
  }
  empty.classList.add("hidden");

  list.forEach((n) => {
    const card = document.createElement("div");
    card.className = "note-card" + (n.pinned ? " pinned" : "");
    if (n.color) card.style.borderLeftColor = n.color;
    card.draggable = true;
    card.dataset.id = n.id;
    card.addEventListener("click", () => openEditor(n.id));
    card.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", n.id); });

    const titleRow = document.createElement("div");
    titleRow.className = "card-title";
    if (n.pinned) { const pi = document.createElement("span"); pi.className = "pin-ic"; pi.textContent = "\u{1F4CC}"; titleRow.appendChild(pi); }
    const title = document.createElement("h3");
    title.innerHTML = highlight(n.title || "Untitled");
    titleRow.appendChild(title);

    const preview = document.createElement("div");
    preview.className = "preview";
    preview.innerHTML = highlight(stripMd(n.body)) || "<span class=\"muted\">Empty note</span>";

    const meta = document.createElement("div");
    meta.className = "card-meta";

    const chips = document.createElement("div");
    chips.className = "chips";
    (n.tags || []).slice(0, 3).forEach((t) => {
      const c = document.createElement("span");
      c.className = "chip";
      c.textContent = "#" + t;
      chips.appendChild(c);
    });
    if (n.due) {
      const c = document.createElement("span");
      c.className = "chip due-chip" + (n.due < now() ? " over" : "");
      c.textContent = "\u23F3 " + formatDate(n.due);
      chips.appendChild(c);
    }

    const time = document.createElement("time");
    time.textContent = formatDate(n.updated);

    meta.append(chips, time);
    card.append(titleRow, preview, meta);

    if (view.type === "trash") {
      const actions = document.createElement("div");
      actions.className = "card-meta";
      const restore = document.createElement("button");
      restore.className = "btn ghost small-btn";
      restore.textContent = "Restore";
      restore.dataset.restore = n.id;
      const perm = document.createElement("button");
      perm.className = "btn danger small-btn";
      perm.textContent = "Delete forever";
      perm.dataset.perm = n.id;
      [restore, perm].forEach((b) => { b.addEventListener("click", (e) => e.stopPropagation()); });
      actions.append(restore, perm);
      card.appendChild(actions);
    }

    grid.appendChild(card);
  });
}

function renderSidebar() {
  const notebooks = [...new Set(notes.filter((n) => n.notebook && !n.trashed).map((n) => n.notebook))].sort();
  const tags = [...new Set(notes.flatMap((n) => (n.trashed ? [] : n.tags || [])))].sort();

  $("countAll").textContent = notes.filter((n) => !n.trashed).length;
  $("countPinned").textContent = notes.filter((n) => n.pinned && !n.trashed).length;
  $("countTrash").textContent = notes.filter((n) => n.trashed).length;

  const nbList = $("notebookList");
  nbList.innerHTML = "";
  notebooks.forEach((nb) => {
    const b = mkSideItem(nb, notebookCount(nb), view.type === "notebook" && view.value === nb);
    b.dataset.notebook = nb;
    b.addEventListener("click", () => { setView("notebook", nb); });
    nbList.appendChild(b);
  });
  const addNb = document.createElement("button");
  addNb.className = "side-item notebook-new";
  addNb.textContent = "+ Notebook";
  addNb.addEventListener("click", () => {
    const name = prompt("Notebook name:");
    if (name && name.trim()) { setView("notebook", name.trim()); }
  });
  nbList.appendChild(addNb);

  const tagList = $("tagList");
  tagList.innerHTML = "";
  tags.forEach((t) => {
    const b = mkSideItem("#" + t, tagCount(t), view.type === "tag" && view.value === t);
    b.addEventListener("click", () => { setView("tag", t); });
    tagList.appendChild(b);
  });
}

function mkSideItem(label, count, active) {
  const b = document.createElement("button");
  b.className = "side-item" + (active ? " active" : "");
  const span = document.createElement("span");
  span.textContent = label;
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = count;
  b.append(span, badge);
  return b;
}
function notebookCount(nb) { return notes.filter((n) => n.notebook === nb && !n.trashed).length; }
function tagCount(t) { return notes.filter((n) => !n.trashed && (n.tags || []).includes(t)).length; }

function updateViewTitle() {
  let title = "All Notes", sub = "";
  if (view.type === "pinned") title = "Pinned";
  else if (view.type === "notebook") title = "Notebook: " + view.value;
  else if (view.type === "tag") title = "Tag: #" + view.value;
  else if (view.type === "trash") title = "Trash";
  const n = getVisibleNotes().length;
  sub = searchQuery ? `${n} result${n === 1 ? "" : "s"}` : `${n} note${n === 1 ? "" : "s"}`;
  $("viewTitle").textContent = title;
  $("viewSub").textContent = sub;
}
function setView(type, value) {
  view = { type, value };
  document.querySelectorAll(".side-item").forEach((el) => el.classList.remove("active"));
  const isTrash = type === "trash";
  $("newNoteBtn").disabled = isTrash;
  render();
}
function activeSideItem() {
  return document.querySelector(`.side-item[data-view="${view.type}"]`);
}

/* ---------------- Editor ---------------- */
function openEditor(id, isTrash) {
  currentId = id;
  const note = noteById(id);
  previewDirty = true;

  $("noteTitle").value = note ? note.title : "";
  $("noteBody").value = note ? note.body : "";
  $("tagInput").value = note && note.tags ? note.tags.join(", ") : "";
  $("notebookSelect").value = note && note.notebook ? note.notebook : "";
  $("dueDate").value = note && note.due ? toLocalInput(note.due) : "";
  $("pinToggle").checked = note ? !!note.pinned : false;
  $("deleteBtn").classList.toggle("hidden", !note);
  $("deleteBtn").textContent = isTrash || (note && note.trashed) ? "Delete forever" : "Trash";
  $("shareBtn").classList.toggle("hidden", !note);
  $("exportBtn").classList.toggle("hidden", !note);
  $("tabWrite").classList.add("active");
  $("tabPreview").classList.remove("active");
  $("writePane").classList.remove("hidden");
  $("previewPane").classList.add("hidden");

  document.querySelectorAll(".swatch").forEach((s) => s.classList.toggle("active", (s.dataset.c || null) === (note ? note.color || "" : "")));

  $("overlay").classList.remove("hidden");
  $("editor").classList.remove("hidden");
  updateStats();
  $("noteTitle").focus();
}
function closeEditor() {
  $("overlay").classList.add("hidden");
  $("editor").classList.add("hidden");
  currentId = null;
  render();
}
function toLocalInput(ts) {
  const d = new Date(ts);
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(v) { return v ? new Date(v).getTime() : null; }

function saveNote(silent) {
  const title = $("noteTitle").value.trim();
  const body = $("noteBody").value.trim();
  if (!title && !body) { closeEditor(); return; }

  snapshot();
  if (currentId) {
    const note = noteById(currentId);
    if (note) {
      note.title = title;
      note.body = body;
      note.tags = parseTags($("tagInput").value);
      note.notebook = $("notebookSelect").value || null;
      note.due = fromLocalInput($("dueDate").value);
      note.pinned = $("pinToggle").checked;
      note.updated = now();
    }
  } else {
    notes.push({
      id: uid(), title, body,
      tags: parseTags($("tagInput").value),
      notebook: $("notebookSelect").value || null,
      color: "",
      due: fromLocalInput($("dueDate").value),
      pinned: $("pinToggle").checked,
      trashed: false,
      created: now(), updated: now(),
    });
  }
  persistAll();
  if (!silent) render();
}
function parseTags(v) { return v.split(",").map((t) => t.trim()).filter(Boolean); }

function trashCurrent() {
  if (!currentId) return;
  const note = noteById(currentId);
  if (!note) return;
  snapshot();
  if (note.trashed) {
    notes = notes.filter((n) => n.id !== currentId);
  } else {
    note.trashed = true;
    note.updated = now();
  }
  persistAll(); closeEditor();
}
function restoreNote(id) {
  const note = notes.find((n) => n.id === id);
  if (note) { note.trashed = false; note.updated = now(); }
  persistAll(); render();
}
function emptyTrash() {
  if (!confirm("Permanently delete all trashed notes?")) return;
  snapshot();
  notes = notes.filter((n) => !n.trashed);
  persistAll(); render();
}
function emptyTrashItem(id) {
  snapshot();
  notes = notes.filter((n) => n.id !== id);
  persistAll(); render();
}

function updateStats() {
  const title = $("noteTitle").value.trim();
  const body = $("noteBody").value;
  const words = stripMd(body).split(/\s+/).filter(Boolean).length;
  const chars = body.length;
  const mins = Math.max(1, Math.round(words / 200));
  $("noteStats").textContent = `${words} words \u00B7 ${chars} chars \u00B7 ${mins} min read`;
}

function refreshPreview() {
  if (previewDirty) {
    $("previewPane").innerHTML = renderMarkdown($("noteBody").value || "<span class=\"muted\">Nothing to preview</span>");
    previewDirty = false;
  }
}

/* ---------------- Sharing ---------------- */
function shareNote() {
  const note = noteById(currentId);
  if (!note) return;
  const payload = { v: 1, title: note.title, body: note.body, tags: note.tags || [], created: note.created };
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const url = location.origin + location.pathname + "#share=" + b64;
  $("shareUrl").value = url;
  $("shareOverlay").classList.remove("hidden");
  $("shareModal").classList.remove("hidden");
}
function openShare() {
  const m = location.hash.match(/^#share=(.+)$/);
  if (!m) return;
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(m[1]))));
    $("viewerTitle").textContent = data.title || "Untitled";
    $("viewerBody").innerHTML = renderMarkdown(data.body || "");
    $("viewerOverlay").classList.remove("hidden");
    $("viewer").classList.remove("hidden");
    $("viewerSave").onclick = () => {
      snapshot();
      notes.push({ id: uid(), title: data.title || "", body: data.body || "", tags: data.tags || [], notebook: null, color: "", due: null, pinned: false, trashed: false, created: now(), updated: now() });
      persistAll(); closeViewer(); render();
    };
  } catch { /* ignore bad hash */ }
}
function closeViewer() { $("viewerOverlay").classList.add("hidden"); $("viewer").classList.add("hidden"); history.replaceState(null, "", location.pathname); }

/* ---------------- Export / Import ---------------- */
function exportNote() {
  const note = noteById(currentId);
  if (!note) return;
  const a = document.createElement("a");
  a.download = (note.title || "untitled").replace(/[\\/:*?"<>|]/g, "_") + ".md";
  a.href = URL.createObjectURL(new Blob([note.body], { type: "text/markdown" }));
  a.click();
  URL.revokeObjectURL(a.href);
}
function printNote() {
  const note = noteById(currentId);
  if (!note) return;
  const area = $("printArea");
  area.innerHTML = `<h1>${esc(note.title || "Untitled")}</h1>${renderMarkdown(note.body || "")}`;
  window.print();
  area.innerHTML = "";
}
function backupAll() {
  const a = document.createElement("a");
  a.download = "notes-backup-" + new Date().toISOString().slice(0, 10) + ".json";
  a.href = URL.createObjectURL(new Blob([JSON.stringify(notes, null, 2)], { type: "application/json" }));
  a.click();
  URL.revokeObjectURL(a.href);
}
function restoreBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error("bad");
      const keep = confirm(`Replace all ${notes.length} notes with ${data.length} from backup?`);
      if (keep) { snapshot(); notes = data; persistAll(); render(); }
    } catch { alert("Invalid backup file."); }
  };
  reader.readAsText(file);
}

/* ---------------- Graph ---------------- */
function openGraph() {
  const list = notes.filter((n) => !n.trashed);
  if (list.length < 2) { alert("Add at least 2 notes to see the graph."); return; }
  const width = 620, height = 420, cx = width / 2, cy = height / 2, R = Math.max(80, (Math.min(width, height) / 2) - 60);
  const links = [];
  const edges = new Set();

  list.forEach((n) => {
    const refs = (n.body + n.title).match(/\[\[([^\]]+)\]\]/g) || [];
    refs.forEach((r) => {
      const target = list.find((x) => x.title.toLowerCase() === r.slice(2, -2).trim().toLowerCase());
      if (target && target.id !== n.id) {
        const key = [n.id, target.id].sort().join("|");
        if (!edges.has(key)) { edges.add(key); links.push([n.id, target.id]); }
      }
    });
  });

  const angles = list.map((_, i) => (i / list.length) * Math.PI * 2);
  const pos = new Map();
  list.forEach((n, i) => pos.set(n.id, {
    x: cx + R * Math.cos(angles[i]),
    y: cy + R * Math.sin(angles[i]),
  }));

  let svg = `<svg viewBox="0 0 ${width} ${height}">`;
  svg += `<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="var(--border)"/></marker></defs>`;
  links.forEach(([a, b]) => {
    const p = pos.get(a), q = pos.get(b);
    svg += `<line class="graph-edge" x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/>`;
  });
  list.forEach((n) => {
    const p = pos.get(n.id);
    const r = (n.title.length * 3.4 + 14) / 2;
    svg += `<g class="graph-node" data-id="${n.id}">`;
    svg += `<circle class="graph-node${n.pinned ? " pinned" : ""}" cx="${p.x}" cy="${p.y}" r="${r}"/>`;
    const label = n.title.length > 12 ? n.title.slice(0, 11) + "\u2026" : n.title || "Untitled";
    svg += `<text class="graph-label" x="${p.x}" y="${p.y + 4}" text-anchor="middle">${esc(label)}</text>`;
    svg += `</g>`;
  });
  svg += "</svg>";

  const canvas = $("graphCanvas");
  canvas.innerHTML = svg;
  canvas.querySelectorAll(".graph-node").forEach((g) => {
    g.addEventListener("click", () => {
      const id = g.dataset.id;
      closeGraph();
      openEditor(id);
    });
  });
  $("graphOverlay").classList.remove("hidden");
  $("graphModal").classList.remove("hidden");
}
function closeGraph() { $("graphOverlay").classList.add("hidden"); $("graphModal").classList.add("hidden"); }

/* ---------------- Command palette ---------------- */
function openPalette() {
  $("paletteOverlay").classList.remove("hidden");
  $("palette").classList.remove("hidden");
  paletteItems = [];
  paletteSel = 0;
  $("paletteInput").value = "";
  $("paletteInput").focus();
  updatePaletteList();
}
function closePalette() { $("paletteOverlay").classList.add("hidden"); $("palette").classList.add("hidden"); }
function updatePaletteList() {
  const q = $("paletteInput").value.trim().toLowerCase();
  const items = [];
  if (!q) {
    items.push({ label: "New note", hint: "Ctrl+N", action: () => { closePalette(); openEditor(null); } });
    items.push({ label: "Toggle dark mode", hint: "Ctrl+Shift+D", action: () => toggleDark() });
    items.push({ label: "Backup all notes (JSON)", hint: "", action: () => backupAll() });
    items.push({ label: "Restore from backup", hint: "", action: () => $("importFile").click() });
    items.push({ label: "Open graph view", hint: "", action: () => { closePalette(); openGraph(); } });
    items.push({ label: "Trash", hint: "", action: () => { closePalette(); setView("trash"); } });
    items.push({ label: "Enable notifications", hint: "", action: () => requestNotifyPermission() });
    getVisibleNotes().slice(0, 8).forEach((n) => {
      items.push({ label: "Open: " + (n.title || "Untitled"), hint: "note", action: () => { closePalette(); openEditor(n.id); } });
    });
  } else {
    items.push({ label: "New note: \u201C" + q + "\u201D", hint: "Enter", action: () => { closePalette(); openEditor(null); $("noteTitle").value = q; } });
    getVisibleNotes().slice(0, 20).forEach((n) => {
      items.push({ label: "Open: " + (n.title || "Untitled"), hint: "note", action: () => { closePalette(); openEditor(n.id); } });
    });
  }
  paletteItems = items;
  renderPalette();
}
function renderPalette() {
  const list = $("paletteList");
  list.innerHTML = "";
  paletteItems.forEach((it, i) => {
    const b = document.createElement("button");
    b.className = "palette-item" + (i === paletteSel ? " sel" : "");
    const l = document.createElement("span");
    l.textContent = it.label;
    const h = document.createElement("span");
    h.className = "kbd";
    h.textContent = it.hint;
    b.append(l, h);
    b.addEventListener("mousemove", () => { paletteSel = i; renderPalette(); });
    b.addEventListener("click", it.action);
    list.appendChild(b);
  });
}

/* ---------------- Dark mode ---------------- */
function applyDark() {
  document.body.classList.toggle("dark", settings.dark);
  $("settingsDark").checked = settings.dark;
  $("darkBtn").innerHTML = settings.dark ? "\u2600" : "\u263E";
}
function toggleDark() {
  settings.dark = !settings.dark;
  saveJSON(SETTINGS_KEY, settings);
  applyDark();
}

/* ---------------- Autosave & events ---------------- */
function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    if (currentId !== null && !$("editor").classList.contains("hidden")) saveNote(true);
  }, 800);
}

/* ---------------- Init ---------------- */
function init() {
  applyDark();
  if (!settings.sidebarOpen) $("sidebar").classList.add("closed");

  render();
  refreshPreview();
  openShare();

  $("newNoteBtn").addEventListener("click", () => openEditor(null));
  $("openSidebarBtn").addEventListener("click", () => { settings.sidebarOpen = true; saveJSON(SETTINGS_KEY, settings); $("sidebar").classList.remove("closed"); $("openSidebarBtn").classList.add("hidden"); });
  $("toggleSidebarBtn").addEventListener("click", () => { settings.sidebarOpen = false; saveJSON(SETTINGS_KEY, settings); $("sidebar").classList.add("closed"); $("openSidebarBtn").classList.remove("hidden"); });

  document.querySelectorAll(".side-item[data-view]").forEach((b) => {
    b.addEventListener("click", () => setView(b.dataset.view));
  });

  $("searchInput").addEventListener("input", (e) => { searchQuery = e.target.value; render(); });

  $("closeEditorBtn").addEventListener("click", () => { saveNote(true); closeEditor(); });
  $("overlay").addEventListener("click", () => { saveNote(true); closeEditor(); });
  $("saveBtn").addEventListener("click", () => saveNote());

  $("noteTitle").addEventListener("input", () => { updateStats(); scheduleAutosave(); });
  $("noteBody").addEventListener("input", () => { updateStats(); previewDirty = true; scheduleAutosave(); });
  $("tagInput").addEventListener("input", scheduleAutosave);
  $("notebookSelect").addEventListener("change", scheduleAutosave);
  $("dueDate").addEventListener("change", scheduleAutosave);
  $("pinToggle").addEventListener("change", scheduleAutosave);

  $("tabWrite").addEventListener("click", () => {
    $("tabWrite").classList.add("active"); $("tabPreview").classList.remove("active");
    $("writePane").classList.remove("hidden"); $("previewPane").classList.add("hidden");
  });
  $("tabPreview").addEventListener("click", () => {
    refreshPreview();
    $("tabWrite").classList.remove("active"); $("tabPreview").classList.add("active");
    $("writePane").classList.add("hidden"); $("previewPane").classList.remove("hidden");
  });

  $("deleteBtn").addEventListener("click", () => {
    const note = noteById(currentId);
    if (note && note.trashed && !confirm("Delete forever?")) return;
    if (!note || !note.trashed && !confirm("Move to trash?")) return;
    trashCurrent();
  });

  $("shareBtn").addEventListener("click", shareNote);
  $("exportBtn").addEventListener("click", exportNote);
  $("backupBtn").addEventListener("click", backupAll);
  $("restoreBtn").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", (e) => { if (e.target.files[0]) restoreBackup(e.target.files[0]); e.target.value = ""; });

  document.querySelectorAll(".swatch").forEach((s) => {
    s.addEventListener("click", () => {
      const note = noteById(currentId);
      if (note) {
        note.color = s.dataset.c || "";
        persistAll();
        document.querySelectorAll(".swatch").forEach((x) => x.classList.toggle("active", x === s));
        scheduleAutosave();
      }
    });
  });

  $("paletteBtn").addEventListener("click", openPalette);
  $("paletteOverlay").addEventListener("click", closePalette);
  $("paletteInput").addEventListener("input", updatePaletteList);
  $("paletteInput").addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { paletteSel = (paletteSel + 1) % paletteItems.length; renderPalette(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { paletteSel = (paletteSel - 1 + paletteItems.length) % paletteItems.length; renderPalette(); e.preventDefault(); }
    else if (e.key === "Enter") { paletteItems[paletteSel] && paletteItems[paletteSel].action(); }
  });

  $("graphBtn").addEventListener("click", openGraph);
  $("graphClose").addEventListener("click", closeGraph);
  $("graphOverlay").addEventListener("click", closeGraph);

  $("shareClose").addEventListener("click", () => { $("shareOverlay").classList.add("hidden"); $("shareModal").classList.add("hidden"); });
  $("shareOverlay").addEventListener("click", () => { $("shareOverlay").classList.add("hidden"); $("shareModal").classList.add("hidden"); });
  $("copyBtn").addEventListener("click", () => {
    $("shareUrl").select();
    navigator.clipboard && navigator.clipboard.writeText($("shareUrl").value);
    $("copyBtn").textContent = "Copied!";
    setTimeout(() => ($("copyBtn").textContent = "Copy"), 1500);
  });

  $("settingsBtn").addEventListener("click", () => { $("settingsOverlay").classList.remove("hidden"); $("settingsModal").classList.remove("hidden"); });
  $("settingsClose").addEventListener("click", () => { $("settingsOverlay").classList.add("hidden"); $("settingsModal").classList.add("hidden"); });
  $("settingsOverlay").addEventListener("click", () => { $("settingsOverlay").classList.add("hidden"); $("settingsModal").classList.add("hidden"); });
  $("settingsDark").addEventListener("change", (e) => { settings.dark = e.target.checked; saveJSON(SETTINGS_KEY, settings); applyDark(); });
  $("notifyBtn").addEventListener("click", requestNotifyPermission);

  $("viewerClose").addEventListener("click", closeViewer);
  $("viewerOverlay").addEventListener("click", closeViewer);

  // Drag notes into notebooks
  $("notesGrid").addEventListener("dragover", (e) => e.preventDefault());
  $("notebookList").addEventListener("dragover", (e) => e.preventDefault());
  $("notebookList").addEventListener("drop", (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const target = e.target.closest(".side-item");
    const name = target && target.dataset.notebook;
    const note = noteById(id);
    if (note && name) {
      snapshot();
      note.notebook = name;
      note.updated = now();
      persistAll(); render();
    }
  });

  // Trash actions
  document.addEventListener("click", (e) => {
    const restoreBtn = e.target.closest("[data-restore]");
    if (restoreBtn) { restoreNote(restoreBtn.dataset.restore); return; }
    const permBtn = e.target.closest("[data-perm]");
    if (permBtn) { emptyTrashItem(permBtn.dataset.perm); }
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!$("palette").classList.contains("hidden")) { closePalette(); return; }
      if (!$("graphModal").classList.contains("hidden")) { closeGraph(); return; }
      if (!$("shareModal").classList.contains("hidden")) { $("shareOverlay").classList.add("hidden"); $("shareModal").classList.add("hidden"); return; }
      if (!$("settingsModal").classList.contains("hidden")) { $("settingsOverlay").classList.add("hidden"); $("settingsModal").classList.add("hidden"); return; }
      if (!$("viewer").classList.contains("hidden")) { closeViewer(); return; }
      if (!$("editor").classList.contains("hidden")) { saveNote(true); closeEditor(); }
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); }
      if (e.key.toLowerCase() === "n") { e.preventDefault(); openEditor(null); }
      if (e.key.toLowerCase() === "s") { e.preventDefault(); saveNote(); }
      if (e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey)) { e.preventDefault(); redo(); }
      if (e.key.toLowerCase() === "d" && e.shiftKey) { e.preventDefault(); toggleDark(); }
      return;
    }
    if (e.key === "Enter" && e.ctrlKey && !$("editor").classList.contains("hidden")) saveNote();
  });

  // Backlink hash navigation
  window.addEventListener("hashchange", () => {
    const m = location.hash.match(/^#note-(.+)$/);
    if (m) {
      const note = notes.find((n) => n.id === m[1]);
      if (note) { openEditor(note.id); history.replaceState(null, "", location.pathname); }
    }
    openShare();
  });

  // Reminder loop
  checkReminders();
  setInterval(checkReminders, 30000);

  // PWA service worker
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  render();
}
document.addEventListener("DOMContentLoaded", init);