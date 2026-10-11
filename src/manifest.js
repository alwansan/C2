import { catalogDefinitions, TYPES, SORTS, validRef } from './discovery.js';
import { PREFIX, array, text, localized } from './mapping.js';
const extra = (name, values, isRequired=false) => ({name,isRequired,...(values?{options:values,optionsLimit:1}:{})});
export function buildManifest(index, opts, baseUrl, bootstrap=false) {
  const categories=index.categories.filter(c=>validRef(c.nb)).map(c=>`${localized(c,'title',opts.language) || 'Category'} [${c.nb}]`);
  const languages=[...new Set(index.categories.flatMap(c=>array(c.langArray).filter(l=>validRef(l.langNb)).map(l=>`${text(l[opts.language==='ar'?'lang_ar_title':'lang_en_title'])||'Language'} [${l.langNb}]`)))];
  return {
    id:'org.alwan.cinemana',version:'0.1.0',name:'سينمانا • Cinemana',
    description:bootstrap?'Bootstrap descriptor only. Install the running service /manifest.json to discover all live Cinemana sections.':'كتالوجات سينمانا الأصلية، البحث الكامل، التفاصيل، الجودات وجميع نسخ الترجمة. يحتاج اتصال الخدمة بشبكة تسمح بالوصول إلى سينمانا.',
    logo:`${baseUrl}/logo.png`,types:TYPES,idPrefixes:[PREFIX],
    resources:['catalog',...['meta','stream','subtitles'].map(name=>({name,types:TYPES,idPrefixes:[PREFIX]}))],
    catalogs:catalogDefinitions(index,opts).map(descriptor=>{
      const supportsFilters=['all','search','category'].includes(descriptor.source);
      return {id:descriptor.id,type:descriptor.type,name:descriptor.name,extra:[...(descriptor.source==='search'?[]:[extra('skip')]),
        ...(descriptor.source==='search'?[extra('search',undefined,true)]:[]),
        ...(supportsFilters?[extra('genre',categories),extra('language',languages),extra('year'),extra('rating',Array.from({length:10},(_,i)=>String(i))),extra('staff')]:[]),
        ...(descriptor.source!=='search'&&supportsFilters?[extra('sort',Object.keys(SORTS))]:[]),
      ]};
    }),
    behaviorHints:{configurable:true,configurationRequired:false,p2p:false},
    config:[{key:'language',type:'select',title:'لغة المعلومات',options:['ar','en'],default:opts.language},
      {key:'subtitleMode',type:'select',title:'تسمية الترجمات: labels لـ Nuvio أو iso للعملاء القياسيين',options:['labels','iso'],default:opts.subtitleMode},
      {key:'quality',type:'select',title:'الجودة المفضلة أولًا، دون إخفاء بقية الجودات',options:['all','144','240','360','480','720','1080','2160'],default:opts.quality}],
    cinemana:{discoveryComplete:!bootstrap,discoverySource:index.source,observedAt:index.observedAt,categories:index.categories.length,groups:index.groups.length,collections:index.collections.length},
  };
}
