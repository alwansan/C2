import { createHash } from 'node:crypto';
import { assert } from './errors.js';
import { nativeId } from './api.js';
export const PREFIX = 'alwan.cinemana:';
export const encodeId = id => PREFIX + nativeId(id);
export function decodeId(id) { assert(typeof id === 'string' && id.startsWith(PREFIX), 'IDENTITY', 'Foreign media ID', 404); return nativeId(id.slice(PREFIX.length)); }
export const text = value => value === undefined || value === null ? '' : String(value).trim();
export const array = value => Array.isArray(value) ? value : [];
export const localized = (row, key, language = 'ar') => text(row?.[`${language}_${key}`]) || text(row?.[`${language==='ar'?'en':'ar'}_${key}`]) || text(row?.[key]);
export const mediaType = row => text(row.kind) === '1' ? 'movie' : text(row.kind) === '2' ? 'series' : undefined;
export function httpUrl(value) {
  try { const url = new URL(text(value)); return ['http:','https:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined; } catch { return undefined; }
}
const compact = object => Object.fromEntries(Object.entries(object).filter(([,value]) => value !== undefined && value !== ''));
const names = (row, key) => [...new Set(array(row[key]).map(item => text(item.name)).filter(Boolean))];
export function isoDate(value) {
  const raw = text(value); if (!/^\d{4}-\d{2}-\d{2}(?:$|[ T])/.test(raw)) return undefined;
  let candidate = raw.replace(' ', 'T'); if (candidate.length === 10) candidate += 'T00:00:00Z';
  else if (!/(Z|[+-]\d{2}:?\d{2})$/.test(candidate)) candidate += 'Z';
  const date = new Date(candidate); return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}
export function preview(row, opts) {
  if (!row || typeof row !== 'object' || !mediaType(row) || !/^[1-9][0-9]*$/.test(text(row.nb))) return undefined;
  const seconds = Number(row.duration);
  return compact({
    id:encodeId(row.nb),type:mediaType(row),name:localized(row,'title',opts.language) || `Cinemana #${row.nb}`,
    poster:httpUrl(row.imgMediumThumbObjUrl) || httpUrl(row.imgObjUrl) || httpUrl(row.imgThumbObjUrl),posterShape:'poster',
    background:httpUrl(row.imgObjUrl),description:localized(row,'content',opts.language),releaseInfo:text(row.year),
    imdbRating:/^(?:10(?:\.0+)?|[0-9](?:\.[0-9]+)?)$/.test(text(row.stars)) ? text(row.stars) : undefined,
    imdb_id:/tt\d+/.exec(text(row.imdbUrlRef))?.[0],
    genres:[...new Set(array(row.categories).map(category=>localized(category,'title',opts.language)).filter(Boolean))],
    runtime:Number.isFinite(seconds) && seconds>0 ? `${Math.round(seconds/60)} min` : undefined,
    language:localized(row.videoLanguages,'title',opts.language),
    cinemana:{nativeId:text(row.nb),rootSeries:text(row.rootSeries),episode:text(row.episodeNummer),season:text(row.season),isSpecial:text(row.isSpecial)},
  });
}
export function meta(row, episodes, opts) {
  const result = preview(row,opts); assert(result,'UPSTREAM_SHAPE','Invalid Cinemana detail',502);
  result.cast = names(row,'actorsInfo'); result.director = names(row,'directorsInfo'); result.writer = names(row,'writersInfo');
  result.website = httpUrl(row.imdbUrlRef);
  result.released = isoDate(row.publishDate);
  const trailer = text(row.trailer);
  let youtube;
  try { const url = new URL(trailer); if (/^(www\.|m\.)?youtube\.com$/.test(url.hostname)) youtube=url.searchParams.get('v'); else if (url.hostname==='youtu.be') youtube=url.pathname.slice(1); } catch { if (/^[A-Za-z0-9_-]{11}$/.test(trailer)) youtube=trailer; }
  if (youtube && /^[A-Za-z0-9_-]{11}$/.test(youtube)) result.trailers = [{source:youtube,type:'Trailer'}];
  result.cinemana = { ...row, nativeId:text(row.nb) }; // Lossless source fields, including cast images, skips, and all translation variants.
  if (result.type==='series') {
    const seen = new Set(); const rejected = [];
    result.videos = array(episodes).flatMap(episode => {
      const root = text(episode.rootSeries), id = text(episode.nb);
      if ((root && root!=='0' && root!==text(row.nb)) || !/^[1-9][0-9]*$/.test(id)) { rejected.push(id); return []; }
      const season = Number(episode.season), number = Number(episode.episodeNummer);
      if (text(episode.season)==='' || text(episode.episodeNummer)==='' || !Number.isSafeInteger(season) || !Number.isSafeInteger(number) || season<0 || number<0 || seen.has(id)) { rejected.push(id); return []; }
      seen.add(id); const released = isoDate(episode.publishDate);
      return [compact({id:encodeId(id),season,episode:number,
        title:text(episode[`custom_${opts.language}_title`]) || localized(episode,'title',opts.language) || (opts.language==='ar'?`الحلقة ${number}`:`Episode ${number}`),
        released:released || '1970-01-01T00:00:00.000Z',available:true,
        thumbnail:httpUrl(episode.imgMediumThumbObjUrl) || httpUrl(episode.imgObjUrl),overview:localized(episode,'content',opts.language),
        cinemana:{...episode,releaseDateUnknown:!released,releaseDateTimezone:released?'UTC assumed for timezone-less API values':undefined},
      })];
    }).sort((a,b)=>a.season-b.season || a.episode-b.episode);
    result.cinemana.rejectedEpisodeIds = rejected;
    result.cinemana.nativeEpisodes = episodes;
  }
  return compact(result);
}
function subtitleLanguage(name) {
  const label = name.normalize('NFKC').replace(/[\u064b-\u065f\u0670]/g,'').toLowerCase();
  const languages = [
    ['ara',/عرب|arab/],['eng',/إنك|انك|إنج|انج|english|\beng\b/],['tur',/ترك|turkish|\btur\b/],
    ['fra',/فرنس|french|\bfre\b|\bfra\b/],['spa',/إسبان|اسبان|spanish|\bspa\b/],['deu',/ألمان|المان|german|\bger\b|\bdeu\b/],
    ['fas',/فارس|persian|farsi/],['kor',/كور|korean/],['jpn',/يابان|japanese/],['rus',/روس|russian/],['hin',/هند|hindi/],['ita',/إيطال|ايطال|italian/],['por',/برتغال|portuguese/],['zho',/صين|chinese/],['urd',/أردو|اردو|urdu/],
  ];
  return languages.find(([,match])=>match.test(label))?.[0] || 'und';
}
export function subtitles(row, opts) {
  const records = array(row.translations).slice();
  if (!records.length && httpUrl(row.arTranslationFilePath)) records.push({id:'legacy-ar',name:'عربية',type:'legacy',extention:'srt',file:row.arTranslationFilePath});
  const unique = new Set();
  return records.flatMap(sub => {
    const url = httpUrl(sub.file); if (!url) return [];
    const label = text(sub.name) || (opts.language==='ar'?'ترجمة':'Subtitle');
    const language = subtitleLanguage(label);
    const digest = createHash('sha256').update([text(row.nb),text(sub.id),text(sub.type),text(sub.extention),label,text(sub.id)?new URL(url).origin+new URL(url).pathname:url].join('\0')).digest('hex').slice(0,20);
    if (unique.has(digest)) return []; unique.add(digest);
    const enhanced = /محسن|enhanc|improv/i.test(label.normalize('NFKC').replace(/[\u064b-\u065f\u0670]/g,''));
    // Nuvio currently ignores label/name and renders lang. A descriptive lang is
    // explicitly accepted by Stremio for values outside ISO639-2. ISO mode keeps
    // language matching intact for clients that honor the standard label field.
    const lang = opts.subtitleMode==='labels' && (enhanced || language==='und') ? (enhanced&&language==='ara'&&!/عرب/.test(label)?'عربية محسنة':label) : language;
    return [{id:`${PREFIX}subtitle:${digest}`,url,lang,label,name:label,
      cinemana:{nativeId:text(sub.id),nativeType:text(sub.type),extension:text(sub.extention),language,enhanced}}];
  });
}
export function streams(id, rows, detail, opts, config) {
  const subs = subtitles(detail,opts); const seen = new Set();
  const result = array(rows).flatMap(row=>{
    const url = httpUrl(row.videoUrl); if (!url) return [];
    const identity = [url,text(row.container),text(row.resolution),text(row.name)].join('\0');
    if (seen.has(identity)) return []; seen.add(identity);
    const resolution = text(row.resolution) || text(row.name) || 'Original';
    const height = Number(/(?:^|\D)(\d{3,4})(?:p|\D|$)/i.exec(resolution)?.[1] || (/4k/i.test(resolution)?2160:0));
    const container = text(row.container); const title = [resolution,container,text(row.name)].filter(Boolean).join(' • ');
    const mediaHeaders = config.mediaHeaders || {};
    return [{url,name:`سينمانا • ${resolution}`,title,description:title,subtitles:subs,
      behaviorHints:compact({notWebReady:new URL(url).protocol!=='https:' || !/\.mp4$/i.test(new URL(url).pathname) || Object.keys(mediaHeaders).length>0,
        bingeGroup:`${PREFIX}${resolution}:${container}`,filename:text(row.transcoddedFileName) || new URL(url).pathname.split('/').pop(),
        proxyHeaders:Object.keys(mediaHeaders).length?{request:mediaHeaders}:undefined}),
      cinemana:{...row,nativeId:text(id),height},
    }];
  });
  if (opts.quality!=='all') {
    const wanted=Number(opts.quality),heights=[...new Set(result.map(s=>s.cinemana.height).filter(h=>h>0))].sort((a,b)=>a-b);
    const chosen=heights.find(h=>h>=wanted) ?? heights.at(-1);
    result.sort((a,b)=>Number(b.cinemana.height===chosen)-Number(a.cinemana.height===chosen));
  }
  return result; // Preference changes order, never hides any quality.
}
