import { type AppController } from '@/app.ts';
import { z } from '@/deps.ts';
import { getAuthor, getFilter, getFollows } from '@/client.ts';
import { lookupNip05Cached } from '@/nip05.ts';
import { toAccount, toStatus } from '@/transmute.ts';
import { bech32ToPubkey, eventDateComparator } from '@/utils.ts';

import type { Event } from '@/event.ts';

const credentialsController: AppController = async (c) => {
  const pubkey = c.get('pubkey')!;

  const event = await getAuthor(pubkey);
  if (event) {
    return c.json(await toAccount(event, { withSource: true }));
  }

  return c.json({ error: 'Could not find user.' }, 404);
};

const accountController: AppController = async (c) => {
  const pubkey = c.req.param('pubkey');

  const event = await getAuthor(pubkey);
  if (event) {
    return c.json(await toAccount(event));
  }

  return c.json({ error: 'Could not find user.' }, 404);
};

const accountLookupController: AppController = async (c) => {
  const acct = c.req.query('acct');

  if (!acct) {
    return c.json({ error: 'Missing `acct` query parameter.' }, 422);
  }

  const event = await lookupAccount(decodeURIComponent(acct));
  if (event) {
    return c.json(await toAccount(event));
  }

  return c.json({ error: 'Could not find user.' }, 404);
};

const accountSearchController: AppController = async (c) => {
  const q = c.req.query('q');

  if (!q) {
    return c.json({ error: 'Missing `q` query parameter.' }, 422);
  }

  const event = await lookupAccount(decodeURIComponent(q));
  if (event) {
    return c.json([await toAccount(event)]);
  }

  return c.json([]);
};

const relationshipsController: AppController = async (c) => {
  const pubkey = c.get('pubkey')!;
  const ids = z.array(z.string()).safeParse(c.req.queries('id[]'));

  if (!ids.success) {
    return c.json({ error: 'Missing `id[]` query parameters.' }, 422);
  }

  const follows = await getFollows(pubkey);

  const result = ids.data.map((id) => ({
    id,
    following: !!follows?.tags.find((tag) => tag[0] === 'p' && ids.data.includes(tag[1])),
    showing_reblogs: false,
    notifying: false,
    followed_by: false,
    blocking: false,
    blocked_by: false,
    muting: false,
    muting_notifications: false,
    requested: false,
    domain_blocking: false,
    endorsed: false,
  }));

  return c.json(result);
};

const accountStatusesQuerySchema = z.object({
  pinned: z.coerce.boolean(),
  limit: z.coerce.number().positive().transform((v) => Math.min(v, 40)).catch(20),
});

const accountStatusesController: AppController = async (c) => {
  const pubkey = c.req.param('pubkey');
  const { pinned, limit } = accountStatusesQuerySchema.parse(c.req.query());

  // Nostr doesn't support pinned statuses.
  if (pinned) {
    return c.json([]);
  }

  const events = (await getFilter({ authors: [pubkey], kinds: [1], limit })).sort(eventDateComparator);
  const statuses = await Promise.all(events.map((event) => toStatus(event)));

  return c.json(statuses);
};

/** Resolve a bech32 or NIP-05 identifier to an account. */
async function lookupAccount(value: string): Promise<Event<0> | undefined> {
  console.log(`Looking up ${value}`);

  const pubkey = bech32ToPubkey(value) || await lookupNip05Cached(value);

  if (pubkey) {
    return getAuthor(pubkey);
  }
}

export {
  accountController,
  accountLookupController,
  accountSearchController,
  accountStatusesController,
  credentialsController,
  relationshipsController,
};
