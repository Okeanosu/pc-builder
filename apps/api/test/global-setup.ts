import { runMigrations } from '../src/db/migrate';

export default async function setup() {
  const url = process.env.DATABASE_URL_TEST ?? 'postgres://pc:pc@localhost:5433/pcbuilder_test';
  await runMigrations(url);
}
