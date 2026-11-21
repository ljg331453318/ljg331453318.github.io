import test from 'node:test';
import assert from 'node:assert/strict';
import {createPeerMotion,receivePeerMotion,samplePeerMotion,separateOverlappingPeer,placeNameplate} from '../cloud-dao/companion-motion.js';

test('observed movement interpolates continuously and stops at the last observed position',()=>{
 const state=createPeerMotion(0,8,0);
 receivePeerMotion(state,3,8,1000);
 assert.deepEqual(samplePeerMotion(state,1000),{x:0,z:8,moving:true,heading:Math.PI/2});
 assert.equal(samplePeerMotion(state,1500).x,1.5);
 const before=samplePeerMotion(state,1500);
 receivePeerMotion(state,4,8,1500);
 assert.equal(samplePeerMotion(state,1500).x,before.x);
 assert.equal(samplePeerMotion(state,2000).x,4);
 assert.equal(samplePeerMotion(state,99999).x,4);
 assert.equal(samplePeerMotion(state,99999).moving,false);
});
test('returning from a distant private retreat snaps rather than walking across the mountain',()=>{
 const state=createPeerMotion(70,4,0);
 receivePeerMotion(state,0,7,1000);
 assert.equal(samplePeerMotion(state,1000).x,0);
 assert.equal(samplePeerMotion(state,1000).z,7);
 assert.equal(samplePeerMotion(state,1500).moving,false);
});
test('same-arrival separation is stable, distinct, and does not alter unrelated positions',()=>{
 const a=separateOverlappingPeer('person-a',0,8,0,8);
 assert.deepEqual(a,separateOverlappingPeer('person-a',0,8,0,8));
 assert.notDeepEqual(a,separateOverlappingPeer('different-profile',0,8,0,8));
 assert.ok(Math.abs(Math.hypot(a.x,a.z-8)-1.4)<1e-9);
 assert.deepEqual(separateOverlappingPeer('person-a',5,8,0,8),{x:5,z:8});
});
test('nearby nameplates stack and stay inside a phone viewport',()=>{
 const occupied=[];
 const a=placeNameplate({x:6,y:300},142,occupied,390);
 const b=placeNameplate({x:22,y:300},142,occupied,390);
 assert.ok(a.x-71>=8);
 assert.ok(Math.abs(a.y-b.y)>=29);
 assert.ok(b.stem>a.stem);
 const right=placeNameplate({x:389,y:400},142,occupied,390);
 assert.ok(right.x+71<=382);
});
