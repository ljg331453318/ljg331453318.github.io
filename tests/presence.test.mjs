import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {handleDao} from '../counter-worker/dao.js';
function fixture(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../counter-worker/dao-schema.sql',import.meta.url),'utf8'));
 const db={prepare(sql){const statement={bind(...args){const query=sqlite.prepare(sql);return {first:async()=>query.get(...args)||null,all:async()=>({results:query.all(...args)}),run:async()=>query.run(...args)};}};return statement;},batch:async statements=>Promise.all(statements.map(s=>s.run()))};
 const person=()=>({id:randomUUID(),token:randomUUID(),session:randomUUID()});
 const call=async(user,route='presence',fields={})=>{
  const request=new Request('https://test.invalid/dao/'+route,{method:'POST',headers:{Origin:'http://127.0.0.1:4175','Content-Type':'application/json',Authorization:'Bearer '+user.token},body:JSON.stringify({id:user.id,session:user.session,name:'测试道友',x:0,z:7,area:'temple',...fields})});
  const response=await handleDao(request,{DB:db});return {status:response.status,data:await response.json()};
 };return {sqlite,person,call};
}
test('two profiles receive one another as visible peers, not as self',async()=>{
 const {sqlite,person,call}=fixture(),a=person(),b=person();await call(a);await call(b);
 const {status,data}=await call(a);assert.equal(status,200);assert.equal(data.courtyardCount,2);
 assert.equal(data.peers.filter(p=>p.self).length,1);assert.equal(data.peers.find(p=>p.session===b.session).self,0);sqlite.close();
});
test('sharing a progress pass keeps both window avatars and marks only the current session as self',async()=>{
 const {sqlite,person,call}=fixture(),a=person(),b={...a,session:randomUUID()};await call(a);await call(b);
 const {data}=await call(a);assert.equal(data.peers.length,2);assert.equal(data.courtyardCount,1);
 const other=data.peers.find(p=>p.session===b.session);assert.equal(other.self,0);assert.equal(other.sameProfile,1);
 await call(b,'leave');assert.equal((await call(a)).data.peers.length,1);sqlite.close();
});
test('private or expired sessions do not inflate public courtyard counts',async()=>{
 const {sqlite,person,call}=fixture(),a=person(),b=person(),c=person();await call(a);await call(b,'presence',{area:'retreat',x:70,z:4});await call(c);
 sqlite.prepare('UPDATE dao_presence SET updated=? WHERE session=?').run(Date.now()-31000,c.session);
 const {data}=await call(a);assert.equal(data.courtyardCount,1);assert.equal(data.peers.length,2);assert.ok(data.peers.some(p=>p.area==='retreat'));sqlite.close();
});
