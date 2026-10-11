import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CinemanaAddon } from '../src/addon.js';
import { Discovery, catalogDefinitions } from '../src/discovery.js';
import { buildManifest } from '../src/manifest.js';
import { fixture,FakeApi,opts,video } from './fixtures.js';
test('manifest discovers categories, category languages, home groups and nested collections',async t=>{
  const config=await fixture(t),api=new FakeApi(),addon=new CinemanaAddon(api,config);
  const manifest=await addon.manifest(opts,'http://127.0.0.1:7000');
  for(const id of ['cinemana-all-movie','cinemana-search-series','cinemana-category-4-movie','cinemana-category-4-language-12-series','cinemana-group-50-movie','cinemana-group-51-series','cinemana-collection-99-series','cinemana-collection-99-group-60-movie']) assert(manifest.catalogs.some(c=>c.id===id),id);
  assert.equal(manifest.cinemana.discoveryComplete,true);assert.equal(manifest.cinemana.categories,2);assert.equal(manifest.cinemana.groups,2);assert.equal(manifest.cinemana.collections,1);
  assert.equal(manifest.logo,'http://127.0.0.1:7000/logo.png');assert(manifest.catalogs.find(c=>c.id==='cinemana-all-movie').extra.find(e=>e.name==='genre').options.includes('أنمي [4]'));
  assert.equal(new Set(manifest.catalogs.map(c=>c.type+'/'+c.id)).size,manifest.catalogs.length);
});
test('opaque native group/category identifiers are not incorrectly discarded',()=>{
  const index={categories:[{nb:'0',ar_title:'All',langArray:[{langNb:'ja-jp',lang_ar_title:'Japanese'}]}],groups:[{groupsID:'featured:new',title:'Featured',hasPagination:1}],collections:[{id:'set-A',title:'Collection'}],collectionItems:{'set-A':[{groupsID:'group-special',title:'Group'}]}};
  const defs=catalogDefinitions(index,opts);assert(defs.some(d=>d.category==='0'&&d.lang==='ja-jp'));assert(defs.some(d=>d.nativeId==='featured:new'));assert(defs.some(d=>d.nativeId==='set-A'));
});
test('failed discovery never publishes a fake two-catalog complete manifest',async t=>{
  const config=await fixture(t),api=new FakeApi();api.home=async()=>{throw Object.assign(Error('offline'),{code:'UPSTREAM_NETWORK'});};
  const addon=new CinemanaAddon(api,config);await assert.rejects(addon.manifest(opts,config.publicUrl),{code:'UPSTREAM_NETWORK'});assert.equal(addon.discovery.status.ready,false);
});
test('a previously captured full index survives outage with stale state clearly marked',async t=>{
  const config=await fixture(t),api=new FakeApi(),discovery=new Discovery(api,config);const first=await discovery.get(opts);discovery.cache.clear();
  api.home=async()=>{throw Object.assign(Error('offline'),{code:'UPSTREAM_NETWORK'});};
  const cached=await discovery.get(opts);assert.equal(cached.source,'disk-stale');assert.equal(cached.groups.length,first.groups.length);assert.equal(cached.observedAt,first.observedAt);
  assert.equal(discovery.status.upstreamError,'UPSTREAM_NETWORK');assert((await readFile(config.dataDir+'/discovery-ar-0-guest.json','utf8')).includes('collectionItems'));
});
test('native collection group and curated feed routes keep original content identities',async t=>{
  const config=await fixture(t),api=new FakeApi(),addon=new CinemanaAddon(api,config);
  const result=await addon.catalog('series','cinemana-collection-99-group-60-series',{},opts);assert.deepEqual(result.metas.map(m=>m.id),['alwan.cinemana:4']);
  assert(api.calls.some(c=>c.resource==='group'&&c.id==='60'));
  const finite=await addon.catalog('series','cinemana-group-51-series',{},opts);assert.equal(finite.metas[0].id,'alwan.cinemana:2');
});
test('category and native language IDs plus source sort values reach API unchanged',async t=>{
  const config=await fixture(t),api=new FakeApi(),addon=new CinemanaAddon(api,config);api.rows=[video(1)];
  await addon.catalog('movie','cinemana-category-4-language-12-movie',{sort:'IMDb: الأعلى'},opts);
  const request=api.calls.find(c=>c.resource==='catalog');assert.equal(request.category,'4');assert.equal(request.lang,'12');assert.equal(request.sort,'stars_desc');
});
test('year and minimum rating filters scan later source pages, not only the first page',async t=>{
  const config=await fixture(t),api=new FakeApi();api.catalog=async req=>req.page===0?[video(1,'1',{year:'1990',stars:'4'})]:req.page===1?[video(2,'1',{year:'2020',stars:'8'})]:[];
  const addon=new CinemanaAddon(api,config);const response=await addon.catalog('movie','cinemana-all-movie',{year:'2020',rating:'7'},opts);
  assert.deepEqual(response.metas.map(m=>m.id),['alwan.cinemana:2']);
});
test('complete search uses AdvancedSearch with all native filters and encoded query intact',async t=>{
  const config=await fixture(t),api=new FakeApi(),addon=new CinemanaAddon(api,config);api.rows=[video(1)];
  await addon.catalog('movie','cinemana-search-movie',{search:'عربي & a+b',year:'2020,2021',rating:'8',genre:'أنمي [4]',staff:'Actor'},opts);
  const request=api.calls.find(c=>c.resource==='search');assert.equal(request.query,'عربي & a+b');assert.equal(request.year,'2020,2021');assert.equal(request.rating,'8');assert.equal(request.category,'4');assert.equal(request.staff,'Actor');
});
test('invalid combinations and foreign genres fail instead of silently ignoring filters',async t=>{
  const config=await fixture(t),addon=new CinemanaAddon(new FakeApi(),config);
  await assert.rejects(addon.catalog('movie','cinemana-all-movie',{search:'test',sort:'IMDb: الأعلى'},opts),{code:'FILTER'});
  await assert.rejects(addon.catalog('movie','cinemana-category-4-movie',{genre:'Documentaries'},opts),{code:'FILTER'});
  await assert.rejects(addon.catalog('movie','cinemana-all-movie',{genre:'Unknown'},opts),{code:'FILTER'});
});
test('details/transcodes preserve exact native IDs; mismatched response cannot play',async t=>{
  const config=await fixture(t),api=new FakeApi(),addon=new CinemanaAddon(api,config);
  const result=await addon.handle('stream','movie','alwan.cinemana:123',{},opts);assert.equal(result.streams[0].url,'https://media.example/123.mp4');assert(api.calls.some(c=>c.resource==='transcodes'&&c.id==='123'));
  api.details=async()=>video(999);await assert.rejects(addon.handle('stream','movie','alwan.cinemana:124',{},opts),{code:'IDENTITY'});
});
test('opening an episode catalog card resolves its verified series root and correct episode',async t=>{
  const config=await fixture(t),api=new FakeApi();api.details=async id=>video(id,'2',id==='201'?{rootSeries:'200'}:{});api.episodeRows=[video(201,'2',{rootSeries:'200',season:'1',episodeNummer:'1'})];
  const addon=new CinemanaAddon(api,config);const {meta}=await addon.handle('meta','series','alwan.cinemana:201',{},opts);
  assert.equal(meta.id,'alwan.cinemana:201');assert.equal(meta.cinemana.nativeId,'200');assert.equal(meta.behaviorHints.defaultVideoId,'alwan.cinemana:201');assert(api.calls.some(c=>c.resource==='episodes'&&c.id==='200'));
});
test('subtitle hash requests require the exact owned videoID and never match unrelated titles',async t=>{
  const config=await fixture(t),api=new FakeApi();api.details=async id=>video(id,'1',{translations:[{id:1,name:'Arabic',file:'https://subs.example/ar.srt'}]});const addon=new CinemanaAddon(api,config);
  assert.deepEqual(await addon.handle('subtitles','movie','hash123',{},opts),{subtitles:[]});
  assert.equal((await addon.handle('subtitles','movie','hash123',{videoID:'alwan.cinemana:1'},opts)).subtitles.length,1);
});
test('bootstrap file explicitly reports incomplete discovery',()=>{
  const manifest=buildManifest({categories:[],groups:[],collections:[],collectionItems:{},source:'bootstrap'},opts,'http://localhost:7000',true);
  assert.equal(manifest.cinemana.discoveryComplete,false);assert.equal(manifest.catalogs.length,8);assert.match(manifest.description,/Bootstrap/);
});

test('only two search catalogs are advertised and search returns results beyond 100',async t=>{
  const config=await fixture(t),api=new FakeApi();api.search=async req=>req.page<6?Array.from({length:20},(_,i)=>video(req.page*20+i+1)):[];
  const addon=new CinemanaAddon(api,config),manifest=await addon.manifest(opts,config.publicUrl);
  const searchable=manifest.catalogs.filter(c=>c.extra.some(e=>e.name==='search'));
  assert.equal(searchable.length,2);assert(searchable.every(c=>!c.extra.some(e=>e.name==='skip')));
  assert.equal((await addon.catalog('movie','cinemana-search-movie',{search:'example'},opts)).metas.length,120);
});
