import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, client } from './index';

// Run on every container start (see Dockerfile) so a deploy always brings
// the schema up to date, not just the code. drizzle-orm's migrator tracks
// applied migrations in its own table and skips ones already run, so this
// is safe to run unconditionally on every boot, not just the first one.
//
// Deliberately uses drizzle-orm's migrator (a regular dependency, already
// in the production image) rather than drizzle-kit, which is a
// devDependency stripped out of the production install.
async function main() {
  console.log('Running database migrations...');
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  console.log('Migrations complete.');
  await client.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
