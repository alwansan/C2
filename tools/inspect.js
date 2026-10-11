import { writeFile, mkdir } from 'node:fs/promises';
import { readConfig, options } from '../src/config.js';
import { CinemanaApi } from '../src/api.js';
import { Discovery, catalogDefinitions } from '../src/discovery.js';
const config=readConfig(),api=new CinemanaApi(config),opts=options();
const checks=[];
for(const [name,load] of [['categories',()=>api.categories()],['groups',()=>api.home(opts.language,opts.level)],['collections',()=>api.collections(opts.level)]]) {
  try { const value=await load();checks.push({name,ok:true,count:Array.isArray(value)?value.length:value.groups?.length}); }
  catch(error){checks.push({name,ok:false,code:error.code||'NETWORK',message:error.message});}
}
let catalogCount;
if(checks.every(c=>c.ok)) {
  try { const index=await new Discovery(api,config).get(opts);catalogCount=catalogDefinitions(index,opts).length; }
  catch(error){checks.push({name:'collection-expansion',ok:false,code:error.code,message:error.message});}
}
const report={at:new Date().toISOString(),apiHost:new URL(config.apiBase).hostname,authorizationConfigured:Boolean(config.authorization),checks,catalogCount,liveVerified:checks.every(c=>c.ok)};
await mkdir(config.dataDir,{recursive:true});await writeFile(`${config.dataDir}/connection-report.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(!report.liveVerified) process.exitCode=1;
