import * as client from '@/client.ts';
import * as eventsDB from '@/db/events.ts';
import { type Event, type Filter, findReplyTag } from '@/deps.ts';
import * as mixer from '@/mixer.ts';

interface GetEventOpts<K extends number> {
  /** Timeout in milliseconds. */
  timeout?: number;
  /** Event kind. */
  kind?: K;
}

/** Get a Nostr event by its ID. */
const getEvent = async <K extends number = number>(
  id: string,
  opts: GetEventOpts<K> = {},
): Promise<Event<K> | undefined> => {
  const { kind, timeout = 1000 } = opts;
  const filter: Filter<K> = { ids: [id], limit: 1 };
  if (kind) {
    filter.kinds = [kind];
  }
  const [event] = await mixer.getFilters([filter], { limit: 1, timeout });
  return event;
};

/** Get a Nostr `set_medatadata` event for a user's pubkey. */
const getAuthor = async (pubkey: string, timeout = 1000): Promise<Event<0> | undefined> => {
  const [event] = await mixer.getFilters([{ authors: [pubkey], kinds: [0], limit: 1 }], { limit: 1, timeout });
  return event;
};

/** Get users the given pubkey follows. */
const getFollows = async (pubkey: string, timeout = 1000): Promise<Event<3> | undefined> => {
  const [event] = await mixer.getFilters([{ authors: [pubkey], kinds: [3], limit: 1 }], { limit: 1, timeout });
  return event;
};

/** Get pubkeys the user follows. */
async function getFollowedPubkeys(pubkey: string): Promise<string[]> {
  const event = await getFollows(pubkey);
  if (!event) return [];

  return event.tags
    .filter((tag) => tag[0] === 'p')
    .map((tag) => tag[1]);
}

/** Get pubkeys the user follows, including the user's own pubkey. */
async function getFeedPubkeys(pubkey: string): Promise<string[]> {
  const authors = await getFollowedPubkeys(pubkey);
  return [...authors, pubkey];
}

async function getAncestors(event: Event<1>, result = [] as Event<1>[]): Promise<Event<1>[]> {
  if (result.length < 100) {
    const replyTag = findReplyTag(event);
    const inReplyTo = replyTag ? replyTag[1] : undefined;

    if (inReplyTo) {
      const parentEvent = await getEvent(inReplyTo, { kind: 1 });

      if (parentEvent) {
        result.push(parentEvent);
        return getAncestors(parentEvent, result);
      }
    }
  }

  return result.reverse();
}

function getDescendants(eventId: string): Promise<Event<1>[]> {
  return mixer.getFilters([{ kinds: [1], '#e': [eventId] }], { limit: 200, timeout: 2000 });
}

/** Returns whether the pubkey is followed by a local user. */
async function isLocallyFollowed(pubkey: string): Promise<boolean> {
  const [event] = await eventsDB.getFilters([{ kinds: [3], '#p': [pubkey], local: true, limit: 1 }], { limit: 1 });
  return Boolean(event);
}

/** Sync the user's state from other relays. */
async function syncUser(pubkey: string): Promise<void> {
  await client.getFilters([
    { authors: [pubkey], kinds: [0, 3, 10000, 10001, 10002] },
  ], { timeout: 5000 });
}

export {
  getAncestors,
  getAuthor,
  getDescendants,
  getEvent,
  getFeedPubkeys,
  getFollowedPubkeys,
  getFollows,
  isLocallyFollowed,
  syncUser,
};
