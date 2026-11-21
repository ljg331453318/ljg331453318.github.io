import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {selectSubmissionDates,civilStamp,eligibleSlot} from '../cloud-dao/submission-engine.js';
import {featureVector,trainSubmissionModel} from '../cloud-dao/submission-learning.js';
import {handleSubmissions} from '../counter-worker/submissions.js';

const birth={birthDate:'1990-05-15',birthTime:'10:00'};
test('windows exclude elapsed time, retain distinct dates, and handle the calendar boundary',()=>{
  const result=selectSubmissionDates(birth,{date:'2026-11-21',time:'15:37'});
  assert.equal(result.ordered.length,60);
  assert.ok(result.preferred.length>0);
  assert.equal(new Set(result.preferred.map(row=>row.date)).size,result.preferred.length);
  for(const row of result.slots) {
    assert.ok(civilStamp(row.date,row.time)>=civilStamp('2026-11-21','15:37'));
    assert.ok(row.time<=row.endTime);
    assert.equal(featureVector(row,{discipline:'other',tier:'unknown',stage:'first'}).length,32);
  }
  assert.ok(result.preferred.every(eligibleSlot));
  assert.equal(selectSubmissionDates(birth,{date:'2099-12-31',time:'23:50'}).slots.length,1);
  assert.throws(()=>selectSubmissionDates({birthDate:'2099-12-31',birthTime:'23:59'},{date:'2026-11-21',time:'15:37'}));
});
const examples=(signal=true)=>Array.from({length:600},(_,i)=>{
  const features=Array(32).fill(0);features[0]=1;if(signal)features[1]=i%2?1:-1;
  return {author:'author-'+i,features,label:i%2,submittedAt:i*86400000,decidedAt:i*86400000+3600000};
});
test('learning stays off without balanced, independent, prospective evidence',()=>{
  assert.equal(trainSubmissionModel([]).ready,false);
  assert.equal(trainSubmissionModel(examples().map(row=>({...row,label:1}))).ready,false);
  assert.equal(trainSubmissionModel(examples().map(row=>({...row,author:'same-author'}))).ready,false);
  assert.equal(trainSubmissionModel(examples().map(row=>({...row,decidedAt:999999999999}))).ready,false);
  assert.equal(trainSubmissionModel(examples(false)).ready,false);
});
test('the experimental gate can pass a known signal without fitting validation labels',()=>{
  const model=trainSubmissionModel(examples());
  assert.equal(model.ready,true);
  assert.ok(model.weights.every(Number.isFinite));
  assert.equal(model.metrics.train,450);
  assert.equal(model.metrics.validation,150);
  assert.ok(model.metrics.modelBrier<model.metrics.baselineBrier*.95);
  const flipped=examples();flipped.slice(450).forEach(row=>row.label=1-row.label);
  assert.equal(trainSubmissionModel(flipped).ready,false);
});
function fixture() {
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../counter-worker/submission-schema.sql',import.meta.url),'utf8'));
  const db={prepare(sql){return {bind(...args){const query=sqlite.prepare(sql);return {
    first:async()=>query.get(...args)||null,all:async()=>({results:query.all(...args)}),run:async()=>query.run(...args)
  };},all:async()=>({results:sqlite.prepare(sql).all()})};}};
  const call=(route,body={},owner='author-1')=>handleSubmissions('/dao/submission-'+route,body,owner,db,(data,status=200)=>({data,status}));
  const record={id:randomUUID(),context:{natalDay:'庚',branches:['午','巳','辰','巳'],askDate:'2026-11-20',askTime:'08:00'},
    planned:'2026-11-23T09:00',status:'planned',discipline:'science',tier:'Q1',stage:'first',alias:'测试记录',consent:false};
  return {call,record,sqlite};
}
test('private plans survive reload, preserve the original forecast, and reject another owner',async()=>{
  const {call,record,sqlite}=fixture();
  assert.equal((await call('save',{record})).status,200);
  assert.equal((await call('save',{record:{...record,planned:'2026-12-01T11:00',context:{...record.context,natalDay:'乙'}}})).status,200);
  const own=(await call('list')).data.records;
  assert.equal(own.length,1);assert.equal(own[0].planned,record.planned);assert.equal(own[0].context.natalDay,'庚');
  assert.equal((await call('list',{},'author-2')).data.records.length,0);
  assert.equal((await call('save',{record},'author-2')).status,403);
  assert.equal((await call('delete',{recordId:record.id},'author-2')).status,200);
  assert.equal((await call('list')).data.records.length,1);
  sqlite.close();
});
test('outcomes need real times, use server-derived features, and only learn after consent',async()=>{
  const {call,record,sqlite}=fixture();
  const closed={...record,status:'accepted',actual:'2026-11-20T10:00',decision:'2026-11-20T11:00',features:[999]};
  assert.equal((await call('save',{record:{...closed,actual:'2026-11-19T10:00'}})).status,400);
  assert.equal((await call('save',{record:{...closed,decision:'2026-11-19T10:00'}})).status,400);
  assert.equal((await call('save',{record:closed})).status,200);
  assert.equal((await call('model')).data.model.cases,0);
  assert.equal((await call('save',{record:{...closed,consent:true}})).status,200);
  const model=(await call('model')).data.model;
  assert.equal(model.cases,1);assert.equal(model.ready,false);
  assert.equal(JSON.parse(sqlite.prepare('SELECT features FROM dao_submissions').get().features).length,32);
  assert.equal((await call('save',{record:{...closed,consent:false}})).status,200);
  assert.equal((await call('model')).data.model.cases,0);
  await call('delete',{recordId:record.id});
  assert.equal((await call('list')).data.records.length,0);
  sqlite.close();
});
