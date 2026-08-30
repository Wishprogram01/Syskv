import { afterAll, describe, expect, test } from 'bun:test';
import { app } from '../server/app.ts';

const PREFIX = 'TEST_BUN_';
const createdIds: string[] = [];

const base = 'http://localhost';

async function api(path: string, init?: RequestInit) {
  const res = await app.handle(new Request(base + path, init));
  let body: unknown = null;
  if (res.status !== 204) {
    body = await res.json();
  }
  return { status: res.status, body };
}

const json = (value: unknown) => ({
  method: 'POST' as const,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(value),
});

describe('Health', () => {
  test('GET /api/health returns ok', async () => {
    const { status, body } = await api('/api/health');
    expect(status).toBe(200);
    expect(body).toEqual({ status: 'ok' });
  });
});

describe('Notes API', () => {
  test('POST /api/notes creates a note', async () => {
    const { status, body } = await api('/api/notes', json({
      title: PREFIX + 'create',
      body: 'hello from bun test',
      tags: ['test'],
      notebook: 'Test',
      pinned: true,
    }));

    expect(status).toBe(200);
    const note = body as any;
    expect(note.id).toBeDefined();
    expect(note.title).toBe(PREFIX + 'create');
    expect(note.tags).toEqual(['test']);
    expect(note.pinned).toBe(true);
    createdIds.push(note.id);
  });

  test('POST with empty title still creates (defaults apply)', async () => {
    const { status, body } = await api('/api/notes', json({ body: 'only body' }));
    expect(status).toBe(200);
    const note = body as any;
    expect(note.title).toBe('');
    expect(note.trashed).toBe(false);
    createdIds.push(note.id);
  });

  test('GET /api/notes returns an array sorted by updated desc', async () => {
    const { status, body } = await api('/api/notes');
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  test('GET /api/notes filters by view=trash', async () => {
    const { status, body } = await api('/api/notes?view=trash');
    expect(status).toBe(200);
    const notes = body as any[];
    expect(notes.every((n) => n.trashed === true)).toBe(true);
  });

  test('GET /api/notes filters by tag', async () => {
    const { status, body } = await api('/api/notes?tag=test');
    expect(status).toBe(200);
    expect((body as any[]).length).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/notes/:id returns the note', async () => {
    const id = createdIds[0];
    const { status, body } = await api(`/api/notes/${id}`);
    expect(status).toBe(200);
    expect((body as any).id).toBe(id);
  });

  test('GET /api/notes/:id returns 404 for unknown id', async () => {
    const { status } = await api('/api/notes/nonexistent-id');
    expect(status).toBe(404);
  });

  test('PUT /api/notes/:id updates fields', async () => {
    const id = createdIds[0];
    const { status, body } = await api(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: PREFIX + 'updated', pinned: false }),
    });

    expect(status).toBe(200);
    const note = body as any;
    expect(note.title).toBe(PREFIX + 'updated');
    expect(note.pinned).toBe(false);
  });

  test('PUT with trashed=true soft-deletes (shows in trash)', async () => {
    const id = createdIds[1];
    await api(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trashed: true }),
    });

    const { status, body } = await api(`/api/notes/${id}`);
    expect(status).toBe(200);
    expect((body as any).trashed).toBe(true);
  });

  test('DELETE /api/notes/:id returns 204 and removes note', async () => {
    const id = createdIds[0];
    const { status } = await api(`/api/notes/${id}`, { method: 'DELETE' });
    expect(status).toBe(204);

    const after = await api(`/api/notes/${id}`);
    expect(after.status).toBe(404);
  });
});

describe('Settings API', () => {
  const key = 'test_' + Date.now();

  test('PUT /api/settings/:key upserts a value', async () => {
    const { status, body } = await api(`/api/settings/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: { hello: 'world' } }),
    });
    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
  });

  test('GET /api/settings/:key reads it back', async () => {
    const { status, body } = await api(`/api/settings/${key}`);
    expect(status).toBe(200);
    expect(body).toEqual({ hello: 'world' });
  });

  test('GET /api/settings returns all settings as object', async () => {
    const { status, body } = await api('/api/settings');
    expect(status).toBe(200);
    expect(typeof body).toBe('object');
    expect((body as any)[key]).toEqual({ hello: 'world' });
  });

  test('GET /api/settings/:key returns 404 for unknown', async () => {
    const { status } = await api('/api/settings/definitely_missing');
    expect(status).toBe(404);
  });
});

afterAll(async () => {
  const unique = [...new Set(createdIds)];
  for (const id of unique) {
    try {
      await api(`/api/notes/${id}`, { method: 'DELETE' });
    } catch {
      // already gone
    }
  }
});