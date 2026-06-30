/**
 * One command: discover DATABASE_URL + apply migrations.
 *
 * Usage:
 *   npm run db:setup
 */

import { spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function run(scriptName) {
  const result = spawnSync(npmCmd, ["run", scriptName], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Step 1/2 — Discover database URL...\n");
run("db:url");

console.log("\nStep 2/2 — Apply migrations...\n");
run("migrate");

console.log("\nDatabase setup complete.");
