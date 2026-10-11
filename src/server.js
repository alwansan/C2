import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { readConfig, options, decodeOptions } from './config.js';
import { assert, AddonError } from './errors.js';
import { CinemanaApi } from './api.js';
import { CinemanaAddon } from './addon.js';
import { configurationPage } from './configure.js';
import { createLogger } from './logger.js';
export function parseExtra(segment='',query='') {
  if(segment && !segment.includes('=') && /%3d/i.test(segment)) segment=decodeURIComponent(segment);
  const params=new URLSearchParams(segment);const result={};
  for(const [key,value] of [...params,...new URLSearchParams(query)]) {
    assert(!Object.hasOwn(result,key),'EXTRAS','Duplicate extra parameter');result[key]=value;
  }return result;
}
export function createServer(config, {addon,log=()=>{}}={}) {
  addon??=new CinemanaAddon(new CinemanaApi(config,{log}),config,{log});
  const server=http.createServer(async(req,res)=>{
    const start=Date.now();
    const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, HEAD, OPTIONS','Access-Control-Allow-Headers':'Content-Type', 'X-Content-Type-Options':'nosniff'};
    const send=(status,value,mime='application/json; charset=utf-8',cache='no-store')=>{
      const data=Buffer.isBuffer(value)?value:Buffer.from(mime.startsWith('application/json')?JSON.stringify(value):value);
      res.writeHead(status,{...headers,'Content-Type':mime,'Cache-Control':cache,'Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data);
    };
    let resource='route',type;
    try {
      if(req.method==='OPTIONS') {res.writeHead(204,headers);res.end();return;}
      assert(req.method==='GET'||req.method==='HEAD','METHOD','Only GET supported',405);
      assert((req.url||'').length<=4096,'URL','Request URL too long',414);
      const url=new URL(req.url,'http://localhost');let pathname=url.pathname;
      if(pathname==='/health.json') {send(200,{service:'cinemana-addon',version:'0.1.0',...addon.discovery.status});return;}
      let prefix='';
      if(config.accessKey) {
        const match=/^\/k\/([^/]+)(\/.*|$)/.exec(pathname);
        assert(match,'ACCESS','Installation key required',401);
        const expected=Buffer.from(config.accessKey),actual=Buffer.from(match[1]);
        assert(expected.length===actual.length&&timingSafeEqual(expected,actual),'ACCESS','Invalid installation key',401);
        prefix=`/k/${config.accessKey}`;pathname=match[2]||'/';
      }
      const installationBase=config.publicUrl+prefix;
      let opts=options();
      const configured=/^\/c\/([^/]+)(\/.*|$)/.exec(pathname);
      if(configured){opts=decodeOptions(configured[1]);prefix+=`/c/${configured[1]}`;pathname=configured[2]||'/';}
      const baseUrl=config.publicUrl+prefix;
      if(pathname==='/'||pathname==='/configure') {send(200,configurationPage(installationBase),'text/html; charset=utf-8');return;}
      if(pathname==='/logo.png') {send(200,await readFile(new URL('../public/logo.png',import.meta.url)),'image/png','public, max-age=86400');return;}
      if(pathname==='/manifest.json') {
        resource='manifest';const manifest=await addon.manifest(opts,baseUrl);
        send(200,manifest,'application/json; charset=utf-8',config.accessKey?'private, max-age=60':'public, max-age=60');return;
      }
      if(pathname==='/diagnostics.json') {
        // Never includes secrets or complete request/media URLs.
        send(200,{version:'0.1.0',discovery:addon.discovery.status,options:opts,apiHost:new URL(config.apiBase).hostname,apiAuthorizationConfigured:Boolean(config.authorization),pagination:'browse: 100 output items; search: all results; native starts at 0 and scans until empty; retryable budget',limitations:['network reachability required','client owns playback/downloading','unknown dates use marked epoch placeholder']});return;
      }
      const native=/^\/native\/(index|details|episodes|transcodes|comments|staff)(?:\/([^/]+))?\.json$/.exec(pathname);
      if(native) {resource='native';send(200,await addon.native(native[1],native[2]?decodeURIComponent(native[2]):undefined,opts));return;}
      const match=/^\/(catalog|meta|stream|subtitles)\/(movie|series)\/([^/]+)(?:\/([^/]+))?\.json$/.exec(pathname);
      assert(match,'ROUTE','Unknown endpoint',404);resource=match[1];type=match[2];
      const id=decodeURIComponent(match[3]),extra=parseExtra(match[4],url.search);
      assert(resource==='catalog'||resource==='subtitles'||Object.keys(extra).length===0,'EXTRAS','Extras unsupported for this resource');
      send(200,await addon.handle(resource,type,id,extra,opts));
    } catch(error) {
      const status=error instanceof URIError?400:error.status||500;
      if(!res.headersSent) send(status,{error:{code:error.code||'INTERNAL',message:error instanceof AddonError?error.message:'Request failed',...(error.details?{details:error.details}:{})}});
      log({event:'request_error',resource,type,status,code:error.code||'INTERNAL',elapsedMs:Date.now()-start});
    }
  });
  server.requestTimeout=180000;server.headersTimeout=15000;server.keepAliveTimeout=5000;
  return {server,addon};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const config=readConfig();const log=createLogger(config.dataDir);const {server,addon}=createServer(config,{log});
  server.listen(config.port,config.host,()=>{
    const base=config.publicUrl+(config.accessKey?'/k/<installation-key>':'');
    console.log(`Cinemana addon listening on ${config.host}:${config.port}. Configure: ${base}/configure`);
    addon.discovery.get(options()).catch(error=>log({event:'discovery_start_error',code:error.code||'DISCOVERY'}));
  });
  const stop=()=>server.close(()=>process.exit(0));process.on('SIGINT',stop);process.on('SIGTERM',stop);
}
