import { esc, stripMd } from './helpers';

export function renderMarkdown(md: string, notes: { title: string; id: string; trashed: boolean }[] = []): string {
  const lines = String(md).split('\n');
  const out: string[] = [];
  let inCode = false;
  const codeBuf: string[] = [];
  let listStack: string[] = [];

  const closeList = () => {
    while (listStack.length) {
      out.push(`</${listStack.pop()}>`);
    }
  };

  const flushCode = () => {
    out.push('<pre><code>' + esc(codeBuf.join('\n')) + '</code></pre>');
    codeBuf.length = 0;
  };

  const inline = (s: string): string => {
    let h = esc(s);
    h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
    h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    h = h.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    h = h.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    h = h.replace(/\[\[([^\]]+)\]\]/g, (_m, title) => {
      const hit = notes.find(n => n.title.toLowerCase() === title.trim().toLowerCase() && !n.trashed);
      if (hit) return `<a class="backlink" href="#note-${hit.id}">${esc(hit.title)}</a>`;
      return `<span class="backlink muted">[[${esc(title)}]]</span>`;
    });
    return h;
  };

  const renderTable = (lines: string[], i: number): string => {
    const rows: string[][] = [];
    for (let j = i; j < lines.length; j++) {
      if (!lines[j].trim().startsWith('|')) break;
      rows.push(lines[j].trim().replace(/^\||\|$/g, '').split('|').map(c => inline(c.trim())));
    }
    const head = rows[0] || [];
    let html = '<table><thead><tr>' + head.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
    for (let r = 2; r < rows.length; r++) {
      html += '<tr>' + rows[r].map(c => `<td>${c}</td>`).join('') + '</tr>';
    }
    return html + '</tbody></table>';
  };

  const openList = (tag: string) => {
    if (listStack.length && listStack[listStack.length - 1] === tag) return;
    if (listStack.length) out.push(`</${listStack.pop()}>`);
    out.push(`<${tag}>`);
    listStack.push(tag);
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (inCode) {
      if (raw.trim().startsWith('```')) { inCode = false; flushCode(); }
      else codeBuf.push(raw);
      continue;
    }
    if (raw.trim().startsWith('```')) { closeList(); inCode = true; continue; }

    const t = raw.trim();
    if (!t) { closeList(); continue; }

    const h = t.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      closeList();
      out.push(`<h${h[1].length}>${inline(t.slice(h[1].length + 1))}</h${h[1].length}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(t)) { closeList(); out.push('<hr>'); continue; }
    if (t.startsWith('|')) { out.push(renderTable(lines, i)); continue; }

    const ul = t.match(/^[-*+]\s+(.*)$/);
    const ol = t.match(/^\d+[.)]\s+(.*)$/);
    if (ul) { openList('ul'); out.push(`<li>${inline(ul[1])}</li>`); continue; }
    if (ol) { openList('ol'); out.push(`<li>${inline(ol[1])}</li>`); continue; }

    closeList();
    if (t.startsWith('> ')) out.push(`<blockquote>${inline(t.slice(2))}</blockquote>`);
    else out.push(`<p>${inline(t)}</p>`);
  }

  closeList();
  if (inCode) flushCode();
  return out.join('\n');
}

export function getWordCount(text: string): number {
  return stripMd(text).split(/\s+/).filter(Boolean).length;
}

export function highlightText(text: string, words: string[]): string {
  if (!words.length) return esc(text);
  let h = esc(text);
  words.forEach(w => {
    h = h.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>');
  });
  return h;
}
