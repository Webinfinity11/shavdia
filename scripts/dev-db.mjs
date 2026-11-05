// Local PostgreSQL for development, no install needed. Data stays in .data/pg.
//   npm run db:start

import fs from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const databaseDir = path.join(process.cwd(), ".data", "pg");
const firstRun = !fs.existsSync(path.join(databaseDir, "PG_VERSION"));

const server = new EmbeddedPostgres({
  databaseDir,
  user: "postgres",
  password: "postgres",
  port: 5433,
  persistent: true,
  // Without this Windows picks its own language encoding, which has no Georgian letters.
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  onLog: () => {},
  onError: (message) => console.error(message),
});

if (firstRun) await server.initialise();
await server.start();
if (firstRun) await server.createDatabase("shavdia");
console.log("PostgreSQL is ready on localhost:5433");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await server.stop();
    process.exit(0);
  });
}
