import { Elysia, t } from 'elysia';
import prisma from '../db/prisma.ts';

const settingsRoute = new Elysia({ prefix: '/api/settings' });

settingsRoute.get('/', async () => {
  const settings = await prisma.setting.findMany();

  const result: Record<string, any> = {};
  for (const row of settings) {
    result[row.key] = row.value;
  }

  return result;
});

settingsRoute.get('/:key', async ({ params }) => {
  const setting = await prisma.setting.findUnique({
    where: { key: params.key },
  });

  if (!setting) {
    return new Response(JSON.stringify({ error: 'Setting not found' }), { status: 404 });
  }

  return setting.value;
});

settingsRoute.put('/:key', async ({ params, body }) => {
  const { value } = body as { value: any };

  await prisma.setting.upsert({
    where: { key: params.key },
    create: {
      key: params.key,
      value,
    },
    update: {
      value,
    },
  });

  return { success: true };
}, {
  body: t.Object({
    value: t.Any(),
  }),
});

export default settingsRoute;
