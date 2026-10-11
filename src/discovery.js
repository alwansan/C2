import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { assert } from './errors.js';
import { array, localized, text } from './mapping.js';
import { AsyncCache } from './cache.js';
export const TYPES = ['movie','series'];
export const SORTS = {
  'الإضافة: الأحدث':'desc','الإضافة: الأقدم':'asc',
  'الإصدار: الأحدث':'r_desc','الإصدار: الأقدم':'r_asc',
  'الاسم الإنجليزي: أ–ي':'en_title_asc','الاسم الإنجليزي: ي–أ':'en_title_desc',
  'الاسم العربي: أ–ي':'ar_title_asc','الاسم العربي: ي–أ':'ar_title_desc',
  'المشاهدات: الأعلى':'views_desc','المشاهدات: الأقل':'views_asc',
  'تقييم المستخدمين: الأعلى':'rating_desc','تقييم المستخدمين: الأقل':'rating_asc',
  'IMDb: الأعلى':'stars_desc','IMDb: الأقل':'stars_asc',
};
export const validRef = value => Boolean(text(value)) && text(value)!=='null' && text(value).length<=200;
export const slug = value => /^[A-Za-z0-9_-]+$/.test(text(value))?text(value):'b64-'+Buffer.from(text(value)).toString('base64url');
const valid=validRef;
export async function mapLimit(items, count, operation) {
  const results=new Array(items.length); let next=0;
  await Promise.all(Array.from({length:Math.min(count,items.length)},async()=>{
    while(next<items.length){const index=next++;results[index]=await operation(items[index],index);}
  }));return results;
}
export function catalogDefinitions(index, opts) {
  const descriptors=[];
  const add=(source,id,label,extra={})=> { for(const type of TYPES) descriptors.push({source,id:`${id}-${type}`,type,name:`سينمانا • ${label} • ${opts.language==='ar'?(type==='movie'?'أفلام':'مسلسلات'):type}`, ...extra}); };
  add('all','cinemana-all',opts.language==='ar'?'كل الأعمال':'All titles');
  add('search','cinemana-search',opts.language==='ar'?'البحث الشامل':'Full search');
  add('banner','cinemana-banner',opts.language==='ar'?'العروض الرئيسية':'Featured');
  add('newly','cinemana-new',opts.language==='ar'?'المضاف حديثًا':'Recently added');
  for(const category of index.categories) {
    if(!valid(category.nb)) continue;
    const name=localized(category,'title',opts.language) || `Category ${category.nb}`;
    add('category',`cinemana-category-${slug(category.nb)}`,name,{category:text(category.nb)});
    for(const lang of array(category.langArray)) if(valid(lang.langNb)) {
      add('category',`cinemana-category-${slug(category.nb)}-language-${slug(lang.langNb)}`,`${name} • ${text(lang[opts.language==='ar'?'lang_ar_title':'lang_en_title']) || lang.langNb}`,{category:text(category.nb),lang:text(lang.langNb)});
    }
  }
  for(const group of index.groups) {
    assert(valid(group.groupsID),'UPSTREAM_SHAPE','Home group has no valid groupsID',502);
    add('group',`cinemana-group-${slug(group.groupsID)}`,text(group.title) || `Group ${group.groupsID}`,{nativeId:text(group.groupsID),hasPagination:Number(group.hasPagination)!==0,content:array(group.content)});
  }
  for(const collection of index.collections) {
    assert(valid(collection.id),'UPSTREAM_SHAPE','Collection has no valid id',502);
    const title=text(collection.display_name) || text(collection.title) || `Collection ${collection.id}`;
    add('collection',`cinemana-collection-${slug(collection.id)}`,title,{nativeId:text(collection.id)});
    for(const [position,child] of array(index.collectionItems[text(collection.id)]).entries()) {
      const identity=valid(child.groupsID)?text(child.groupsID):`position-${position}`;
      add('collection-group',`cinemana-collection-${slug(collection.id)}-group-${slug(identity)}`,`${title} • ${text(child.display_name)||text(child.title)||identity}`,
        {nativeId:text(collection.id),groupId:valid(child.groupsID)?text(child.groupsID):undefined,position,content:array(child.content)});
    }
  }
  const unique=new Map();
  for(const descriptor of descriptors) {
    const key=`${descriptor.type}/${descriptor.id}`;
    const existing=unique.get(key);
    if(existing) { existing.content=[...array(existing.content),...array(descriptor.content)]; continue; }
    unique.set(key,descriptor);
  }
  return [...unique.values()];
}
export class Discovery {
  constructor(api, config, log=()=>{}) { this.api=api;this.config=config;this.cache=new AsyncCache(16);this.log=log;this.status={ready:false}; }
  async get(opts) {
    const key=`${opts.language}-${opts.level}-${this.config.authorization?createHash('sha256').update(this.config.authorization).digest('hex').slice(0,16):'guest'}`;
    return this.cache.get(key,this.config.catalogTtl,async()=>{
      try {
        const [categories,home,collections]=await Promise.all([this.api.categories(),this.api.home(opts.language,opts.level),this.api.collections(opts.level)]);
        assert(Array.isArray(categories)&&home&&Array.isArray(home.groups)&&Array.isArray(collections),'UPSTREAM_SHAPE','Invalid catalog discovery response',502);
        const entries=await mapLimit(collections,3,async collection=>{
          assert(valid(collection.id),'UPSTREAM_SHAPE','Invalid collection id',502);
          const rows=await this.api.collection(collection.id,opts.level);
          assert(Array.isArray(rows),'UPSTREAM_SHAPE','Invalid collection groups',502);
          return [text(collection.id),rows];
        });
        const index={categories,groups:home.groups,collections,collectionItems:Object.fromEntries(entries),observedAt:new Date().toISOString(),source:'live',language:opts.language,level:opts.level};
        catalogDefinitions(index,opts); // Validate before declaring discovery complete.
        await mkdir(this.config.dataDir,{recursive:true});
        const file=join(this.config.dataDir,`discovery-${key}.json`);
        await writeFile(file+'.tmp',JSON.stringify(index));await rename(file+'.tmp',file);
        this.status={ready:true,observedAt:index.observedAt,source:'live',categories:categories.length,groups:home.groups.length,collections:collections.length};
        return index;
      } catch(error) {
        this.status={ready:false,code:error.code||'DISCOVERY'};
        // A previously observed index preserves every declared catalog during an outage.
        // Its age/source is surfaced; failures never become a fabricated empty index.
        try {
          const cached=JSON.parse(await readFile(join(this.config.dataDir,`discovery-${key}.json`),'utf8'));
          assert(cached.language===opts.language&&cached.level===opts.level&&Array.isArray(cached.categories)&&Array.isArray(cached.groups)&&Array.isArray(cached.collections),'CACHE','Invalid discovery cache',502);
          catalogDefinitions(cached,opts);this.status={ready:true,source:'disk-stale',observedAt:cached.observedAt,upstreamError:error.code||'DISCOVERY'};
          return {...cached,source:'disk-stale'};
        } catch { throw error; }
      }
    });
  }
}
