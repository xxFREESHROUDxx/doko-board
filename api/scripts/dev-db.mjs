/**
 * Portable Postgres for local development — no Docker, nothing installed
 * system-wide. The platform binary ships in node_modules and the cluster lives
 * in api/.pgdata (gitignored), so this is a drop-in replacement for the
 * docker-compose service: same user, password, database and port, which means
 * DATABASE_URL in api/.env needs no change.
 *
 * Blocks until Ctrl+C. Run it in its own terminal:  npm run db
 */
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pkg from "embedded-postgres";

// The package is CJS with an interop default; unwrap it for both shapes.
const EmbeddedPostgres = pkg.default ?? pkg;

const here = dirname(fileURLToPath(import.meta.url));
const databaseDir = resolve(here, "..", ".pgdata");

// Must match DATABASE_URL in api/.env.
const USER = "dokoboard";
const PASSWORD = "dokoboard_dev";
const DATABASE = "dokoboard";
const PORT = 5432;

const pg = new EmbeddedPostgres({
  databaseDir,
  user: USER,
  password: PASSWORD,
  port: PORT,
  persistent: true,
});

// initialise() lays down a fresh cluster and refuses to run over an existing
// one, so it is strictly a first-run step. Data survives between sessions.
if (!existsSync(databaseDir)) {
  console.log("First run — creating the database cluster…");
  await pg.initialise();
}

await pg.start();

try {
  await pg.createDatabase(DATABASE);
  console.log(`Created database "${DATABASE}".`);
} catch {
  // Already exists. There is no create-if-missing hook, so this is the check.
}

console.log(`\n  Postgres ready on localhost:${PORT}`);
console.log(`  postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DATABASE}`);
console.log("\n  Leave this running. Ctrl+C to stop.\n");

let stopping = false;
async function shutdown() {
  if (stopping) return; // Ctrl+C twice shouldn't race two stops
  stopping = true;
  console.log("\nStopping Postgres…");
  try {
    await pg.stop();
  } catch (error) {
    console.error("Postgres did not stop cleanly:", error);
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Nothing else keeps the event loop alive — the server is a child process.
await new Promise(() => {});
