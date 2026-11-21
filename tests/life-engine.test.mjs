import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DEFAULT_LIFE,LIFE_VERSION,simulateLife,normalizeLife,assumedMonthlyGain,observationQuadrant,sanitizeLifeRecord} from '../cloud-dao/life-engine.js';
test('scenario replay is deterministic with valid ordered bands and complete branch mass',()=>{
 const a=simulateLife(DEFAULT_LIFE),b=simulateLife(DEFAULT_LIFE);
 assert.deepEqual(a.series,b.series);assert.deepEqual(a.branches,b.branches);
 assert.equal(a.series.length,37);assert.equal(a.branches.reduce((sum,b)=>sum+b.count,0),a.count);
 assert.ok(Math.abs(a.branches.reduce((sum,b)=>sum+b.share,0)-1)<1e-12);
 for(const p of a.series)assert.ok(0<=p.low&&p.low<=p.mid&&p.mid<=p.high&&p.high<=100);
});
test('actions change conditional paths, while overload can reverse the benefit of extra hours',()=>{
 const slow=simulateLife({...DEFAULT_LIFE,hours:5,budget:30}),focused=simulateLife({...DEFAULT_LIFE,hours:15,budget:30});
 assert.ok(focused.series.at(-1).mid>slow.series.at(-1).mid);
 const burdened={...DEFAULT_LIFE,hours:30,budget:6,load:85};
 assert.ok(assumedMonthlyGain(burdened,'sprint')<assumedMonthlyGain(burdened,'focus'));
 assert.ok(assumedMonthlyGain(burdened,'focus')<assumedMonthlyGain(burdened,'maintain'));
});
test('observations update the current state and the four feedback quadrants remain distinct',()=>{
 const original=simulateLife(DEFAULT_LIFE);
 const updated=simulateLife(DEFAULT_LIFE,[{month:3,hours:12,progress:50}]);
 assert.ok(updated.state.value>original.series[3].mid);
 assert.equal(updated.state.month,3);
 const old={hours:8,progress:20};
 assert.deepEqual([{hours:10,progress:25},{hours:10,progress:15},{hours:6,progress:25},{hours:6,progress:15}].map(row=>observationQuadrant(old,row).code),[1,2,3,4]);
 assert.throws(()=>simulateLife(DEFAULT_LIFE,[{month:99,hours:12,progress:50}]));
});
test('backups exclude raw birth data, retain the original forecast, and reject invalid curves',()=>{
 const profile=normalizeLife({...DEFAULT_LIFE,birthDate:'1980-01-01',token:'private'}),forecast=simulateLife(profile);
 const raw={version:LIFE_VERSION,id:randomUUID(),date:'2026-11-21',profile,snapshot:{series:forecast.series},observations:[{date:'2026-12-21',hours:10,progress:40,quadrant:{title:'<img onerror=bad()>'}}]};
 const stored=sanitizeLifeRecord(raw);
 assert.ok(!JSON.stringify(stored).includes('1980-01-01'));
 assert.ok(!JSON.stringify(stored).includes('private'));
 assert.ok(!JSON.stringify(stored).includes('onerror'));
 assert.equal(stored.observations[0].month,1);
 const snapshot=JSON.stringify(stored.snapshot);simulateLife(profile,stored.observations);assert.equal(JSON.stringify(stored.snapshot),snapshot);
 assert.throws(()=>sanitizeLifeRecord({...raw,snapshot:{series:[{month:0,low:20,mid:10,high:30}]}}));
 assert.throws(()=>normalizeLife({...DEFAULT_LIFE,budget:0}));
});
