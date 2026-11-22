import test from 'node:test';
import assert from 'node:assert/strict';
import {HEXAGRAMS,CULTURE_LOTS,yearContext} from '../cloud-dao/culture-kit.js';
import {birthChart,plumClassic} from '../cloud-dao/yi-engine.js';
import {fortunes,createGameState} from '../cloud-dao/game-engine.js';
test('atlas covers all 64 structures and every single-line change has a destination',()=>{
 assert.deepEqual(HEXAGRAMS.map(h=>h.number),Array.from({length:64},(_,i)=>i+1));
 assert.equal(new Set(HEXAGRAMS.map(h=>h.lines.join(''))).size,64);
 for(const h of HEXAGRAMS){assert.ok(h.hint);for(let i=0;i<6;i++){const lines=[...h.lines];lines[i]=1-lines[i];assert.ok(HEXAGRAMS.some(x=>x.lines.every((v,j)=>v===lines[j])));}}
 const p=plumClassic();for(const h of [p.base,p.mutual,p.change])assert.equal(HEXAGRAMS.find(x=>x.number===h.number).name,h.name);
});
test('new themed lots preserve old record IDs across a progress reload',()=>{
 const ids=[...fortunes,...CULTURE_LOTS].map(l=>l.id);assert.equal(new Set(ids).size,ids.length);
 const records=[{lotId:fortunes[0].id,note:'old'},{lotId:CULTURE_LOTS[0].id,topic:'study',note:'new'}];
 assert.deepEqual(createGameState(JSON.parse(JSON.stringify(createGameState({fortunes:records})))).fortunes,records);
});
test('a transition year retains both exact luck intervals rather than switching at New Year',()=>{
 const c=birthChart({date:'1990-05-15',time:'10:00',gender:'1'}),startYear=Number(c.luck.start.slice(0,4));
 const first=yearContext(c,startYear),transition=yearContext(c,startYear+10);
 assert.equal(first.intervals.length,1);assert.equal(transition.intervals.length,2);
 assert.equal(transition.intervals[0].until,transition.intervals[1].from);
 assert.equal(transition.intervals[0].pillar,c.luck.cycles[0].pillar);
 assert.equal(transition.intervals[1].pillar,c.luck.cycles[1].pillar);
 assert.equal(yearContext({...c,luck:null},2026).intervals.length,0);
});
