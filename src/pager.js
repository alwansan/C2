import { createHash } from 'node:crypto';
import { AddonError, assert } from './errors.js';
import { preview } from './mapping.js';
export class Pager {
  constructor(config, log=()=>{}) { this.config=config;this.log=log;this.cursors=new Map(); }
  async page(key,skip,type,opts,load,{finite=false,all=false}={}) {
    assert(Number.isSafeInteger(skip)&&skip>=0,'OFFSET','Invalid skip');
    const now=Date.now();
    for(const [id,c] of this.cursors) if(c.expiry<now&&!c.busy) this.cursors.delete(id);
    let cursor=this.cursors.get(key);
    if(!cursor||skip<cursor.base) {
      cursor={page:0,base:0,rows:[],seen:new Set(),fingerprints:new Set(),ended:false,tail:Promise.resolve(),expiry:now+this.config.catalogTtl,busy:0};
      this.cursors.set(key,cursor);
    }
    while(this.cursors.size>64) {
      const oldest=[...this.cursors].find(([id,c])=>id!==key&&!c.busy);
      if(!oldest) break;this.cursors.delete(oldest[0]);
    }
    cursor.busy++;
    const job=cursor.tail.catch(()=>{}).then(async()=>{
      // A queued forward request may discard rows before this request starts.
      if(skip<cursor.base) return this.page(key,skip,type,opts,load,{finite,all});
      let requests=0;
      while(!cursor.ended&&(all || cursor.base+cursor.rows.length<skip+100)) {
        if(requests++>=this.config.pagesPerRequest) throw new AddonError('PAGE_BUDGET','Pagination still has more pages. Retry the same request to continue; no truncated success was returned.',503,{retryable:true,nextPage:cursor.page});
        const frame=await load(cursor.page);
        const raw=Array.isArray(frame)?frame:frame?.raw;
        const output=Array.isArray(frame)?frame:frame?.rows;
        assert(Array.isArray(raw)&&Array.isArray(output),'UPSTREAM_SHAPE','Catalog response must be an array',502);
        if(!raw.length){cursor.ended=true;break;}
        const fingerprint=createHash('sha256').update(JSON.stringify(raw)).digest('hex');
        assert(!cursor.fingerprints.has(fingerprint),'REPEATED_PAGE','Cinemana repeated a previous page; refusing false end-of-results',502);
        cursor.fingerprints.add(fingerprint);
        for(const row of output) {
          const item=preview(row,opts);
          if(!item){this.log({event:'invalid_catalog_row',nativeId:String(row?.nb||''),kind:String(row?.kind||'')});continue;}
          if(item.type!==type||cursor.seen.has(item.id)) continue;
          cursor.seen.add(item.id);cursor.rows.push(item);
        }
        cursor.page++;
        if(finite) cursor.ended=true;
        // Native search/group pages may be smaller than 100. Only an EMPTY native
        // page proves the end. Filtering, dedupe, and mixed kinds never end the scan.
      }
      const start=skip-cursor.base;
      const metas=cursor.rows.slice(start,all?undefined:start+100);
      const discard=all?0:Math.min(cursor.rows.length,Math.max(0,skip-cursor.base-200));
      if(discard){cursor.rows.splice(0,discard);cursor.base+=discard;}
      cursor.expiry=Date.now()+this.config.catalogTtl;
      this.log({event:'catalog_page',returned:metas.length,skip,nativeNextPage:cursor.page,ended:cursor.ended,type});
      return metas;
    }).finally(()=>cursor.busy--);
    cursor.tail=job;return job;
  }
}
