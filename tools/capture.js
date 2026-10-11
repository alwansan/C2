// Captures only the provider payloads requested here; never credentials/headers.
// Files remain locally ignored by git. They can be provided for schema verification.
import { mkdir, writeFile } from 'node:fs/promises';
import { readConfig } from '../src/config.js';
import { CinemanaApi, nativeId } from '../src/api.js';
const config=readConfig(),api=new CinemanaApi(config);const ids=process.argv.slice(2).map(nativeId);
await mkdir('capture',{recursive:true});
const items=[['categories',()=>api.categories()],['home-ar',()=>api.home('ar','0')],['home-en',()=>api.home('en','0')],['collections',()=>api.collections('0')]];
for(const id of ids) items.push([`detail-${id}`,()=>api.details(id)],[`qualities-${id}`,()=>api.transcodes(id)],[`episodes-${id}`,()=>api.episodes(id)]);
for(const [name,get] of items) {
  try {await writeFile(`capture/${name}.json`,JSON.stringify(await get(),null,2));console.log(name,'OK');}
  catch(e){await writeFile(`capture/${name}-error.json`,JSON.stringify({code:e.code,message:e.message}));console.log(name,e.code);process.exitCode=1;}
}
