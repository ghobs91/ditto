import { type AppContext, AppController } from '@/app.ts';
import { getAncestors, getDescendants, getEvent } from '@/client.ts';
import { validator, z } from '@/deps.ts';
import { type Event } from '@/event.ts';
import publish from '@/publisher.ts';
import { signEvent } from '@/sign.ts';
import { toStatus } from '@/transmute.ts';

const createStatusSchema = z.object({
  status: z.string(),
});

const statusController: AppController = async (c) => {
  const id = c.req.param('id');

  const event = await getEvent(id, 1);
  if (event) {
    return c.json(await toStatus(event as Event<1>));
  }

  return c.json({ error: 'Event not found.' }, 404);
};

const createStatusController = validator('json', async (value, c: AppContext) => {
  const result = createStatusSchema.safeParse(value);

  if (result.success) {
    const { data } = result;

    const event = await signEvent<1>({
      kind: 1,
      content: data.status,
      tags: [],
      created_at: Math.floor(new Date().getTime() / 1000),
    }, c);

    publish(event);

    return c.json(await toStatus(event));
  } else {
    return c.json({ error: 'Bad request' }, 400);
  }
});

// https://stackoverflow.com/a/64820881/8811886
function wait(ms: number) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('timeout succeeded')), ms);
  });
}

const contextController: AppController = async (c) => {
  const id = c.req.param('id');

  const event = await getEvent(id, 1);

  if (event) {
    const ancestorEvents = await Promise.race([wait(1000), getAncestors(event)]) as Event<1>[];
    const descendantEvents = await Promise.race([wait(1000), getDescendants(event.id)]) as Event<1>[];

    return c.json({
      ancestors: (await Promise.all((ancestorEvents).map(toStatus))).filter(Boolean),
      descendants: (await Promise.all((descendantEvents).map(toStatus))).filter(Boolean),
    });
  }

  return c.json({ error: 'Event not found.' }, 404);
};

export { contextController, createStatusController, statusController };
