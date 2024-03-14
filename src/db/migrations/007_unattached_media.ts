import { Kysely, sql } from '@/deps.ts';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('unattached_media')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('pubkey', 'text', (c) => c.notNull())
    .addColumn('url', 'text', (c) => c.notNull())
    .addColumn('data', 'text', (c) => c.notNull())
    .addColumn('uploaded_at', 'datetime', (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema
    .createIndex('unattached_media_id')
    .on('unattached_media')
    .column('id')
    .execute();

  await db.schema
    .createIndex('unattached_media_pubkey')
    .on('unattached_media')
    .column('pubkey')
    .execute();

  await db.schema
    .createIndex('unattached_media_url')
    .on('unattached_media')
    .column('url')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('unattached_media').execute();
}
