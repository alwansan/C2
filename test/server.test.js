import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { CinemanaApi } from '../src/api.js';
import { CinemanaAddon } from '../src/addon.js';
import { createServer,parseExtra } from '../src/server.js';
import { options,encodeOptions,decodeOptions,readConfig } from '../src/config.js';
import { configurationPage } from '../src/configure.js';
import { fixture,FakeApi,video } from './fixtures.js';
async function listen(t,server){server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));return `http://127.0.0.1:${server.address().port}`;}
test('protocol handles manifest, CORS, resources, logo, config and errors over real HTTP',async t=>{
  const config=await fixture(t),api=new FakeApi();api.rows=[video(1)];const addon=new CinemanaAddon(api,config);const {server}=createServer(config,{addon});const url=await listen(t,server);
  const m=await fetch(url+'/manifest.json');assert.equal(m.status,200);assert.equal(m.headers.get('access-control-allow-origin'),'*');assert.equal((await m.json()).cinemana.discoveryComplete,true);
  const catalog=await fetch(url+'/catalog/movie/cinemana-search-movie/search=%D8%B9%D8%B1%D8%A8%D9%8A%20%26%20a%2Bb.json');assert.equal(catalog.status,200);assert.equal((await catalog.json()).metas[0].id,'alwan.cinemana:1');assert(api.calls.some(c=>c.query==='عربي & a+b'));
  const languageCatalog=await fetch(url+'/catalog/movie/cinemana-category-4-movie/genre='+encodeURIComponent('اليابانية [lang:12]')+'.json');assert.equal(languageCatalog.status,200);assert.equal((await languageCatalog.json()).metas[0].id,'alwan.cinemana:1');assert(api.calls.some(c=>c.resource==='catalog'&&c.category==='4'&&c.lang==='12'));
  const stream=await fetch(url+'/stream/movie/alwan.cinemana%3A1.json');assert.equal((await stream.json()).streams[0].url,'https://media.example/1.mp4');
  const image=await fetch(url+'/logo.png');assert.equal(image.headers.get('content-type'),'image/png');assert.equal(Buffer.from(await image.arrayBuffer()).subarray(1,4).toString(),'PNG');
  const encoded=encodeOptions({language:'en',subtitleMode:'iso'});const custom=await fetch(url+'/c/'+encoded+'/manifest.json');assert.equal((await custom.json()).config[0].default,'en');
  const bad=await fetch(url+'/catalog/movie/cinemana-all-movie/skip=-1.json');assert.equal(bad.status,400);assert.equal((await bad.json()).error.code,'OFFSET');
  assert.equal((await fetch(url+'/stream/movie/tt123.json')).status,404);
  assert.equal((await fetch(url+'/stream/movie/%XX.json')).status,400);
  assert.equal((await fetch(url+'/manifest.json',{method:'OPTIONS'})).status,204);
  assert.equal((await fetch(url+'/manifest.json',{method:'POST'})).status,405);
});
test('upstream failures return non-cacheable errors, not empty successful catalogs',async t=>{
  const config=await fixture(t),api=new FakeApi();api.categories=async()=>{throw Object.assign(Error('offline'),{code:'UPSTREAM_NETWORK',status:502});};
  const {server}=createServer(config,{addon:new CinemanaAddon(api,config)});const url=await listen(t,server);
  const response=await fetch(url+'/manifest.json');assert.equal(response.status,502);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).error.code,'UPSTREAM_NETWORK');
});
test('private installation key and configured paths remain functional',async t=>{
  const key='long-private-key-1234567890',config=await fixture(t,{accessKey:key}),addon=new CinemanaAddon(new FakeApi(),config);const {server}=createServer(config,{addon});const url=await listen(t,server);
  assert.equal((await fetch(url+'/manifest.json')).status,401);assert.equal((await fetch(url+'/k/wrong/manifest.json')).status,401);
  assert.equal((await fetch(url+'/k/'+key+'/c/'+encodeOptions({language:'en'})+'/manifest.json')).status,200);
  assert.equal((await fetch(url+'/health.json')).status,200);
});
test('API request paths and exact header rules match native service contract',async t=>{
  const seen=[];const upstream=http.createServer((req,res)=>{seen.push({url:req.url,headers:req.headers});res.setHeader('Content-Type','application/json');res.end(JSON.stringify([]));});const base=await listen(t,upstream);
  const config=await fixture(t,{apiBase:base+'/api/android/',authorization:'exact-token',userAgent:'Native-shaped UA'});const api=new CinemanaApi(config);
  await api.search({type:'series',query:'a+b & عربي',category:'4',year:'2020,2021',rating:'8',page:2,level:'0'});
  await api.transcodes('123');await api.group('featured:new','0',3);await api.collection('set-A','0');await api.catalog({type:'movie',page:0,level:'0'});
  const query=new URL(seen[0].url,base);assert.equal(query.pathname,'/api/android/AdvancedSearch');assert.equal(query.searchParams.get('videoTitle'),'a+b & عربي');assert.equal(query.searchParams.get('type'),'series');assert.equal(query.searchParams.get('category_id'),'4');assert.equal(query.searchParams.get('star'),'8');
  assert.equal(seen[0].headers.authorization,'exact-token');assert.equal(seen[0].headers['user-agent'],'Native-shaped UA');assert.equal(seen[0].headers['cache-control'],'no-cache');assert.match(seen[1].url,/transcoddedFiles\/id\/123/);
  assert.equal(new URL(seen[2].url,base).searchParams.get('groupID'),'featured:new');assert.match(seen[3].url,/collectionID\/set-A/);assert.equal(new URL(seen[2].url,base).searchParams.get('itemsPerPage'),'12');assert.equal(new URL(seen[4].url,base).searchParams.get('itemsPerPage'),'30');assert.equal(new URL(seen[4].url,base).searchParams.get('pageNumber'),'0');await api.search({type:'movie',rating:'0',page:0,level:'0'});assert.equal(new URL(seen[5].url,base).searchParams.has('star'),false);
});
test('API access denials are not retried and no server token leaks in errors/logs',async t=>{
  const config=await fixture(t,{authorization:'secret'});let count=0;const logs=[];
  const api=new CinemanaApi(config,{fetchImpl:async()=>{count++;return new Response('no',{status:403});},log:event=>logs.push(event)});
  await assert.rejects(api.categories(),{code:'UPSTREAM_ACCESS'});assert.equal(count,1);assert(!JSON.stringify(logs).includes('secret'));
});
test('configuration parser rejects unsupported values and URL extra encoding is exact',()=>{
  assert.equal(decodeOptions(encodeOptions({language:'en'})).language,'en');assert.throws(()=>options({language:'fr'}));assert.throws(()=>options({secret:'x'}));assert.throws(()=>decodeOptions('invalid'));
  assert.deepEqual(parseExtra('search=a%2Bb+%26+%D8%B9%D8%B1%D8%A8%D9%8A&skip=100'),{search:'a+b & عربي',skip:'100'});assert.throws(()=>parseExtra('skip=0&skip=100'));
  assert.throws(()=>readConfig({PUBLIC_URL:'file:///bad'}));assert.throws(()=>readConfig({CINEMANA_MEDIA_HEADERS:'{"User-Agent":"bad\\nheader"}'}));
});
test('configuration page script is valid and never nests old configured paths',()=>{
  const html=configurationPage('https://addon.example/k/key');const script=html.split('<script>')[1].split('</script>')[0];assert.doesNotThrow(()=>new Function(script));assert.match(html,/العربية/);assert(!html.includes('CINEMANA_AUTHORIZATION'));
});

test('zero-based native HTTP search includes the first source page and all later pages',async t=>{
  const seen=[];const upstream=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://localhost');res.setHeader('Content-Type','application/json');let result=[];
    if(url.pathname==='/api/android/AdvancedSearch') {const page=Number(url.searchParams.get('page'));seen.push(page);result=page<3?Array.from({length:50},(_,i)=>video(page*50+i+1)):[];}
    if(url.pathname.includes('/videoGroups/'))result={groups:[]};
    res.end(JSON.stringify(result));
  });const base=await listen(t,upstream),config=await fixture(t,{apiBase:base+'/api/android/'});
  const addon=new CinemanaAddon(new CinemanaApi(config),config),{server}=createServer(config,{addon});const url=await listen(t,server);
  const response=await fetch(url+'/catalog/movie/cinemana-search-movie/search=example.json');
  assert.equal(response.status,200);const {metas}=await response.json();assert.equal(metas.length,150);assert.equal(metas[0].id,'alwan.cinemana:1');assert.equal(metas.at(-1).id,'alwan.cinemana:150');assert.deepEqual(seen,[0,1,2,3]);
});
