from pathlib import Path
import re
SOURCE=Path(__file__).resolve().parent/'addon-source/src'
if not SOURCE.exists():SOURCE=Path(__file__).resolve().parent.parent/'cinemana-addon/src'
OUT=Path(__file__).resolve().parent.parent/'NuvioAlwanCinema/composeApp/src/androidMain/assets/cinemana/bundle.js'
def build(source=SOURCE):
 out='''const modules = {}; const factories = {}; function require(id) { if(!modules[id]) { const exports={}; modules[id]=exports; factories[id](exports); } return modules[id]; }
const createHash = () => { let s=''; return {update(v){s+=v;return this;},digest(){return __cinema_hash(s);}};};
const Buffer={from(v){return {toString(){return __cinema_base64(String(v));}};}};
const join=(...v)=>v.join('/'); const mkdir=async()=>{};
const readFile=async p=>__cinema_file('read',p,''); const writeFile=async(p,v)=>__cinema_file('write',p,String(v)); const rename=async(a,b)=>__cinema_file('rename',a,b);
class URL {constructor(v){const m=/^(https?):\\/\\/([^/;?#]+)([^?#]*)(?:\\?([^#]*))?(?:#.*)?$/.exec(String(v));if(!m)throw Error('Invalid URL');this.protocol=m[1]+':';this.hostname=m[2].split(':')[0];this.origin=m[1]+'://'+m[2];this.pathname=m[3]||'/';this.href=String(v);this.username=m[2].includes('@')?'invalid':'';this.password='';this.searchParams={get:k=>{for(const p of (m[4]||'').split('&')){const a=p.split('=');if(decodeURIComponent(a[0])===k)return decodeURIComponent(a.slice(1).join('='));}return null;}};}}
'''
 for name in ['errors','cache','api','mapping','pager','discovery','manifest','addon']:
  code=(source/f'{name}.js').read_text()
  if name=='discovery':
   needle='return this.cache.get(key,this.config.catalogTtl,async()=>{'
   replacement=needle+'''
      // Fresh disk cache avoids rediscovering every collection after each process restart.
      try {
        const cached=JSON.parse(await readFile(join(this.config.dataDir,`discovery-${key}.json`),'utf8'));
        const age=Date.now()-Date.parse(cached.observedAt);
        if(age>=0&&age<this.config.catalogTtl&&cached.language===opts.language&&cached.level===opts.level&&Array.isArray(cached.categories)&&Array.isArray(cached.groups)&&Array.isArray(cached.collections)) {
          catalogDefinitions(cached,opts);this.status={ready:true,source:'disk-fresh',observedAt:cached.observedAt};return {...cached,source:'disk-fresh'};
        }
      } catch {}
'''
   assert code.count(needle)==1
   code=code.replace(needle,replacement)
  if name=='api':
   start=code.index('  async get('); end=code.index('  categories()',start)
   code=code.replace('fetchImpl = fetch','fetchImpl = undefined')
   start=code.index('  async get('); end=code.index('  categories()',start)
   code=code[:start]+'''  async get(path,query={}) { return JSON.parse(await __cinema_get(path,JSON.stringify(query))); }
'''+code[end:]
  exports=re.findall(r'^export\s+(?:async\s+)?(?:function|class|const)\s+(\w+)',code,re.M)
  def imports(m):
   names,path=m.groups()
   if path.startswith('node:'):return ''
   return 'const {'+names+'}=require('+repr(Path(path).stem)+');'
  code=re.sub(r"^import \{([^}]+)\} from '([^']+)';",imports,code,flags=re.M)
  code=re.sub(r'^export\s+','',code,flags=re.M)
  out+=f'factories[{name!r}] = exports => {{\n'+code+'\nObject.assign(exports,{'+','.join(exports)+'});\n};\n'
 out+='''const config={authorization:'',mediaHeaders:{},dataDir:'discovery',catalogTtl:900000,pagesPerRequest:40};
const api=new (require('api').CinemanaApi)(config);const addon=new(require('addon').CinemanaAddon)(api,config);
async function cinemaRequest(url){const base='https://cinemana.internal';if(!url.startsWith(base+'/'))throw Error('Foreign URL');const p=url.slice(base.length+1);const opts=typeof __cinema_options==='function'?JSON.parse(__cinema_options()):{language:'ar',level:'0',subtitleMode:'labels',quality:'all'};
if(p==='diagnostics.json')return JSON.stringify({version:'0.1.1',runtime:'embedded',sourcePagesStartAt:0,ready:true});
if(p==='manifest.json')return JSON.stringify(await addon.manifest(opts,base));
const parts=p.replace(/\\.json$/,'').split('/');if(parts.length<3||parts.length>4)throw Error('Invalid resource');const extras={};for(const pair of (parts[3]||'').split('&')){if(!pair)continue;const n=pair.indexOf('=');extras[decodeURIComponent(pair.slice(0,n))]=decodeURIComponent(pair.slice(n+1));}
return JSON.stringify(await addon.handle(parts[0],parts[1],decodeURIComponent(parts[2]),extras,opts));}
'''
 return out
if __name__=='__main__':
 import argparse
 parser=argparse.ArgumentParser()
 parser.add_argument('--source',type=Path,default=SOURCE)
 parser.add_argument('--output',type=Path,default=OUT)
 args=parser.parse_args()
 args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(build(args.source))
