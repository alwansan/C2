import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogDefinitions } from '../src/discovery.js';
import { buildManifest } from '../src/manifest.js';
import { CinemanaAddon } from '../src/addon.js';
import { fixture, FakeApi, opts, video } from './fixtures.js';

class LanguageApi extends FakeApi {
  async categories() {
    return [
      {nb:'4',ar_title:'أكشن',en_title:'Action',langArray:[
        {langNb:'12',lang_ar_title:'العربية',lang_en_title:'Arabic'},
        {langNb:'13',lang_ar_title:'الإنجليزية',lang_en_title:'English'},
      ]},
      {nb:'7',ar_title:'دراما',en_title:'Drama',langArray:[
        {langNb:'99',lang_ar_title:'الفرنسية',lang_en_title:'French'},
      ]},
    ];
  }
  async catalog(request) {
    this.calls.push({resource:'catalog',...request});
    const rows=Array.from({length:150},(_,i)=>video(i+1,'1',{videoLanguages:{ar_title:i%2?'الإنجليزية':'العربية'}}));
    const selected=request.lang?rows.filter((_,i)=>request.lang==='12'?i%2===0:i%2===1):rows;
    return selected.slice(request.page*30,(request.page+1)*30);
  }
}

test('many native language branches collapse to one catalog per category and content type',()=>{
  const index={categories:Array.from({length:50},(_,i)=>({nb:String(i+1),ar_title:`تصنيف ${i+1}`,langArray:Array.from({length:18},(_,j)=>({langNb:String(j+1),lang_ar_title:`لغة ${j+1}`}))})),groups:[],collections:[],collectionItems:{}};
  const manifest=buildManifest(index,opts,'http://localhost:7000');
  assert.equal(manifest.catalogs.length,108);
  assert.equal(manifest.cinemana.mergedLanguageCatalogs,1800);
  assert.equal(manifest.cinemana.catalogCount,108);
  assert.equal(manifest.version,'0.1.1');
  assert(manifest.catalogs.every(c=>!c.id.includes('-language-')));
  const before=JSON.stringify(index);
  assert.equal(catalogDefinitions(index,opts,{includeLanguageVariants:true}).length,1908);
  assert.equal(JSON.stringify(index),before);
});

test('fixed categories expose only their own languages through the standard genre control',async t=>{
  const config=await fixture(t),addon=new CinemanaAddon(new LanguageApi(),config);
  const manifest=await addon.manifest(opts,config.publicUrl);
  const category=manifest.catalogs.find(c=>c.id==='cinemana-category-4-movie');
  assert.deepEqual(category.extra.find(e=>e.name==='genre').options,['العربية [lang:12]','الإنجليزية [lang:13]']);
  assert.deepEqual(category.extra.find(e=>e.name==='language').options,['العربية [12]','الإنجليزية [13]']);
  const english=await addon.manifest({...opts,language:'en'},config.publicUrl);
  assert.deepEqual(english.catalogs.find(c=>c.id===category.id).extra.find(e=>e.name==='genre').options,['Arabic [lang:12]','English [lang:13]']);
  assert.equal(manifest.catalogs.filter(c=>c.extra.some(e=>e.name==='search')).length,2);
});

test('combined category reads all languages across pages without selecting the first language',async t=>{
  const config=await fixture(t),api=new LanguageApi(),addon=new CinemanaAddon(api,config);
  const first=await addon.catalog('movie','cinemana-category-4-movie',{},opts);
  const next=await addon.catalog('movie','cinemana-category-4-movie',{skip:'100'},opts);
  assert.equal(first.metas.length,100);assert.equal(next.metas.length,50);
  assert.deepEqual([...first.metas,...next.metas].map(m=>m.id),Array.from({length:150},(_,i)=>`alwan.cinemana:${i+1}`));
  assert(api.calls.filter(c=>c.resource==='catalog').every(c=>c.category==='4'&&c.lang===undefined));
});

test('language genre and explicit language extra use the exact native language ID',async t=>{
  const config=await fixture(t),api=new LanguageApi(),addon=new CinemanaAddon(api,config);
  const result=await addon.catalog('movie','cinemana-category-4-movie',{genre:'الإنجليزية [lang:13]'},opts);
  assert.equal(result.metas.length,75);assert(result.metas.every(m=>Number(m.cinemana.nativeId)%2===0));
  assert(api.calls.filter(c=>c.resource==='catalog').every(c=>c.category==='4'&&c.lang==='13'));
  await addon.catalog('movie','cinemana-category-4-movie',{language:'12'},opts);
  assert(api.calls.some(c=>c.resource==='catalog'&&c.lang==='12'));
  await assert.rejects(addon.catalog('movie','cinemana-category-4-movie',{genre:'الفرنسية [lang:99]'},opts),{code:'FILTER'});
  await assert.rejects(addon.catalog('movie','cinemana-category-4-movie',{genre:'العربية [lang:12]',language:'13'},opts),{code:'FILTER'});
});

test('previously installed language catalog URLs remain working but are not advertised',async t=>{
  const config=await fixture(t),api=new LanguageApi(),addon=new CinemanaAddon(api,config);
  const oldId='cinemana-category-4-language-13-movie';
  const result=await addon.catalog('movie',oldId,{},opts);
  assert.equal(result.metas.length,75);assert(api.calls.some(c=>c.resource==='catalog'&&c.lang==='13'));
  assert(!(await addon.manifest(opts,config.publicUrl)).catalogs.some(c=>c.id===oldId));
  await assert.rejects(addon.catalog('movie',oldId,{genre:'العربية [lang:12]'},opts),{code:'FILTER'});
});

test('finite featured and recent feeds start at native page zero',async t=>{
  const config=await fixture(t),addon=new CinemanaAddon(new FakeApi(),config);
  assert.deepEqual((await addon.catalog('movie','cinemana-banner-movie',{},opts)).metas.map(m=>m.id),['alwan.cinemana:1']);
  assert.deepEqual((await addon.catalog('series','cinemana-new-series',{},opts)).metas.map(m=>m.id),['alwan.cinemana:4']);
  assert.deepEqual((await addon.catalog('series','cinemana-new-series',{skip:'100'},opts)).metas,[]);
});
