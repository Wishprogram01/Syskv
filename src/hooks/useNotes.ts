import { useState, useEffect, useCallback } from 'react';
import type { Note, Settings } from '../types';
import * as api from '../api/notes';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async (params?: { view?: string; search?: string; tag?: string; notebook?: string }) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.fetchNotes(params);
      setNotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, []);

  const createNote = useCallback(async (input: Parameters<typeof api.createNote>[0]): Promise<Note | null> => {
    try {
      const note = await api.createNote(input);
      setNotes(prev => [note, ...prev]);
      return note;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note');
      return null;
    }
  }, []);

  const updateNote = useCallback(async (id: string, input: Partial<Note>): Promise<Note | null> => {
    try {
      const note = await api.updateNote(id, input);
      setNotes(prev => prev.map(n => n.id === id ? note : n));
      return note;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update note');
      return null;
    }
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    try {
      await api.deleteNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
    }
  }, []);

  return { notes, loading, error, loadNotes, createNote, updateNote, deleteNote };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>({ dark: false, sidebarOpen: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fetchSettings()
      .then(data => setSettings(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateSetting = useCallback(async (key: string, value: any) => {
    await api.updateSetting(key, value);
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleDark = useCallback(async () => {
    const newDark = !settings.dark;
    await updateSetting('dark', newDark);
    setSettings(prev => ({ ...prev, dark: newDark }));
  }, [settings.dark, updateSetting]);

  return { settings, loading, updateSetting, toggleDark };
}
