import { Kysely } from '@/deps.ts';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.createIndex('idx_author_stats_pubkey').on('author_stats').column('pubkey').execute();
  await db.schema.createIndex('idx_event_stats_event_id').on('event_stats').column('event_id').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('idx_author_stats_pubkey').on('author_stats').execute();
  await db.schema.dropIndex('idx_event_stats_event_id').on('event_stats').execute();
}
