import '../src/client/compatibility.js';
// Cold-load all phone orientations before a release can reach production.
import http from 'node:http';
import {createReadStream,existsSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
const root=fileURLToPath(new URL('../dist/client/',import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((request,response)=>{
  const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname),file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root.endsWith(sep)?root:root+sep)||!existsSync(file)||statSync(file).isDirectory()){response.writeHead(404);response.end('Not found');return;}
  response.setHeader('content-type',types[extname(file)]||'application/octet-stream');createReadStream(file).pipe(response);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
process.env.AWJ_DEVICE_AUDIT_URL=`http://127.0.0.1:${server.address().port}`;
try{await import('./deployed-device-audit.mjs');await import('./redesign-certification.mjs');}finally{server.close();}
