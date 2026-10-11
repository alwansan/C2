import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readConfig, options } from '../src/config.js';
export const opts=options();
export const video=(id,kind='1',extra={})=>({nb:String(id),kind,ar_title:`عنوان ${id}`,en_title:`Title ${id}`,year:'2020',stars:'7.5',duration:'3600',imgObjUrl:`https://media.example/${id}.jpg`,...extra});
export async function fixture(t,extra={}) {
  const dataDir=await mkdtemp(join(tmpdir(),'cinemana-addon-test-'));t.after(()=>rm(dataDir,{recursive:true,force:true}));
  return {...readConfig({DATA_DIR:dataDir,REQUEST_TIMEOUT_MS:'500'}),...extra};
}
export class FakeApi {
  constructor() {this.calls=[];this.rows=[];this.episodeRows=[];}
  async categories() {return [{nb:'4',ar_title:'أنمي',en_title:'Anime',langArray:[{catNb:'4',langNb:'12',lang_ar_title:'اليابانية',lang_en_title:'Japanese'}]},{nb:'7',ar_title:'أفلام وثائقية',en_title:'Documentaries',langArray:[]}];}
  async home() {return {groups:[{groupsID:'50',title:'الرائج',hasPagination:1,content:[video(1)]},{groupsID:'51',title:'مختارات',hasPagination:0,content:[video(2,'2')]}]};}
  async collections() {return [{id:'99',display_name:'مجموعات خاصة',content:[]}];}
  async collection(id) {this.calls.push({resource:'collection',id});return [{groupsID:'60',title:'مجموعة داخلية',content:[video(3)]}];}
  async group(id,level,page) {this.calls.push({resource:'group',id,level,page});return page===0?[video(3),video(4,'2')]:[];}
  async catalog(req) {this.calls.push({resource:'catalog',...req});return req.page===0?this.rows:[];}
  async search(req) {this.calls.push({resource:'search',...req});return req.page===0?this.rows:[];}
  async details(id) {this.calls.push({resource:'details',id});return video(id,id==='200'?'2':'1');}
  async episodes(id) {this.calls.push({resource:'episodes',id});return this.episodeRows;}
  async transcodes(id) {this.calls.push({resource:'transcodes',id});return [{videoUrl:`https://media.example/${id}.mp4`,resolution:'720p',container:'mp4',name:'HD'}];}
  async banner() {return [video(1),video(2,'2')];}
  async newly() {return [video(3),video(4,'2')];}
}
