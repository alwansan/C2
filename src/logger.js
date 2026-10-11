import { mkdirSync, statSync, renameSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
export function createLogger(directory) {
  mkdirSync(directory,{recursive:true});const file=join(directory,'addon.log');
  return event=>{
    try {
      try {if(statSync(file).size>2*1024*1024) renameSync(file,file+'.1');} catch {}
      // Deliberate whitelist. No credentials, request URLs, search text or media URLs.
      const allowed=['event','path','resource','type','status','code','elapsedMs','rows','returned','skip','nativeNextPage','ended','nativeId','kind'];
      const clean={at:new Date().toISOString()};for(const key of allowed) if(event[key]!==undefined) clean[key]=event[key];
      appendFileSync(file,JSON.stringify(clean)+'\n');
    } catch { /* Logging must not turn a working request into a failure. */ }
  };
}
