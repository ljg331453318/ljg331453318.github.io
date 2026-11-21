// Interpolate observed positions only; never invent a visitor's next movement.
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function createPeerMotion(x,z,now) {
  return {fromX:x,fromZ:z,toX:x,toZ:z,at:now,lastAt:now,duration:1000,heading:0};
}
export function samplePeerMotion(state,now) {
  const progress=clamp((now-state.at)/state.duration,0,1);
  const dx=state.toX-state.fromX,dz=state.toZ-state.fromZ;
  return {x:state.fromX+dx*progress,z:state.fromZ+dz*progress,
    moving:progress<1 && Math.hypot(dx,dz)>.035,heading:state.heading};
}
export function receivePeerMotion(state,x,z,now) {
  const current=samplePeerMotion(state,now);
  const dx=x-current.x,dz=z-current.z;
  state.duration=clamp(now-state.lastAt,350,1800);
  state.at=state.lastAt=now;
  state.fromX=current.x;state.fromZ=current.z;state.toX=x;state.toZ=z;
  if(Math.hypot(dx,dz)>18) {state.fromX=x;state.fromZ=z;}
  else if(Math.hypot(dx,dz)>.035) state.heading=Math.atan2(dx,dz);
}
export function separateOverlappingPeer(session,x,z,selfX,selfZ) {
  if(Math.hypot(x-selfX,z-selfZ)>=.85) return {x,z};
  let hash=0;for(const char of session) hash=(hash*31+char.charCodeAt(0))>>>0;
  const angle=hash/4294967296*Math.PI*2;
  return {x:x+Math.cos(angle)*1.4,z:z+Math.sin(angle)*1.4};
}
export function placeNameplate(anchor,width,occupied,viewportWidth) {
  const x=clamp(anchor.x,width/2+8,Math.max(width/2+8,viewportWidth-width/2-8));
  let y=anchor.y;
  for(let i=0;i<8;i++) {
    const collision=occupied.find(other=>Math.abs(x-other.x)<(width+other.width)/2+5 && Math.abs(y-other.y)<29);
    if(!collision)break;
    y=collision.y-30;
  }
  const result={x,y,width,stem:Math.max(7,anchor.y-y+7)};
  occupied.push(result);return result;
}
