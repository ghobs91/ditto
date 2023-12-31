import { z } from '@/deps.ts';

import type { Event } from './event.ts';

const optionalString = z.string().optional().catch(undefined);

const jsonSchema = z.string().transform((value, ctx) => {
  try {
    return JSON.parse(value);
  } catch (_e) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid JSON' });
    return z.NEVER;
  }
});

const metaContentSchema = z.object({
  name: optionalString,
  about: optionalString,
  picture: optionalString,
  banner: optionalString,
  nip05: optionalString,
  lud16: optionalString,
});

/** Author metadata from Event<0>. */
type MetaContent = z.infer<typeof metaContentSchema>;

/**
 * Get (and validate) data from a kind 0 event.
 * https://github.com/nostr-protocol/nips/blob/master/01.md
 */
function parseContent(event: Event<0>): MetaContent {
  try {
    const json = JSON.parse(event.content);
    return metaContentSchema.parse(json);
  } catch (_e) {
    return {};
  }
}

export { type MetaContent, metaContentSchema, parseContent };

/** Alias for `safeParse`, but instead of returning a success object it returns the value (or undefined on fail). */
function parseValue<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
  const result = schema.safeParse(value);
  return result.success ? result.data : undefined;
}

const parseRelay = (relay: string | URL) => parseValue(relaySchema, relay);

const relaySchema = z.custom<URL>((relay) => {
  if (typeof relay !== 'string') return false;
  try {
    const { protocol } = new URL(relay);
    return protocol === 'wss:' || protocol === 'ws:';
  } catch (_e) {
    return false;
  }
});

export { jsonSchema, parseRelay, relaySchema };
