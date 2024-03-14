import {
  Debug,
  matchFilters,
  type NostrEvent,
  type NostrFilter,
  NSet,
  type NStore,
  type NStoreOpts,
  type RelayPoolWorker,
} from '@/deps.ts';
import { normalizeFilters } from '@/filter.ts';
import { dehydrateEvent } from '@/storages/hydrate.ts';
import { abortError } from '@/utils/abort.ts';

interface PoolStoreOpts {
  pool: InstanceType<typeof RelayPoolWorker>;
  relays: WebSocket['url'][];
  publisher: {
    handleEvent(event: NostrEvent, signal: AbortSignal): Promise<void>;
  };
}

class PoolStore implements NStore {
  #debug = Debug('ditto:client');
  #pool: InstanceType<typeof RelayPoolWorker>;
  #relays: WebSocket['url'][];
  #publisher: {
    handleEvent(event: NostrEvent, signal: AbortSignal): Promise<void>;
  };

  constructor(opts: PoolStoreOpts) {
    this.#pool = opts.pool;
    this.#relays = opts.relays;
    this.#publisher = opts.publisher;
  }

  event(event: NostrEvent, opts: NStoreOpts = {}): Promise<void> {
    if (opts.signal?.aborted) return Promise.reject(abortError());
    const { relays = this.#relays } = opts;

    event = dehydrateEvent(event);
    this.#debug('EVENT', event);

    this.#pool.publish(event, relays);
    return Promise.resolve();
  }

  query(filters: NostrFilter[], opts: NStoreOpts = {}): Promise<NostrEvent[]> {
    if (opts.signal?.aborted) return Promise.reject(abortError());

    filters = normalizeFilters(filters);
    this.#debug('REQ', JSON.stringify(filters));
    if (!filters.length) return Promise.resolve([]);

    return new Promise((resolve, reject) => {
      const results = new NSet();

      const unsub = this.#pool.subscribe(
        filters,
        opts.relays ?? this.#relays,
        (event: NostrEvent | null) => {
          if (event && matchFilters(filters, event)) {
            this.#publisher.handleEvent(event, AbortSignal.timeout(1000)).catch(() => {});
            results.add({
              id: event.id,
              kind: event.kind,
              pubkey: event.pubkey,
              content: event.content,
              tags: event.tags,
              created_at: event.created_at,
              sig: event.sig,
            });
          }
          if (typeof opts.limit === 'number' && results.size >= opts.limit) {
            unsub();
            resolve([...results]);
          }
        },
        undefined,
        () => {
          unsub();
          resolve([...results]);
        },
      );

      const onAbort = () => {
        unsub();
        reject(abortError());
        opts.signal?.removeEventListener('abort', onAbort);
      };

      opts.signal?.addEventListener('abort', onAbort);
    });
  }
}

export { PoolStore };
