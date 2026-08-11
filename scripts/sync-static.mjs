#!/usr/bin/env node
// Builds both deployable copies from src/client/, the only editable client
// source tree. Cloudflare serves dist/client/ and outputs/ is the offline ZIP.
//
// Usage: node scripts/sync-static.mjs

import { readdirSync, mkdirSync, copyFileSync, rmSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, "src", "client");
const targets = [join(root, "dist", "client"), join(root, "outputs")];
const zipName = "rep-gym-companion.zip";

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function syncTarget(target) {
  const sourceFiles = walk(source).filter(f => relative(source, f) !== zipName);
  const sourceRelPaths = new Set(sourceFiles.map(f => relative(source, f)));

  for (const file of sourceFiles) {
    const rel = relative(source, file);
    const dest = join(target, rel);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(file, dest);
  }

  if (existsSync(target)) {
    for (const file of walk(target)) {
      const rel = relative(target, file);
      if (rel === zipName) continue;
      if (!sourceRelPaths.has(rel)) {
        rmSync(file);
        console.log(`removed stale ${relative(root,target)}/${rel}`);
      }
    }
  }

  console.log(`synced ${sourceFiles.length} files from src/client/ to ${relative(root,target)}/`);
}

function rebuildZip() {
  const target=join(root,"outputs"),zipPath = join(target, zipName);
  rmSync(zipPath, { force: true });
  try {
    execFileSync("zip", ["-rq", zipName, ".", "-x", zipName], { cwd: target, stdio: "inherit" });
    console.log(`rebuilt outputs/${zipName}`);
  } catch (error) {
    console.error("Could not rebuild the zip (is `zip` installed?). Skipping.", error.message);
  }
}

for(const target of targets)syncTarget(target);
rebuildZip();
