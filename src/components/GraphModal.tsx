import { useEffect } from 'react';
import type { Note } from '../types';
import { esc } from '../utils/helpers';

interface GraphModalProps {
  isOpen: boolean;
  notes: Note[];
  onClose: () => void;
  onOpenNote: (id: string) => void;
}

export function GraphModal({ isOpen, notes, onClose, onOpenNote }: GraphModalProps) {
  useEffect(() => {
    if (isOpen && notes.length >= 2) {
      const width = 620;
      const height = 420;
      const cx = width / 2;
      const cy = height / 2;
      const R = Math.max(80, (Math.min(width, height) / 2) - 60);
      const links: [string, string][] = [];
      const edges = new Set<string>();

      notes.forEach(n => {
        const refs = (n.body + n.title).match(/\[\[([^\]]+)\]\]/g) || [];
        refs.forEach(r => {
          const target = notes.find(x => x.title.toLowerCase() === r.slice(2, -2).trim().toLowerCase());
          if (target && target.id !== n.id) {
            const key = [n.id, target.id].sort().join('|');
            if (!edges.has(key)) {
              edges.add(key);
              links.push([n.id, target.id]);
            }
          }
        });
      });

      const angles = notes.map((_, i) => (i / notes.length) * Math.PI * 2);
      const pos = new Map<string, { x: number; y: number }>();
      notes.forEach((n, i) => pos.set(n.id, {
        x: cx + R * Math.cos(angles[i]),
        y: cy + R * Math.sin(angles[i]),
      }));

      let svg = `<svg viewBox="0 0 ${width} ${height}">`;
      svg += `<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="var(--border)"/></marker></defs>`;
      links.forEach(([a, b]) => {
        const p = pos.get(a)!;
        const q = pos.get(b)!;
        svg += `<line className="graph-edge" x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/>`;
      });
      notes.forEach(n => {
        const p = pos.get(n.id)!;
        const r = (n.title.length * 3.4 + 14) / 2;
        svg += `<g className="graph-node" data-id="${n.id}">`;
        svg += `<circle className="graph-node${n.pinned ? ' pinned' : ''}" cx="${p.x}" cy="${p.y}" r="${r}"/>`;
        const label = n.title.length > 12 ? n.title.slice(0, 11) + '…' : n.title || 'Untitled';
        svg += `<text className="graph-label" x="${p.x}" y="${p.y + 4}" text-anchor="middle">${esc(label)}</text>`;
        svg += `</g>`;
      });
      svg += '</svg>';

      const canvas = document.getElementById('graphCanvas');
      if (canvas) {
        canvas.innerHTML = svg;
        canvas.querySelectorAll('.graph-node').forEach((g: any) => {
          g.addEventListener('click', () => {
            onOpenNote(g.dataset.id);
            onClose();
          });
        });
      }
    }
  }, [isOpen, notes, onClose, onOpenNote]);

  if (!isOpen) return null;

  return (
    <>
      <div id="graphOverlay" className="overlay" onClick={onClose} />
      <div id="graphModal" className="modal">
        <div className="modal-head">
          <h3>Note Graph</h3>
          <button className="icon-btn" onClick={onClose}>×</button>
        </div>
        <div id="graphCanvas" />
        <p className="muted small">Lines = [[backlinks]] between notes. Click a node to open.</p>
      </div>
    </>
  );
}
