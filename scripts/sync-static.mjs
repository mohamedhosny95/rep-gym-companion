#!/usr/bin/env node
// Keeps outputs/ (the offline, downloadable copy of the app) in sync with
// dist/client/ (the copy Cloudflare deploys), so the two never drift apart
// through hand-edits. Run this after any change under dist/client/, before
// committing.
//
// Usage: node scripts/sync-static.mjs

import { readdirSync, statSync, mkdirSync, copyFileSync, rmSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, "dist", "client");
const target = join(root, "outputs");
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

function syncFiles() {
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
        console.log(`removed stale outputs/${rel}`);
      }
    }
  }

  console.log(`synced ${sourceFiles.length} files from dist/client/ to outputs/`);
}

function rebuildZip() {
  const zipPath = join(target, zipName);
  rmSync(zipPath, { force: true });
  try {
    execFileSync("zip", ["-rq", zipName, ".", "-x", zipName], { cwd: target, stdio: "inherit" });
    console.log(`rebuilt outputs/${zipName}`);
  } catch (error) {
    console.error("Could not rebuild the zip (is `zip` installed?). Skipping.", error.message);
  }
}

syncFiles();
rebuildZip();
