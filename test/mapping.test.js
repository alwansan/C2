import test from 'node:test';
import assert from 'node:assert/strict';
import { PREFIX, decodeId, encodeId, preview, meta, streams, subtitles } from '../src/mapping.js';
import { video, opts } from './fixtures.js';
test('native numeric IDs remain exact; unrelated and malformed IDs rejected',()=>{
  assert.equal(decodeId(encodeId('12345678901234567890')),'12345678901234567890');
  for(const id of ['tt123','cinemana:123',PREFIX+'0',PREFIX+'1/2',PREFIX+'1:2',PREFIX+'001'])assert.throws(()=>decodeId(id));
});
test('metadata keeps source fields, crew, categories, ratings and original episode IDs',()=>{
  const row=video(200,'2',{actorsInfo:[{nb:'5',name:'Actor',staff_img:'https://media.example/person.jpg'}],categories:[{ar_title:'أنمي',en_title:'Anime'}],introSkipping:[{start:'5',end:'25',control_level:'0'}],skippingDurations:{start:['90'],end:['100']},trailer:'https://youtu.be/abcDEF12345'});
  const episodes=[video(201,'2',{rootSeries:'200',season:'0',episodeNummer:'1',custom_ar_title:'حلقة خاصة'}),video(202,'2',{rootSeries:'200',season:'1',episodeNummer:'10',publishDate:'2020-10-11 12:00:00'}),video(201,'2',{rootSeries:'200',season:'0',episodeNummer:'1'}),video(999,'2',{rootSeries:'900',season:'1',episodeNummer:'10'})];
  const mapped=meta(row,episodes,opts);assert.deepEqual(mapped.cast,['Actor']);assert.deepEqual(mapped.genres,['أنمي']);assert.equal(mapped.runtime,'60 min');assert.equal(mapped.imdbRating,'7.5');
  assert.deepEqual(mapped.videos.map(e=>e.id),[encodeId(201),encodeId(202)]);assert.equal(mapped.videos[0].season,0);assert.equal(mapped.videos[0].cinemana.releaseDateUnknown,true);
  assert.equal(mapped.videos[1].released,'2020-10-11T12:00:00.000Z');assert.deepEqual(mapped.cinemana.introSkipping,row.introSkipping);assert.deepEqual(mapped.cinemana.rejectedEpisodeIds,['201','999']);
  assert.equal(mapped.trailers[0].source,'abcDEF12345');
});
test('missing titles do not silently delete valid works and English locale falls back',()=>{
  assert.equal(preview(video(1,'1',{ar_title:'',en_title:''}),opts).name,'Cinemana #1');
  assert.equal(preview(video(2,'1',{en_title:''}),{...opts,language:'en'}).name,'عنوان 2');
});
test('all subtitle variants survive, including shared language/id, ASS and unknown languages',()=>{
  const row=video(10,'1',{translations:[
    {id:1,name:'عربية',type:'ordinary',extention:'srt',file:'https://subs.example/ar.srt'},
    {id:1,name:'عربية محسنة',type:'enhanced',extention:'ass',file:'https://subs.example/ar.ass'},
    {id:2,name:'English',type:'normal',extention:'srt',file:'https://subs.example/en.srt'},
    {id:3,name:'Turkish',type:'normal',extention:'srt',file:'https://subs.example/tr.srt'},
    {id:4,name:'Klingon',type:'normal',extention:'srt',file:'https://subs.example/unknown.srt'},
    {id:5,name:'عربية محسنة',type:'enhanced-2',extention:'ass',file:'https://subs.example/ar.ass'},
  ]});
  const result=subtitles(row,opts);assert.equal(result.length,6);assert.equal(new Set(result.map(s=>s.id)).size,6);
  assert.equal(result[0].lang,'ara');assert.equal(result[1].lang,'عربية محسنة');assert.equal(result[1].cinemana.enhanced,true);assert.equal(result[1].url,row.translations[1].file);
  assert.equal(result[2].lang,'eng');assert.equal(result[3].lang,'tur');assert.equal(result[4].lang,'Klingon');
  const iso=subtitles(row,{...opts,subtitleMode:'iso'});assert.equal(iso[1].lang,'ara');assert.equal(iso[1].label,'عربية محسنة');assert.equal(iso[4].lang,'und');
});
test('legacy Arabic translation fallback only when translations array has no entries',()=>{
  assert.equal(subtitles(video(1,'1',{arTranslationFilePath:'https://subs.example/ar.srt'}),opts).length,1);
  assert.equal(subtitles(video(1,'1',{translations:[{file:'bad'}],arTranslationFilePath:'https://subs.example/ar.srt'}),opts).length,0);
});
test('quality preference preserves all variants, picks next higher then highest lower',()=>{
  const rows=[480,1080,720].map(n=>({resolution:`${n}p`,container:'mp4',name:'Quality',videoUrl:`https://media.example/${n}.mp4`}));
  const detail=video(1,'1',{translations:[{name:'عربية محسنة',file:'https://subs.example/ar.ass'}]});
  for(const [wanted,chosen] of [['144',480],['540',720],['2160',1080]]) {
    const result=streams('1',rows,detail,{...opts,quality:wanted},{mediaHeaders:{}});assert.equal(result.length,3);assert.equal(result[0].cinemana.height,chosen);assert.equal(result[0].subtitles.length,1);
  }
});
test('stream headers are explicit and API credentials are not automatically copied',()=>{
  const row={videoUrl:'https://media.example/1.mp4',resolution:'720p',container:'mp4',transcoddedFileName:'file.mp4'};
  const plain=streams('1',[row],video(1),opts,{authorization:'secret'});assert.equal(plain[0].behaviorHints.proxyHeaders,undefined);assert.equal(plain[0].behaviorHints.notWebReady,false);
  const headed=streams('1',[row],video(1),opts,{mediaHeaders:{'User-Agent':'Player'}});assert.equal(headed[0].behaviorHints.notWebReady,true);assert.equal(headed[0].behaviorHints.proxyHeaders.request['User-Agent'],'Player');
});
test('binge groups stay stable across episodes and signed URL variants remain available',()=>{
  const a={videoUrl:'https://media.example/1.mp4?token=a',resolution:'720p',container:'mp4'};
  const b={...a,videoUrl:'https://media.example/1.mp4?token=b'};
  const x=streams('1',[a,b],video(1),opts,{}),y=streams('2',[a],video(2),opts,{});
  assert.equal(x.length,2);assert.equal(x[0].behaviorHints.bingeGroup,y[0].behaviorHints.bingeGroup);
});

test('enhanced Arabic survives Nuvio language aliases; native labels and stable IDs stay intact',()=>{
  const rows=video(1,'1',{translations:[{id:7,name:'Arabic Enhanced',type:'improved',extention:'srt',file:'https://subs.example/a.srt?token=first'}]});
  const first=subtitles(rows,opts)[0];assert.equal(first.lang,'عربية محسنة');assert.equal(first.label,'Arabic Enhanced');
  rows.translations[0].file='https://subs.example/a.srt?token=next';assert.equal(subtitles(rows,opts)[0].id,first.id);
  rows.translations[0].name='عَرَبِيَّة مُحَسَّنَة';assert.equal(subtitles(rows,opts)[0].cinemana.enhanced,true);
});
