import { assert } from './errors.js';
export function readConfig(env = process.env) {
  const integer = (name, fallback, min, max) => {
    const value = Number(env[name] ?? fallback);
    assert(Number.isSafeInteger(value) && value >= min && value <= max, 'CONFIG', `Invalid ${name}`);
    return value;
  };
  const url = (value, name) => {
    const parsed = new URL(value);
    assert(['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password && !parsed.search && !parsed.hash, 'CONFIG', `Invalid ${name}`);
    return parsed.href.replace(/\/$/, '');
  };
  const mediaHeaders = JSON.parse(env.CINEMANA_MEDIA_HEADERS || '{}');
  assert(mediaHeaders && typeof mediaHeaders === 'object' && !Array.isArray(mediaHeaders), 'CONFIG', 'Media headers must be an object');
  for (const [key, value] of Object.entries(mediaHeaders)) assert(typeof value === 'string' && !/[\r\n]/.test(key+value), 'CONFIG', 'Invalid media header');
  const accessKey = env.ADDON_ACCESS_KEY || '';
  assert(!accessKey || /^[A-Za-z0-9_-]{24,128}$/.test(accessKey), 'CONFIG', 'Access key needs 24–128 URL-safe characters');
  return {
    host: env.HOST || '127.0.0.1', port: integer('PORT', 7000, 1, 65535),
    publicUrl: url(env.PUBLIC_URL || 'http://127.0.0.1:7000', 'PUBLIC_URL'),
    apiBase: url(env.CINEMANA_API_BASE || 'https://cinemana.shabakaty.cc/api/android/', 'CINEMANA_API_BASE')+'/',
    authorization: env.CINEMANA_AUTHORIZATION || '',
    userAgent: env.CINEMANA_USER_AGENT || 'Android 15; Cinemana -1; AlwanCinema Addon', mediaHeaders, accessKey,
    timeoutMs: integer('REQUEST_TIMEOUT_MS', 12000, 100, 60000),
    pagesPerRequest: integer('PAGES_PER_REQUEST', 40, 1, 1000),
    catalogTtl: integer('CATALOG_TTL_MS', 900000, 1000, 86400000),
    dataDir: env.DATA_DIR || './data',
  };
}
export const DEFAULT_OPTIONS = Object.freeze({ language: 'ar', level: '0', subtitleMode: 'labels', quality: 'all' });
export function options(input = {}) {
  const value = { ...DEFAULT_OPTIONS, ...input };
  assert(['ar','en'].includes(value.language), 'CONFIG', 'language must be ar or en');
  assert(/^[0-9]{1,2}$/.test(value.level), 'CONFIG', 'Invalid parental level');
  assert(['labels','iso'].includes(value.subtitleMode), 'CONFIG', 'Invalid subtitleMode');
  assert(/^(all|144|240|360|480|540|576|720|1080|1440|2160)$/.test(value.quality), 'CONFIG', 'Invalid preferred quality');
  assert(Object.keys(input).every(key => Object.hasOwn(DEFAULT_OPTIONS, key)), 'CONFIG', 'Unknown installation option');
  return value;
}
export function encodeOptions(value) { return Buffer.from(JSON.stringify(options(value))).toString('base64url'); }
export function decodeOptions(value) {
  assert(value.length <= 512 && /^[A-Za-z0-9_-]+$/.test(value), 'CONFIG', 'Invalid configuration path');
  try { return options(JSON.parse(Buffer.from(value,'base64url').toString('utf8'))); }
  catch (e) { if (e.code) throw e; assert(false,'CONFIG','Invalid configuration JSON'); }
}
