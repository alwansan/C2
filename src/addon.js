import { assert } from './errors.js';
import { Discovery, catalogDefinitions, SORTS, mapLimit, validRef } from './discovery.js';
import { Pager } from './pager.js';
import { AsyncCache } from './cache.js';
import { buildManifest } from './manifest.js';
import { decodeId, encodeId, PREFIX, text, array, localized, mediaType, meta, streams, subtitles } from './mapping.js';
export class CinemanaAddon {
  constructor(api, config, {log=()=>{}}={}) {
    this.api=api;this.config=config;this.discovery=new Discovery(api,config,log);this.pager=new Pager(config,log);this.cache=new AsyncCache(256);
  }
  async manifest(opts,baseUrl) { return buildManifest(await this.discovery.get(opts),opts,baseUrl); }
  async detail(id) {
    return this.cache.get(`detail:${id}`,60000,async()=>{
      const row=await this.api.details(id);
      assert(row&&typeof row==='object'&&!Array.isArray(row)&&text(row.nb)===id,'IDENTITY','Cinemana detail identity mismatch',502);
      return row;
    });
  }
  async handle(resource,type,id,extras,opts) {
    assert(['movie','series'].includes(type),'TYPE','Unsupported content type',404);
    if(resource==='catalog') return this.catalog(type,id,extras,opts);
    if(resource==='subtitles'&&!id.startsWith(PREFIX)) {
      if(text(extras.videoID).startsWith(PREFIX)) id=extras.videoID;
      else return {subtitles:[]}; // Never attach Cinemana subtitles to unrelated content.
    }
    const native=decodeId(id);
    const detail=await this.detail(native);
    assert(mediaType(detail)===type,'IDENTITY','Cinemana media type mismatch',502);
    if(resource==='meta') {
      let rootDetail=detail;
      if(type==='series' && /^[1-9][0-9]*$/.test(text(detail.rootSeries)) && text(detail.rootSeries)!==native) {
        rootDetail=await this.detail(text(detail.rootSeries));
        assert(mediaType(rootDetail)==='series','IDENTITY','Series parent type mismatch',502);
      }
      const episodes=type==='series'?await this.api.episodes(text(rootDetail.nb)):[];
      assert(Array.isArray(episodes),'UPSTREAM_SHAPE','Invalid episode list',502);
      const result=meta(rootDetail,episodes,opts);
      if(rootDetail!==detail) {result.id=id;result.behaviorHints={defaultVideoId:encodeId(native)};result.cinemana.openedEpisodeNativeId=native;}
      return {meta:result};
    }
    if(resource==='stream') {
      const rows=await this.api.transcodes(native);assert(Array.isArray(rows),'UPSTREAM_SHAPE','Invalid quality list',502);
      return {streams:streams(native,rows,detail,opts,this.config)};
    }
    if(resource==='subtitles') return {subtitles:subtitles(detail,opts)};
    assert(false,'RESOURCE','Unsupported resource',404);
  }
  async catalog(type,id,extras,opts) {
    const known=['skip','search','genre','language','year','rating','sort','staff'];
    assert(Object.keys(extras).every(key=>known.includes(key)),'FILTER','Unknown catalog filter');
    assert(extras.skip===undefined || /^\d+$/.test(extras.skip),'OFFSET','Invalid skip');
    const skip=Number(extras.skip||0);
    const index=await this.discovery.get(opts);
    const descriptor=catalogDefinitions(index,opts).find(d=>d.id===id&&d.type===type);
    assert(descriptor,'CATALOG','Unknown Cinemana catalog',404);
    const query=text(extras.search),staff=text(extras.staff);
    assert(query.length<=160&&staff.length<=160,'SEARCH','Search too long');
    if(descriptor.source==='search'&&!query&&!staff) return {metas:[]};
    const filterable=['all','search','category'].includes(descriptor.source);
    assert(filterable || Object.keys(extras).every(k=>k==='skip'),'FILTER','This original curated catalog supports pagination, not advanced filters');
    const resolveChoice=(value,rows,idKey,label)=> {
      if(!value) return undefined;
      const suffix=/\[([^\]\r\n]{1,200})\]$/.exec(value)?.[1];
      const matches=rows.filter(row=>text(row[idKey])===value || text(row[idKey])===suffix || label(row)===value);
      const ids=[...new Set(matches.map(row=>text(row[idKey])))];
      assert(ids.length===1,'FILTER','Unknown or ambiguous native filter');return ids[0];
    };
    const categoryChoice=resolveChoice(text(extras.genre),index.categories,'nb',c=>localized(c,'title',opts.language));
    assert(!descriptor.category||!categoryChoice||descriptor.category===categoryChoice,'FILTER','Category does not match this section');
    const category=descriptor.category||categoryChoice;
    const languages=index.categories.filter(c=>!category||text(c.nb)===category).flatMap(c=>array(c.langArray));
    const languageChoice=resolveChoice(text(extras.language),languages,'langNb',l=>text(l[opts.language==='ar'?'lang_ar_title':'lang_en_title']));
    assert(!descriptor.lang||!languageChoice||descriptor.lang===languageChoice,'FILTER','Language does not match this section');
    const lang=descriptor.lang||languageChoice;
    const year=text(extras.year);let first,last;
    if(year) {
      assert(/^\d{4}(?:,\d{4})?$/.test(year),'FILTER','year must be YYYY or YYYY,YYYY');
      [first,last]=year.split(',').map(Number);last??=first;assert(first<=last,'FILTER','Invalid year range');
    }
    const rating=text(extras.rating);assert(!rating||/^[0-9]$/.test(rating),'FILTER','Minimum IMDb rating must be 0–9');
    const sort=extras.sort?SORTS[extras.sort]:undefined;assert(!extras.sort||sort,'FILTER','Invalid native sort');
    assert(!((query||staff)&&sort),'FILTER','Native AdvancedSearch does not support sortParam; use sorting in a browse catalog');
    const request={type,category,lang,sort,query,staff,year:year?`${first},${last}`:undefined,rating:rating||undefined,level:opts.level};
    const key=JSON.stringify([descriptor.id,type,opts,request]);
    const isSearch=Boolean(query||staff);
    let finite=false,load;
    if(filterable) {
      load=async page=>{
        const rows=isSearch?await this.api.search({...request,page}):await this.api.catalog({...request,page});
        assert(Array.isArray(rows),'UPSTREAM_SHAPE','Invalid native catalog',502);
        // For filtering that the chosen native endpoint cannot express, inspect every
        // native row before paging the filtered output. No first-page-only filtering.
        const requiresLocalYear=!isSearch&&year;
        const requiresLocalRating=!isSearch&&Number(rating)>0;
        const requiresLocalLanguage=isSearch&&lang;
        if(!requiresLocalYear&&!requiresLocalRating&&!requiresLocalLanguage) return rows;
        const accepted=await mapLimit(rows,3,async row=>{
          let detail=row;
          if((requiresLocalYear&&!text(row.year))||(requiresLocalRating&&!text(row.stars))||(requiresLocalLanguage&&!row.videoLanguages)) detail=await this.detail(text(row.nb));
          if(requiresLocalYear&&!(Number(detail.year)>=first&&Number(detail.year)<=last)) return null;
          if(requiresLocalRating&&!(Number(detail.stars)>=Number(rating))) return null;
          if(requiresLocalLanguage) {
            const native=detail.videoLanguages;
            const labels=languages.filter(l=>text(l.langNb)===lang).flatMap(l=>[text(l.lang_ar_title),text(l.lang_en_title)]).filter(Boolean);
            if(!labels.some(label=>label===text(native?.ar_title)||label===text(native?.en_title))) return null;
          }
          return row;
        });
        // Pager receives raw page existence separately: an empty filtered page MUST
        // NOT signal source exhaustion. Preserve the raw page for end/repeat detection.
        return {raw:rows,rows:accepted.filter(Boolean)};
      };
    } else if(descriptor.source==='group') {
      finite=!descriptor.hasPagination;load=page=>finite?Promise.resolve(page===0?descriptor.content:[]):this.api.group(descriptor.nativeId,opts.level,page);
    } else if(descriptor.source==='collection-group') {
      finite=!descriptor.groupId;load=page=>finite?Promise.resolve(page===0?descriptor.content:[]):this.api.group(descriptor.groupId,opts.level,page);
    } else if(descriptor.source==='collection') {
      const children=array(index.collectionItems[descriptor.nativeId]);finite=!children.some(child=>validRef(child.groupsID));
      load=async page=>(await mapLimit(children,3,async child=>{
        if(validRef(child.groupsID)) return this.api.group(text(child.groupsID),opts.level,page);
        return page===0?array(child.content):[];
      })).flat();
    } else if(descriptor.source==='banner'||descriptor.source==='newly') {
      finite=true;load=async page=>{
        if(page!==1) return [];
        const result=descriptor.source==='banner'?await this.api.banner(opts.level):await this.api.newly(opts.level);
        assert(Array.isArray(result),'UPSTREAM_SHAPE','Invalid curated feed',502);return result;
      };
    }
    const metas=await this.pager.page(key,skip,type,opts,load,{finite,all:isSearch&&skip===0});
    return {metas};
  }
  async native(resource,id,opts) {
    if(resource==='index') return this.discovery.get(opts);
    if(resource==='details') return this.detail(decodeId(id));
    if(resource==='episodes') return this.api.episodes(decodeId(id));
    if(resource==='transcodes') return this.api.transcodes(decodeId(id));
    if(resource==='comments') return this.api.comments(decodeId(id));
    if(resource==='staff') return this.api.staff(decodeId(id),opts.level);
    assert(false,'RESOURCE','Unknown native extension',404);
  }
}
