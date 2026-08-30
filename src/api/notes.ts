import type { Note, Settings } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export async function fetchNotes(params?: {
  view?: string;
  search?: string;
  tag?: string;
  notebook?: string;
}): Promise<Note[]> {
  const queryParams = new URLSearchParams();
  if (params?.view) queryParams.set('view', params.view);
  if (params?.search) queryParams.set('search', params.search);
  if (params?.tag) queryParams.set('tag', params.tag);
  if (params?.notebook) queryParams.set('notebook', params.notebook);

  const res = await fetch(`${API_BASE}/notes?${queryParams}`);
  if (!res.ok) throw new Error('Failed to fetch notes');
  return res.json();
}

export async function fetchNote(id: string): Promise<Note> {
  const res = await fetch(`${API_BASE}/notes/${id}`);
  if (!res.ok) throw new Error('Failed to fetch note');
  return res.json();
}

export async function createNote(input: {
  title: string;
  body: string;
  tags: string[];
  notebook: string;
  color: string;
  due: number | null;
  pinned: boolean;
}): Promise<Note> {
  const res = await fetch(`${API_BASE}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to create note');
  return res.json();
}

export async function updateNote(id: string, input: Partial<Note>): Promise<Note> {
  const res = await fetch(`${API_BASE}/notes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to update note');
  return res.json();
}

export async function deleteNote(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/notes/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete note');
}

export async function fetchSettings(): Promise<Settings> {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  const data = await res.json();
  return {
    dark: data.dark?.value ?? false,
    sidebarOpen: data.sidebarOpen?.value ?? true,
  };
}

export async function updateSetting(key: string, value: any): Promise<void> {
  const res = await fetch(`${API_BASE}/settings/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error('Failed to update setting');
}
