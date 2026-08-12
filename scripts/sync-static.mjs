#!/usr/bin/env node
// Builds dist/client from src/client, the only editable browser source tree.
import { readdirSync, mkdirSync, copyFileSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const source=join(root,"src","client"),target=join(root,"dist","client");

function walk(dir){
  const files=[];
  for(const entry of readdirSync(dir,{withFileTypes:true})){
    const full=join(dir,entry.name);
    if(entry.isDirectory())files.push(...walk(full));else files.push(full);
  }
  return files;
}
const sourceFiles=walk(source),sourcePaths=new Set(sourceFiles.map(file=>relative(source,file)));
const version=createHash("sha256");
for(const file of sourceFiles.sort()){
  version.update(relative(source,file));
  version.update(readFileSync(file));
}
const buildVersion=version.digest("hex").slice(0,12);
mkdirSync(target,{recursive:true});
for(const file of sourceFiles){const rel=relative(source,file),dest=join(target,rel);mkdirSync(dirname(dest),{recursive:true});copyFileSync(file,dest);}
if(existsSync(target))for(const file of walk(target)){const rel=relative(target,file);if(!sourcePaths.has(rel))rmSync(file);}
for(const rel of ["build-meta.js","index.html","bootstrap.js","enhancements.js","sw.js"]){
  const file=join(target,rel);
  if(existsSync(file))writeFileSync(file,readFileSync(file,"utf8").replaceAll("__BUILD_VERSION__",buildVersion));
}
console.log(`built ${sourceFiles.length} client files into dist/client/ (${buildVersion})`);
