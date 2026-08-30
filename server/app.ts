import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import { existsSync, readFileSync } from 'node:fs';
import dotenv from 'dotenv';
import notesRoute from './routes/notes.ts';
import settingsRoute from './routes/settings.ts';

dotenv.config();

export const app = new Elysia()
  .use(cors())
  .use(notesRoute)
  .use(settingsRoute)
  .get('/api/health', () => ({ status: 'ok' }));

if (existsSync('dist')) {
  const indexHtml = readFileSync('dist/index.html', 'utf8');
  const staticApp = await staticPlugin({ assets: 'dist', prefix: '/', alwaysStatic: true, indexHTML: true });
  app.use(staticApp);
  app.get('/', () => new Response(indexHtml, {
    headers: { 'Content-Type': 'text/html;charset=utf-8' },
  }));
}

export type App = typeof app;