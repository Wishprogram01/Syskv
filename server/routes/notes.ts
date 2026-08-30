import { Elysia, t } from 'elysia';
import prisma from '../db/prisma.ts';
import { Note, CreateNoteInput, UpdateNoteInput } from '../../src/types/index.ts';

const notesRoute = new Elysia({ prefix: '/api/notes' });

notesRoute.get('/', async ({ query }) => {
  const { view, search, tag, notebook } = query;
  const where: any = {};

  if (view === 'trash') {
    where.trashed = true;
  } else if (view === 'pinned') {
    where.trashed = false;
    where.pinned = true;
  } else {
    where.trashed = false;
  }

  if (tag) {
    where.tags = { has: tag };
  }

  if (notebook) {
    where.notebook = notebook;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { body: { contains: search, mode: 'insensitive' } },
    ];
  }

  const notes = await prisma.note.findMany({
    where,
    orderBy: [
      { pinned: 'desc' },
      { updated: 'desc' },
    ],
  });

  return notes.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    tags: row.tags,
    notebook: row.notebook,
    color: row.color,
    due: row.due === null ? null : Number(row.due),
    pinned: row.pinned,
    trashed: row.trashed,
    created: Number(row.created),
    updated: Number(row.updated),
  })) as Note[];
}, {
  query: t.Object({
    view: t.Optional(t.String()),
    search: t.Optional(t.String()),
    tag: t.Optional(t.String()),
    notebook: t.Optional(t.String()),
  }),
});

notesRoute.get('/:id', async ({ params }) => {
  const note = await prisma.note.findUnique({
    where: { id: params.id },
  });

  if (!note) {
    return new Response(JSON.stringify({ error: 'Note not found' }), { status: 404 });
  }

  return {
    id: note.id,
    title: note.title,
    body: note.body,
    tags: note.tags,
    notebook: note.notebook,
    color: note.color,
    due: note.due === null ? null : Number(note.due),
    pinned: note.pinned,
    trashed: note.trashed,
    created: Number(note.created),
    updated: Number(note.updated),
  } as Note;
});

notesRoute.post('/', async ({ body }) => {
  const input = body as CreateNoteInput;
  const now = Date.now();

  const note = await prisma.note.create({
    data: {
      title: input.title || '',
      body: input.body || '',
      tags: input.tags || [],
      notebook: input.notebook || '',
      color: input.color || '',
      due: input.due,
      pinned: input.pinned || false,
      created: now,
      updated: now,
    },
  });

  return {
    id: note.id,
    title: note.title,
    body: note.body,
    tags: note.tags,
    notebook: note.notebook,
    color: note.color,
    due: note.due === null ? null : Number(note.due),
    pinned: note.pinned,
    trashed: note.trashed,
    created: Number(note.created),
    updated: Number(note.updated),
  } as Note;
}, {
  body: t.Object({
    title: t.Optional(t.String()),
    body: t.Optional(t.String()),
    tags: t.Optional(t.Array(t.String())),
    notebook: t.Optional(t.String()),
    color: t.Optional(t.String()),
    due: t.Optional(t.Union([t.Number(), t.Null()])),
    pinned: t.Optional(t.Boolean()),
  }),
});

notesRoute.put('/:id', async ({ params, body }) => {
  const input = body as UpdateNoteInput;
  const now = Date.now();
  const data: any = { updated: now };

  if (input.title !== undefined) data.title = input.title;
  if (input.body !== undefined) data.body = input.body;
  if (input.tags !== undefined) data.tags = input.tags;
  if (input.notebook !== undefined) data.notebook = input.notebook;
  if (input.color !== undefined) data.color = input.color;
  if (input.due !== undefined) data.due = input.due;
  if (input.pinned !== undefined) data.pinned = input.pinned;
  if (input.trashed !== undefined) data.trashed = input.trashed;

  const note = await prisma.note.update({
    where: { id: params.id },
    data,
  });

  return {
    id: note.id,
    title: note.title,
    body: note.body,
    tags: note.tags,
    notebook: note.notebook,
    color: note.color,
    due: note.due === null ? null : Number(note.due),
    pinned: note.pinned,
    trashed: note.trashed,
    created: Number(note.created),
    updated: Number(note.updated),
  } as Note;
}, {
  body: t.Object({
    title: t.Optional(t.String()),
    body: t.Optional(t.String()),
    tags: t.Optional(t.Array(t.String())),
    notebook: t.Optional(t.String()),
    color: t.Optional(t.String()),
    due: t.Optional(t.Union([t.Number(), t.Null()])),
    pinned: t.Optional(t.Boolean()),
    trashed: t.Optional(t.Boolean()),
  }),
});

notesRoute.delete('/:id', async ({ params }) => {
  await prisma.note.delete({
    where: { id: params.id },
  });

  return new Response(null, { status: 204 });
});

export default notesRoute;
