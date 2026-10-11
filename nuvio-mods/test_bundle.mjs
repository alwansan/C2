import vm from 'node:vm';import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const path=new URL('../NuvioAlwanCinema/composeApp/src/androidMain/assets/cinemana/bundle.js',import.meta.url);
const memory=new Map();const sandbox={__cinema_hash:s=>crypto.createHash('sha256').update(s).digest('hex'),__cinema_base64:s=>Buffer.from(s).toString('base64url'),__cinema_file:(op,p,v)=>{if(op==='write')memory.set(p,v);else if(op==='rename'){memory.set(v,memory.get(p));memory.delete(p);}else {if(!memory.has(p))throw Error('Missing');return memory.get(p);}return '';}};
const ctx=vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path,'utf8')+'\nglobalThis.exportsForTest={addon:require("addon"),mapping:require("mapping"),manifest:require("manifest")};',ctx);
const {CinemanaAddon}=ctx.exportsForTest.addon;
const calls=[];const row=n=>({nb:String(n),kind:'1',ar_title:'عمل '+n,en_title:'Title '+n,year:'2024',stars:'8',translations:[{id:'1',name:'عربية محسنة',type:'ar',extention:'srt',file:'https://media.test/ar.srt'}]});
const api={categories:async()=>[{nb:'4',ar_title:'أكشن',langArray:[{langNb:'2',lang_ar_title:'العربية'},{langNb:'3',lang_ar_title:'الإنجليزية'}]}],home:async()=>({groups:[]}),collections:async()=>[],search:async({page})=>{calls.push(page);return page<5?Array.from({length:30},(_,i)=>row(page*30+i+1)):[];},details:async id=>row(Number(id)),transcodes:async()=>[{resolution:'1080p',container:'mp4',videoUrl:'https://media.test/v.mp4?token=keep'}]};
const a=new CinemanaAddon(api,{authorization:'',dataDir:'discovery',catalogTtl:1000,pagesPerRequest:40,mediaHeaders:{}});const opts={language:'ar',level:'0',subtitleMode:'labels',quality:'all'};
const manifest=await a.manifest(opts,'https://cinemana.internal');assert.equal(manifest.catalogs.length,10);assert.equal(manifest.cinemana.mergedLanguageCatalogs,4);
const result=await a.handle('catalog','movie','cinemana-search-movie',{search:'x'},opts);assert.equal(result.metas.length,150);assert.deepEqual(calls,[0,1,2,3,4,5]);
const stream=await a.handle('stream','movie','alwan.cinemana:1',{},opts);assert.equal(stream.streams[0].url,'https://media.test/v.mp4?token=keep');assert.equal(stream.streams[0].subtitles[0].lang,'عربية محسنة');
console.log('Embedded provider: complete 150-result search, zero-based pages, merged categories, signed quality URL, enhanced Arabic subtitle passed');

// A new engine reuses a still-fresh disk index without rediscovering the network.
const b=new CinemanaAddon({...api,categories:async()=>{throw Error('Fresh cache must avoid network');}}, {authorization:'',dataDir:'discovery',catalogTtl:900000,pagesPerRequest:40,mediaHeaders:{}});
const cached=await b.manifest(opts,'https://cinemana.internal');assert.equal(cached.catalogs.length,manifest.catalogs.length);assert.equal(b.discovery.status.source,'disk-fresh');
console.log('Fresh discovery cache survives engine recreation and skips network discovery');
