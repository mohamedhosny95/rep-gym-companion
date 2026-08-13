#!/usr/bin/env node
// Builds deployable client and Worker artifacts from the editable src/ tree.
import { readdirSync, mkdirSync, copyFileSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const source=join(root,"src","client"),target=join(root,"dist","client");
const serverSource=join(root,"src","server","index.js"),serverTarget=join(root,"dist","server","index.js"),serverNodeTarget=join(root,"dist","server","index.node.js");

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
mkdirSync(dirname(serverTarget),{recursive:true});
const workerBuild={entryPoints:[serverSource],bundle:true,format:"esm",platform:"neutral",target:"es2022",sourcemap:false,legalComments:"none"};
await build({...workerBuild,outfile:serverTarget,external:["cloudflare:workers"]});
await build({...workerBuild,outfile:serverNodeTarget,plugins:[{name:"cloudflare-workers-node-test-shim",setup(build){build.onResolve({filter:/^cloudflare:workers$/},()=>({path:"durable-object",namespace:"rep-test"}));build.onLoad({filter:/.*/,namespace:"rep-test"},()=>({loader:"js",contents:"export class DurableObject { constructor(ctx,env){ this.ctx=ctx; this.env=env; } }"}));}}]});
console.log(`built ${sourceFiles.length} client files and the Worker into dist/ (${buildVersion})`);
