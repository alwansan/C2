import test from 'node:test';
import assert from 'node:assert/strict';
import { Pager } from '../src/pager.js';
import { video,opts,fixture } from './fixtures.js';
test('native 20-item pages fill 100 outputs and later pages remain available',async t=>{
  const pager=new Pager(await fixture(t));const calls=[];
  const load=async page=>{calls.push(page);return page<13?Array.from({length:20},(_,i)=>video(page*20+i+1)):[];};
  assert.equal((await pager.page('k',0,'movie',opts,load)).length,100);
  assert.equal((await pager.page('k',100,'movie',opts,load))[0].id,'alwan.cinemana:101');
  assert.equal((await pager.page('k',200,'movie',opts,load)).length,60);assert.equal(calls.at(-1),13);
});
test('wrong kind, duplicates and short source pages do not end search',async t=>{
  const pager=new Pager(await fixture(t));
  const load=async page=>page===0?[video(1,'2'),video(2),video(2)]:page===1?[video(3),video(4,'2')]:page===2?[video(5)]:[];
  const rows=await pager.page('mixed',0,'movie',opts,load);assert.deepEqual(rows.map(r=>r.id),[2,3,5].map(n=>'alwan.cinemana:'+n));
});
test('empty locally filtered pages preserve source existence and keep scanning',async t=>{
  const pager=new Pager(await fixture(t));
  const load=async page=>page===0?{raw:[video(1)],rows:[]}:page===1?{raw:[video(2)],rows:[video(2)]}:{raw:[],rows:[]};
  assert.equal((await pager.page('filtered',0,'movie',opts,load))[0].id,'alwan.cinemana:2');
});
test('page budget fails visibly, retries resume instead of pretending results ended',async t=>{
  const pager=new Pager(await fixture(t,{pagesPerRequest:3}));
  const load=async page=>page<6?Array.from({length:20},(_,i)=>video(page*20+i+1)):[];
  await assert.rejects(pager.page('budget',0,'movie',opts,load),{code:'PAGE_BUDGET'});
  const first=await pager.page('budget',0,'movie',opts,load);assert.equal(first.length,100);
  const second=await pager.page('budget',100,'movie',opts,load);assert.equal(second.length,20);assert.equal(second[0].id,'alwan.cinemana:101');
});
test('repeated nonempty pages are an upstream error, including filtered repeats',async t=>{
  const pager=new Pager(await fixture(t));await assert.rejects(pager.page('repeat',0,'movie',opts,async()=>[video(1)]),{code:'REPEATED_PAGE'});
  await assert.rejects(pager.page('filter-repeat',0,'movie',opts,async()=>({raw:[video(1)],rows:[]})),{code:'REPEATED_PAGE'});
});
test('finite native curated feeds can contain more than 100 items',async t=>{
  const pager=new Pager(await fixture(t));const rows=Array.from({length:237},(_,i)=>video(i+1));const load=async()=>rows;
  assert.equal((await pager.page('finite',0,'movie',opts,load,{finite:true})).length,100);assert.equal((await pager.page('finite',200,'movie',opts,load,{finite:true})).length,37);
});
test('overlapping requests serialize and page offsets are output offsets',async t=>{
  const pager=new Pager(await fixture(t));const calls=[];const load=async page=>{calls.push(page);await Promise.resolve();return page<3?Array.from({length:100},(_,i)=>video(page*100+i+1)):[];};
  const [a,b]=await Promise.all([pager.page('parallel',0,'movie',opts,load),pager.page('parallel',100,'movie',opts,load)]);
  assert.equal(a[0].id,'alwan.cinemana:1');assert.equal(b[0].id,'alwan.cinemana:101');assert.deepEqual(calls,[0,1]);
  assert.equal((await pager.page('parallel',18,'movie',opts,load))[0].id,'alwan.cinemana:19');
});

test('non-paginating search clients receive every result, not a 100-item prefix',async t=>{
  const pager=new Pager(await fixture(t));const calls=[];
  const load=async page=>{calls.push(page);return page<13?Array.from({length:20},(_,i)=>video(page*20+i+1)):[];};
  const results=await pager.page('full',0,'movie',opts,load,{all:true});
  assert.equal(results.length,260);assert.equal(results.at(-1).id,'alwan.cinemana:260');assert.equal(calls.at(-1),13);
});
test('queued backward offsets restart safely after another request discards rows',async t=>{
  const pager=new Pager(await fixture(t));
  const load=async page=>page<8?Array.from({length:100},(_,i)=>video(page*100+i+1)):[];
  await pager.page('rewind',0,'movie',opts,load);
  const [later,earlier]=await Promise.all([pager.page('rewind',500,'movie',opts,load),pager.page('rewind',0,'movie',opts,load)]);
  assert.equal(later[0].id,'alwan.cinemana:501');assert.equal(earlier[0].id,'alwan.cinemana:1');
});
