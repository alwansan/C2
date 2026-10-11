import { AddonError, assert } from './errors.js';
export const nativeId = value => { assert(/^[1-9][0-9]*$/.test(String(value)), 'IDENTITY', 'Invalid native ID'); return String(value); };
export const nativeRef = value => { const ref=String(value??'').trim(); assert(ref && ref!=='null' && ref.length<=200, 'IDENTITY','Invalid native section ID'); return ref; };
export class CinemanaApi {
  constructor(config, { fetchImpl = fetch, log = () => {} } = {}) {
    this.config = config; this.fetch = fetchImpl; this.log = log; this.inflight = new Map();
  }
  async get(path, query = {}) {
    assert(!path.startsWith('/') && !path.includes('..') && !path.includes('?'), 'PATH', 'Invalid native API path');
    const url = new URL(path, this.config.apiBase);
    for (const [name, value] of Object.entries(query)) if (value !== undefined && value !== null && value !== '') url.searchParams.set(name, String(value));
    const key = url.href;
    if (this.inflight.has(key)) return this.inflight.get(key);
    const pending = this.request(url, path).finally(() => this.inflight.delete(key));
    this.inflight.set(key, pending); return pending;
  }
  async request(url, path) {
    const start = Date.now();
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const headers = { Accept: 'application/json', 'Cache-Control': 'no-cache', 'User-Agent': this.config.userAgent };
        if (this.config.authorization) headers.authorization = this.config.authorization;
        const response = await this.fetch(url, { headers, signal: AbortSignal.timeout(this.config.timeoutMs), redirect: 'error' });
        if (!response.ok) {
          await response.body?.cancel();
          throw new AddonError(response.status === 401 || response.status === 403 ? 'UPSTREAM_ACCESS' : 'UPSTREAM_HTTP', `Cinemana returned HTTP ${response.status}`, 502, { upstreamStatus: response.status });
        }
        const length = Number(response.headers.get('content-length') || 0);
        assert(length <= 32 * 1024 * 1024, 'UPSTREAM_SIZE', 'Cinemana response too large', 502);
        const reader = response.body.getReader(); const chunks = []; let size = 0;
        while (true) { const {done,value} = await reader.read(); if (done) break; size += value.length; if (size > 32 * 1024 * 1024) { await reader.cancel(); throw new AddonError('UPSTREAM_SIZE','Cinemana response too large'); } chunks.push(value); }
        let data;
        try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
        catch { throw new AddonError('UPSTREAM_JSON', 'Cinemana returned invalid JSON'); }
        this.log({ event:'native_request', path, status:response.status, elapsedMs:Date.now()-start, rows:Array.isArray(data)?data.length:undefined });
        return data;
      } catch (error) {
        const retryable = !error.code || (error.details?.upstreamStatus >= 500);
        if (attempt === 0 && retryable) continue;
        this.log({event:'native_error',path,code:error.code || 'UPSTREAM_NETWORK',elapsedMs:Date.now()-start});
        if (error instanceof AddonError) throw error;
        throw new AddonError('UPSTREAM_NETWORK', 'Cannot reach Cinemana from this server network');
      }
    }
  }
  categories() { return this.get('categories'); }
  home(language, level) { return this.get(`videoGroups/lang/${language}/level/${level}`); }
  collections(level) { return this.get(`collectionsId/level/${level}`); }
  collection(id, level) { return this.get(`getCollection/collectionID/${encodeURIComponent(nativeRef(id))}/level/${level}`); }
  banner(level) { return this.get(`banner/level/${level}`); }
  newly(level) { return this.get(`newlyVideosItems/level/${level}/offset/12/`); }
  details(id) { return this.get(`allVideoInfo/id/${nativeId(id)}`); }
  episodes(id) { return this.get(`videoSeason/id/${nativeId(id)}`); }
  transcodes(id) { return this.get(`transcoddedFiles/id/${nativeId(id)}`); }
  group(id, level, page, count = 12) { return this.get('videoListPagination',{groupID:nativeRef(id),level,page,itemsPerPage:count}); }
  catalog({ type, category, lang, sort, page, level }) { return this.get('video/V/2', {categoryNb:category,videoKind:type==='movie'?'1':'2',langNb:lang,sortParam:sort,itemsPerPage:30,pageNumber:page,level}); }
  search({ type, query, staff, year, category, rating, page, level }) { return this.get('AdvancedSearch',{videoTitle:query,staffTitle:staff,type:type==='movie'?'movies':'series',year,category_id:category,star:rating,page,level}); }
  staff(id, level) { return this.get(`staff/actorID/${nativeId(id)}/level/${level}`); }
  comments(id) { return this.get(`videoComment/id/${nativeId(id)}`); }
}
