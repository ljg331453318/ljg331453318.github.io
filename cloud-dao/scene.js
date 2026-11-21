import * as THREE from './vendor/three.module.min.js';
import {createPeerMotion,receivePeerMotion,samplePeerMotion,separateOverlappingPeer,placeNameplate} from './companion-motion.js?v=20261121-companions';

const TAU=Math.PI*2;
let scene,camera,renderer,clock,avatar,avatarBody,bell,light,hemisphere,sky,water,smoke,petals,focusRing;
let entered=false,night=false,sitting=false,yaw=.32,pitch=.58,distance=43,desiredDistance=43,drag=null,moved=false;
let target=new THREE.Vector3(0,1.1,0), desiredTarget=new THREE.Vector3(0,1.1,0), destination=new THREE.Vector3(0,.18,8);
let bellAt=-100,incenseUntil=0,last=0,walkPulse=0;
let mobileLayout=innerWidth<700;
const touches=new Map();let pinchDistance=0;
const objects=[],labels=[],lights=[],lanternMats=[],trees=[],fishes=[],keys=new Set();
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-.18);
const positions={meditate:[-5.4,.18,3],incense:[0,.18,-2.2],bell:[-10.2,.18,6.3],library:[-9.8,.18,-4.4],music:[9.6,.18,-4.3],journal:[7,.18,8.8],hall:[0,.18,-5],wander:[0,.18,7.3]};
Object.assign(positions,{study:[-5.8,.18,-3.4],fortune:[0,.18,-3],alchemy:[-10,.18,.5],gate:[-8.5,.18,9.7],leaf:[-11.7,.18,-1.3],dew:[12.1,.18,7.2],moss:[-10.8,.18,11.4],retreat:[70,.18,4.1]});
let area='temple',fortuneCup,fortuneShake=-100,fortuneDrawn=false,furnaceGlow,furnaceFlames,gateVeil,gateWheel,gateOpened=false,gateTurn=0;
const resourcePlants={},retreatPots=[],retreatDecor={};let retreatExpansion,retreatCurtain,roomExpanded=false;
const hooks={action:()=>{},location:()=>{},ready:()=>{},move:()=>{}};
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.86,...extra});
const palette={stone:mat('#acb1a0'),stoneLight:mat('#c7c9b3'),stoneDark:mat('#788d7b'),wood:mat('#624a39'),red:mat('#85563e'),roof:mat('#355d53'),roofEdge:mat('#23483f'),brass:mat('#b29756',{metalness:.35,roughness:.5}),ivory:mat('#d0cfb4'),bark:mat('#675e46'),leaf:mat('#6c865b'),darkLeaf:mat('#3f6550'),moss:mat('#819567'),robe:mat('#d4d0b0'),hair:mat('#273b32'),skin:mat('#cfad86')};
function mesh(geometry,material,x=0,y=0,z=0,parent=scene){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(w,h,d,material,x=0,y=0,z=0,parent=scene){return mesh(new THREE.BoxGeometry(w,h,d),material,x,y,z,parent);}
function sphere(r,material,x,y,z,parent=scene,sx=1,sy=1,sz=1){const m=mesh(new THREE.SphereGeometry(r,10,7),material,x,y,z,parent);m.scale.set(sx,sy,sz);return m;}
function cylinder(top,bottom,h,material,x,y,z,parent=scene,n=12){return mesh(new THREE.CylinderGeometry(top,bottom,h,n),material,x,y,z,parent);}
function branch(a,b,r,material,parent){const dir=new THREE.Vector3().subVectors(b,a);const c=cylinder(r*.65,r,dir.length(),material,0,0,0,parent,7);c.position.copy(a).add(b).multiplyScalar(.5);c.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());return c;}
function line(points,color,parent=scene,opacity=1){const m=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));parent.add(m);return m;}
function markObject(group,action){group.traverse(m=>{if(m.isMesh){m.userData.action=action;objects.push(m);}});}
let randomSeed=34561;
function rand(){randomSeed=(randomSeed*1664525+1013904223)>>>0;return randomSeed/4294967296;}
function softTexture(){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');const g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,.7)');g.addColorStop(.3,'rgba(255,255,255,.3)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);}
function contactShadow(x,z,w,d,opacity=.22){const p=mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({color:'#173d32',map:softTexture(),transparent:true,opacity,depthWrite:false}),x,.035,z);p.rotation.x=-Math.PI/2;p.castShadow=false;p.receiveShadow=false;}
function makeText(text,w=256,h=100,color='#d9c796',bg='transparent'){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');if(bg!=='transparent'){ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);}ctx.fillStyle=color;ctx.font=`${Math.floor(h*.64)}px serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,w/2,h/2);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return texture;}
function plaque(text,w,x,y,z,parent){box(w,.55,.13,palette.roofEdge,x,y,z,parent);const p=mesh(new THREE.PlaneGeometry(w*.87,.43),new THREE.MeshBasicMaterial({map:makeText(text),transparent:true}),x,y,z+.08,parent);p.castShadow=false;}
function roof(width,depth,base,height,parent,roofColor=palette.roof){const nx=24,nz=16,verts=[],indices=[];
 const getY=(x,z)=>{const u=Math.abs(x)/(width/2),v=Math.abs(z)/(depth/2);return base+height*Math.pow(1-v,1.45)*(1-.22*Math.pow(u,6))+.46*Math.pow(u,8)*Math.pow(v,4)+.15*Math.pow(v,10);};
 for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++){const x=(ix/nx-.5)*width,z=(iz/nz-.5)*depth;verts.push(x,getY(x,z),z);}
 for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){const a=iz*(nx+1)+ix,b=a+nx+1;indices.push(a,b,a+1,b,b+1,a+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();const r=mesh(g,roofColor,0,0,0,parent);r.material.side=THREE.DoubleSide;
 for(let ix=0;ix<=nx;ix++){const x=(ix/nx-.5)*width;const points=[];for(let iz=0;iz<=nz;iz++){const z=(iz/nz-.5)*depth;points.push(new THREE.Vector3(x,getY(x,z)+.025,z));}line(points,'#668174',parent,.47);}
 for(let iz=0;iz<=nz;iz+=2){const z=(iz/nz-.5)*depth;const points=[];for(let ix=0;ix<=nx;ix++){const x=(ix/nx-.5)*width;points.push(new THREE.Vector3(x,getY(x,z)+.03,z));}line(points,'#294d42',parent,.5);}
 for(const z of [-depth/2,depth/2]){const pts=[];for(let ix=0;ix<=nx;ix++){const x=(ix/nx-.5)*width;pts.push(new THREE.Vector3(x,getY(x,z)-.04,z));}const curve=new THREE.CatmullRomCurve3(pts);mesh(new THREE.TubeGeometry(curve,24,.075,5,false),palette.roofEdge,0,0,0,parent);}
 branch(new THREE.Vector3(-width*.44,base+height,0),new THREE.Vector3(width*.44,base+height,0),.09,palette.roofEdge,parent);
 for(const side of [-1,1]){const ridge=mesh(new THREE.TorusGeometry(.28,.055,5,12,Math.PI*.9),palette.brass,side*width*.44,base+height+.15,0,parent);ridge.rotation.y=Math.PI/2;}
 return r;
}
function lantern(x,y,z,parent=scene){const group=new THREE.Group();group.position.set(x,y,z);parent.add(group);const paper=mat('#e4b16c',{emissive:'#dd8b34',emissiveIntensity:.22});lanternMats.push(paper);cylinder(.19,.19,.5,paper,0,0,0,group,10);cylinder(.24,.24,.065,palette.wood,0,.27,0,group);cylinder(.24,.24,.065,palette.wood,0,-.27,0,group);branch(new THREE.Vector3(0,.3,0),new THREE.Vector3(0,.57,0),.014,palette.wood,group);line([new THREE.Vector3(0,-.3,0),new THREE.Vector3(0,-.57,0)],'#cfa569',group);for(let i=0;i<8;i++){const a=i/8*TAU;line([new THREE.Vector3(Math.cos(a)*.195,-.23,Math.sin(a)*.195),new THREE.Vector3(Math.cos(a)*.195,.23,Math.sin(a)*.195)],'#a5804a',group,.55);}return group;}
function stoneLantern(x,z){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);box(.7,.16,.7,palette.stoneDark,0,.12,0,g);cylinder(.14,.2,.8,palette.stone,0,.6,0,g);box(.48,.1,.48,palette.stoneLight,0,1.06,0,g);const glow=mat('#efd7a0',{emissive:'#efac49',emissiveIntensity:.35});lanternMats.push(glow);box(.28,.32,.28,glow,0,1.25,0,g);for(const a of [-1,1])for(const b of [-1,1])box(.07,.4,.07,palette.stoneDark,a*.22,1.26,b*.22,g);cylinder(.48,.12,.3,palette.stoneDark,0,1.6,0,g,4).rotation.y=Math.PI/4;}
function temple(){const g=new THREE.Group();g.position.set(0,0,-6);scene.add(g);contactShadow(0,-6,17,12,.4);box(12,.5,7.8,palette.stoneDark,0,.26,0,g);box(11.6,.23,7.4,palette.stoneLight,0,.62,0,g);for(let i=0;i<3;i++)box(5,.18,1.7-i*.43,palette.stoneLight,0,.18+i*.17,4.2-i*.22,g);
 box(10,.14,6,palette.wood,0,.8,0,g);box(10.1,2.9,.2,palette.ivory,0,2.2,-2.7,g);box(.2,2.9,5.4,palette.ivory,-4.9,2.2,0,g);box(.2,2.9,5.4,palette.ivory,4.9,2.2,0,g);
 for(const x of [-4.6,-2.3,2.3,4.6])for(const z of [-2.55,2.55]){cylinder(.16,.2,3.2,palette.red,x,2.35,z,g);cylinder(.25,.3,.2,palette.stone,x,.88,z,g);box(.75,.18,.6,palette.red,x,3.85,z,g);box(.5,.3,.5,palette.wood,x,3.65,z,g);}
 for(const z of [-2.55,2.55]){box(10.2,.2,.24,palette.red,0,3.55,z,g);box(10.5,.18,.4,palette.wood,0,3.9,z,g);}
 for(const x of [-3.4,3.4]){box(1.8,2.6,.12,palette.wood,x,2.12,2.5,g);box(1.5,2.25,.13,palette.roofEdge,x,2.16,2.58,g);for(let j=0;j<5;j++)box(.045,2.15,.07,palette.red,x-.64+j*.32,2.2,2.68,g);for(let j=0;j<6;j++)box(1.5,.04,.07,palette.red,x,1.22+j*.35,2.69,g);}
 roof(12.8,8.8,3.98,1.88,g);roof(8.7,6.7,5.2,1.68,g);plaque('云 栖 观',2.5,0,3.63,2.72,g);
 const symbol=mesh(new THREE.PlaneGeometry(1.45,1.45),new THREE.MeshBasicMaterial({map:makeText('☯',200,200,'#d9bd76','#37554a')}),0,2.42,-2.56,g);symbol.castShadow=false;
 box(2.4,.16,.85,palette.wood,0,1.3,-1.65,g);for(const x of [-.9,.9])box(.12,.5,.6,palette.wood,x,1,-1.65,g);for(const x of [-.7,.7]){cylinder(.1,.15,.27,palette.brass,x,1.5,-1.65,g);sphere(.085,mat('#f4d5a4',{emissive:'#e6a150',emissiveIntensity:.4}),x,1.7,-1.65,g);}
 lantern(-1.65,3.18,2.8,g);lantern(1.65,3.18,2.8,g);
 for(const x of [-3.5,3.5]){const p=new THREE.PointLight('#ffd696',0,7,2);p.position.set(x,2.6,-3.6);scene.add(p);lights.push(p);}
 markObject(g,'hall');
 const censer=new THREE.Group();censer.position.set(0,.18,-2.05);scene.add(censer);cylinder(.47,.32,.55,palette.brass,0,.61,0,censer);cylinder(.53,.53,.08,palette.brass,0,.91,0,censer);for(let i=0;i<3;i++){const a=i/3*TAU;branch(new THREE.Vector3(Math.sin(a)*.25,.1,Math.cos(a)*.25),new THREE.Vector3(Math.sin(a)*.24,.45,Math.cos(a)*.24),.07,palette.brass,censer);}for(const side of [-1,1]){const h=mesh(new THREE.TorusGeometry(.18,.04,6,14),palette.brass,side*.5,.7,0,censer);h.rotation.y=Math.PI/2;}
 const sticks=new THREE.Group();sticks.name='incense-sticks';censer.add(sticks);markObject(censer,'incense');
 const smg=new THREE.BufferGeometry();const sp=new Float32Array(90*3);smg.setAttribute('position',new THREE.BufferAttribute(sp,3));smoke=new THREE.Points(smg,new THREE.PointsMaterial({color:'#e1dfc4',map:softTexture(),size:.55,transparent:true,opacity:.16,depthWrite:false,sizeAttenuation:true}));smoke.visible=false;scene.add(smoke);
}
function pavilion(x,z,kind){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);const w=kind==='library'?5.6:5.2;contactShadow(x,z,8,7,.28);box(w+.7,.3,5.2,palette.stoneDark,0,.18,0,g);box(w+.45,.15,4.9,palette.stoneLight,0,.4,0,g);box(w,.12,4.4,palette.wood,0,.54,0,g);for(const a of [-1,1])for(const b of [-1,1]){cylinder(.13,.17,2.7,palette.red,a*(w/2-.2),1.9,b*2,g);box(.5,.15,.5,palette.wood,a*(w/2-.2),3.15,b*2,g);}box(w,.2,.2,palette.red,0,2.98,2,g);box(w,.2,.2,palette.red,0,2.98,-2,g);roof(w+1.7,6.3,3.2,1.4,g);plaque(kind==='library'?'藏 经 阁':'听 松 亭',1.8,0,2.84,2.16,g);
 if(kind==='library'){box(w,2.3,.17,palette.ivory,0,1.8,-2,g);for(const side of [-1,1]){const shelf=new THREE.Group();shelf.position.set(side*1.5,0,-1.4);g.add(shelf);box(1.15,1.8,.5,palette.wood,0,1.47,0,shelf);for(let j=0;j<3;j++){box(1.2,.075,.56,palette.red,0,.78+j*.55,.04,shelf);for(let i=0;i<6;i++){const material=mat(['#8c9274','#b7af85','#56715c','#a28b64'][Math.floor(rand()*4)]);box(.1,.35+rand()*.1,.32,material,-.48+i*.18,1.01+j*.55,.1,shelf);}}}box(1.6,.1,.8,palette.wood,0,1.1,.5,g);for(const a of [-.6,.6])box(.1,.5,.6,palette.wood,a,.8,.5,g);const scroll=box(.85,.015,.45,palette.ivory,0,1.16,.5,g);scroll.rotation.y=.1;
 }else{box(2.6,.15,.65,palette.wood,0,1.05,0,g);for(const a of [-1,1]){box(.13,.56,.5,palette.red,a*1,.73,0,g);cylinder(.18,.18,2.4,palette.wood,0,1.17,0,g).rotation.z=Math.PI/2;}for(let i=0;i<7;i++)line([new THREE.Vector3(-1.1,1.35,-.18+i*.055),new THREE.Vector3(1.1,1.35,-.18+i*.055)],'#c9b87f',g);cylinder(.5,.53,.12,palette.moss,0,.68,1.2,g,20);}
 lantern(-w*.34,2.45,2,g);lantern(w*.34,2.45,2,g);markObject(g,kind);}
function pine(x,z,size=1,lean=.15){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(size);scene.add(g);const trunkTop=new THREE.Vector3(lean,4.4,0);branch(new THREE.Vector3(0,0,0),trunkTop,.16,palette.bark,g);for(let i=0;i<5;i++){const y=1.8+i*.55,angle=i*2.45;const a=new THREE.Vector3(lean*y/4.4,y,0),b=new THREE.Vector3(Math.cos(angle)*(1.65-i*.2),y+.3,Math.sin(angle)*(1.45-i*.16));branch(a,b,.08,palette.bark,g);for(let j=0;j<3;j++)sphere(.85,palette.darkLeaf,b.x+(rand()-.5)*.8,b.y+(rand()-.5)*.15,b.z+(rand()-.5)*.6,g,1.3,.38,.9);}sphere(.95,palette.darkLeaf,lean,4.55,0,g,1.1,.4,.9);contactShadow(x,z,5*size,5*size,.24);trees.push(g);return g;}
function wishingTree(){const g=new THREE.Group();g.position.set(7.2,0,9.5);scene.add(g);branch(new THREE.Vector3(),new THREE.Vector3(-.4,3,0),.24,palette.bark,g);const foliage=[[-1.5,4,0],[1,4.3,.4],[-.5,5,-.6],[.2,4.8,1.2],[2,3.7,.3],[-2.4,3.5,-.7]];for(const [x,y,z] of foliage){branch(new THREE.Vector3(-.3,2.4,0),new THREE.Vector3(x,y,z),.12,palette.bark,g);for(let j=0;j<4;j++)sphere(.9,mat(j%2?'#82976a':'#9aaa76'),x+(rand()-.5)*1.3,y+(rand()-.5)*.6,z+(rand()-.5)*1.2,g,1.3,.65,1.1);}
 for(let i=0;i<13;i++){const a=i*.7,r=1+rand();const x=Math.cos(a)*r,y=2.5+rand()*1.2,z=Math.sin(a)*r;line([new THREE.Vector3(x,y+.8,z),new THREE.Vector3(x,y,z)],'#b79b70',g);const tag=box(.16,.44,.025,mat(i%3===0?'#b76d49':'#cfc29a'),x,y-.22,z,g);tag.rotation.z=(rand()-.5)*.25;tag.rotation.y=a;}
 markObject(g,'journal');contactShadow(7.2,9.5,9,7,.25);}
function meditation(){const g=new THREE.Group();g.position.set(-5.3,0,3);scene.add(g);cylinder(3,3,.25,palette.stoneDark,0,.15,0,g,40);cylinder(2.85,2.85,.1,palette.stoneLight,0,.33,0,g,40);for(let i=0;i<6;i++){const a=i/6*TAU;const c=cylinder(.49,.5,.12,mat('#9ba982'),Math.cos(a)*1.9,.46,Math.sin(a)*1.9,g,24);const ridge=mesh(new THREE.TorusGeometry(.44,.015,4,24),palette.ivory,c.position.x,.53,c.position.z,g);ridge.rotation.x=Math.PI/2;}cylinder(.65,.68,.16,palette.moss,0,.5,0,g,28);markObject(g,'meditate');contactShadow(-5.3,3,8,8,.2);focusRing=mesh(new THREE.RingGeometry(.85,.88,64),new THREE.MeshBasicMaterial({color:'#d2d09a',transparent:true,opacity:.7,side:THREE.DoubleSide}),-5.3,.62,3);focusRing.rotation.x=-Math.PI/2;focusRing.visible=false;}
function bellTower(){const g=new THREE.Group();g.position.set(-11.2,0,6.5);scene.add(g);box(2.7,.2,2.7,palette.stoneDark,0,.15,0,g);for(const x of [-.9,.9])for(const z of [-.9,.9])cylinder(.09,.12,2.6,palette.wood,x,1.5,z,g);roof(3.5,3.5,2.9,1,g);bell=new THREE.Group();bell.position.y=2.28;g.add(bell);const shape=[new THREE.Vector2(.03,0),new THREE.Vector2(.16,-.05),new THREE.Vector2(.24,-.25),new THREE.Vector2(.25,-.75),new THREE.Vector2(.4,-.98),new THREE.Vector2(.37,-1.06),new THREE.Vector2(.26,-1.06),new THREE.Vector2(.2,-.72),new THREE.Vector2(.19,-.25),new THREE.Vector2(.03,-.12)];mesh(new THREE.LatheGeometry(shape,20),palette.brass,0,0,0,bell);cylinder(.055,.055,.22,palette.brass,0,-1.03,0,bell);line([new THREE.Vector3(0,2.3,0),new THREE.Vector3(0,2.83,0)],'#5f5942',g);markObject(g,'bell');}
function pond(){const shape=new THREE.Shape();shape.absellipse(0,0,4,3,0,TAU,false,0);const material=new THREE.ShaderMaterial({transparent:true,uniforms:{time:{value:0},night:{value:0}},vertexShader:'varying vec2 vUv; varying vec3 vPos; void main(){vUv=uv;vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv;varying vec3 vPos;uniform float time;uniform float night;void main(){float w=sin(vPos.x*4.0+time*.6+sin(vPos.y*3.0))*sin(vPos.y*6.0-time*.35);float l=pow(max(0.0,sin(vPos.x*3.0+vPos.y*5.0+time*.3)),22.0)*.1;vec3 col=mix(vec3(.20,.43,.39),vec3(.37,.57,.50),w*.2+.45)+l;col=mix(col,col*vec3(.35,.50,.65),night*.75);gl_FragColor=vec4(col,.94);}'});water=mesh(new THREE.ShapeGeometry(shape,48),material,9.5,.12,4);water.rotation.x=-Math.PI/2;water.castShadow=false;water.receiveShadow=false;
 for(let i=0;i<34;i++){const a=i/34*TAU;const x=9.5+Math.cos(a)*4.15,z=4+Math.sin(a)*3.15;rock(x,z,.35+rand()*.3);}
 for(let i=0;i<5;i++){const g=new THREE.Group();scene.add(g);sphere(.17,mat(i%2?'#dbad69':'#b76538'),0,0,0,g,1.7,.35,.75);const tail=mesh(new THREE.ConeGeometry(.13,.23,3),palette.ivory,-.36,0,0,g);tail.rotation.z=Math.PI/2;g.userData.phase=i/5*TAU;fishes.push(g);}
 for(let i=0;i<4;i++){const x=10.5+rand()*1.6,z=3.7+rand()*2;const lily=mesh(new THREE.CircleGeometry(.25,12),mat('#65916c',{side:THREE.DoubleSide}),x,.14,z);lily.rotation.x=-Math.PI/2;sphere(.1,mat('#dcbeaa'),x+.03,.2,z);}
 // Short arched timber bridge at the pond edge.
 const bridge=new THREE.Group();bridge.position.set(9.4,.2,1.1);bridge.rotation.y=.1;scene.add(bridge);for(let i=0;i<17;i++){const x=(i-8)*.24,y=.2+Math.sin(i/16*Math.PI)*.32;box(.2,.1,1.25,palette.wood,x,y,0,bridge);}for(const z of [-.7,.7]){const pts=[];for(let i=0;i<9;i++){const x=(i-4)*.48,y=.65+Math.sin(i/8*Math.PI)*.32;pts.push(new THREE.Vector3(x,y,z));if(i%2===0)box(.065,.6,.065,palette.red,x,y-.25,z,bridge);}mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),20,.045,5,false),palette.red,0,0,0,bridge);}}
function rock(x,z,size=1){const g=new THREE.DodecahedronGeometry(size,0);const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);p.setXYZ(i,x*(1+Math.sin(x*3+z)*.13),y*.65,z*(1+Math.cos(x+z*3)*.13));}g.computeVertexNormals();const r=mesh(g,rand()>.5?palette.stoneDark:palette.stone,x,size*.22,z);r.rotation.y=rand()*TAU;return r;}
function ground(){const land=cylinder(24,26,2.5,mat('#647f65'),0,-1.4,0,scene,64);land.receiveShadow=true;const lawn=mesh(new THREE.CircleGeometry(25,64),mat('#7e9471'),0,-.03,0);lawn.rotation.x=-Math.PI/2;box(29,.12,26,palette.stoneDark,0,0,.5);box(28.5,.1,25.5,mat('#91a187'),0,.07,.5);
 const pathMat=mat('#b6baa7');const tiles=new THREE.InstancedMesh(new THREE.BoxGeometry(.91,.09,.91),pathMat,550);let count=0;const dummy=new THREE.Object3D();for(let x=-13;x<=13;x++)for(let z=-11;z<=12;z++){if(Math.abs(x)<2||z>=0&&z<3||z>=-2&&z<0||Math.abs(x+9)<3&&z<-1||Math.abs(x-9)<3&&z<-1){dummy.position.set(x,.13,z);dummy.scale.set(1+(rand()-.5)*.025,1,1);dummy.updateMatrix();tiles.setMatrixAt(count++,dummy.matrix);if(count>=550)break;}}tiles.count=count;tiles.receiveShadow=true;tiles.castShadow=false;scene.add(tiles);
 // The outer stone balustrade leaves an opening at the foreground steps.
 for(const side of [-1,1]){for(let i=0;i<14;i++){const z=-11+i*1.75;box(.17,.85,.17,palette.stoneLight,side*14,.55,z);box(.27,.13,.27,palette.stoneLight,side*14,1,z);}box(.1,.13,23,palette.stone,side*14,.7,.25);box(.13,.12,23,palette.stone,side*14,1,.25);}
 for(let x=-13;x<=13;x+=1.75){if(Math.abs(x)<3)continue;box(.17,.85,.17,palette.stoneLight,x,.55,12.5);box(.27,.13,.27,palette.stoneLight,x,1,12.5);}for(const x of [-8.3,8.3]){box(10.4,.12,.13,palette.stone,x,.7,12.5);box(10.4,.12,.13,palette.stone,x,1,12.5);}
 for(let i=0;i<5;i++)box(5.8+i*.3,.22,1,palette.stoneLight,0,-.12-i*.2,13+i*.65);
 for(const x of [-3,3]){stoneLantern(x,10.5);stoneLantern(x,-.5);}for(const [x,z] of [[-12,-8],[-12,-1],[12,-8],[12,10],[-11,10],[-7,-9],[6,-10]]){pine(x,z,.7+rand()*.25,(rand()-.5)*.7);}
 for(let i=0;i<25;i++){const a=rand()*TAU,r=17+rand()*5;pine(Math.cos(a)*r,Math.sin(a)*r,.65+rand()*.5,(rand()-.5));}
 for(let i=0;i<30;i++){let x=(rand()-.5)*25,z=(rand()-.5)*22;if(Math.abs(x)<3||Math.abs(z)<3)continue;rock(x,z,.2+rand()*.4);}
}
function mountains(){for(let i=0;i<32;i++){const a=i/32*TAU,r=65+rand()*75,h=18+rand()*58;const geo=new THREE.ConeGeometry(9+rand()*20,h,6+Math.floor(rand()*3),4);const p=geo.attributes.position;for(let j=0;j<p.count;j++){const x=p.getX(j),y=p.getY(j),z=p.getZ(j);p.setX(j,x+Math.sin(x*.4+z*.6+y*.2)*1.4);p.setZ(j,z+Math.cos(x*.3-z*.4+y*.2)*1.3);}geo.computeVertexNormals();const m=mesh(geo,mat(['#547b70','#739588','#8ca99a','#456e65'][i%4],{flatShading:true}),Math.cos(a)*r,-h/2-5-rand()*8,Math.sin(a)*r);m.rotation.y=rand()*TAU;m.castShadow=false;m.receiveShadow=false;}
 const fogGeo=new THREE.BufferGeometry(),fogPoints=[];for(let i=0;i<60;i++)fogPoints.push((rand()-.5)*180,1+rand()*9,(rand()-.5)*180);fogGeo.setAttribute('position',new THREE.Float32BufferAttribute(fogPoints,3));const mist=new THREE.Points(fogGeo,new THREE.PointsMaterial({color:'#d9e1c9',map:softTexture(),size:25,transparent:true,opacity:.055,depthWrite:false,sizeAttenuation:true}));mist.name='mountain-mist';scene.add(mist);
}
function makePerson(robeMaterial=palette.robe){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 cylinder(.22,.36,.9,robeMaterial,0,.63,0,body,12);
 cylinder(.258,.27,.085,palette.brass,0,.65,0,body);
 sphere(.22,palette.skin,0,1.27,0,body);
 sphere(.22,palette.hair,0,1.37,-.03,body,1,.6,1);
 sphere(.095,palette.hair,0,1.56,-.045,body);
 box(.35,.024,.024,palette.wood,0,1.56,-.045,body);
 const arms=[],legs=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.28,.96,0);arm.rotation.z=side*.2;body.add(arm);
  cylinder(.095,.14,.48,robeMaterial,0,-.15,0,arm,8);sphere(.07,palette.skin,0,-.4,.015,arm);arms.push(arm);
  const leg=new THREE.Group();leg.position.set(side*.13,.3,0);body.add(leg);
  cylinder(.065,.065,.22,palette.hair,0,-.08,0,leg,6);box(.15,.12,.25,palette.hair,0,-.17,.045,leg);legs.push(leg);
  sphere(.023,palette.hair,side*.072,1.3,.2,body);
 }
 const shadow=mesh(new THREE.PlaneGeometry(1.5,1.5),new THREE.MeshBasicMaterial({map:softTexture(),color:'#244c3b',transparent:true,opacity:.32,depthWrite:false}),0,.01,0,g);
 shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
 g.userData.body=body;g.userData.arms=arms;g.userData.legs=legs;scene.add(g);return g;
}
function setPersonName(model,name,self=false){
 let label=model.userData.nameplate;
 if(!label){
  let layer=document.getElementById('companion-labels');
  if(!layer){layer=document.createElement('div');layer.id='companion-labels';layer.setAttribute('role','list');layer.setAttribute('aria-label','庭院中的道友');document.body.append(layer);}
  label=document.createElement('div');label.className='companion-name'+(self?' companion-name-self':'');
  label.setAttribute('role','listitem');label.hidden=true;label.append(document.createElement('span'));layer.append(label);model.userData.nameplate=label;
 }
 const text=String(name||'云游道友').slice(0,20)+(self?'（我）':'');
 if(label.textContent!==text){label.firstElementChild.textContent=text;label.title=text;model.userData.labelWidth=0;}
}
function animateLimbs(model,phase,moving){
 const amount=moving?1:0;
 model.userData.arms.forEach((arm,i)=>arm.rotation.x=Math.sin(phase+i*Math.PI)*.28*amount);
 model.userData.legs.forEach((leg,i)=>leg.rotation.x=-Math.sin(phase+i*Math.PI)*.4*amount);
}
function floorHeight(x,z,where){
 if(where==='retreat')return .28;
 if(Math.abs(x)<5.4&&z<-2.6&&z>-9.3)return .82;
 if((Math.abs(x+9)<2.8||Math.abs(x-9)<2.6)&&z<-2.5&&z>-7.5)return .58;
 return .18;
}
function makeAvatar(){avatar=makePerson();avatar.position.copy(destination);avatarBody=avatar.userData.body;setPersonName(avatar,'云游道友',true);}
function animateCompanions(dt,elapsed){
 const now=performance.now(),visible=[];
 for(const model of companionModels.values()){
  const data=model.userData;
  model.visible=entered && area==='temple' && data.area==='temple';
  if(!model.visible){data.nameplate.hidden=true;continue;}
  const pose=samplePeerMotion(data.motion,now);
  const rendered=separateOverlappingPeer(data.session,pose.x,pose.z,avatar.position.x,avatar.position.z);
  // Separation at the shared arrival spot is visual only and never changes network coordinates.
  data.offsetX=THREE.MathUtils.lerp(data.offsetX||0,rendered.x-pose.x,Math.min(1,dt*5));
  data.offsetZ=THREE.MathUtils.lerp(data.offsetZ||0,rendered.z-pose.z,Math.min(1,dt*5));
  model.position.set(pose.x+data.offsetX,floorHeight(pose.x,pose.z,data.area),pose.z+data.offsetZ);
  let turn=pose.heading-model.rotation.y;turn=Math.atan2(Math.sin(turn),Math.cos(turn));model.rotation.y+=turn*Math.min(1,dt*9);
  data.body.position.y=pose.moving?Math.sin(elapsed*11)*.045:Math.sin(elapsed*1.5)*.008;
  data.body.rotation.z=pose.moving?Math.sin(elapsed*11)*.035:0;
  animateLimbs(model,elapsed*11,pose.moving);visible.push(model);
 }
 animateLimbs(avatar,walkPulse,!sitting&&Math.hypot(avatar.position.x-destination.x,avatar.position.z-destination.z)>.035);
 if(entered)visible.push(avatar);else avatar.userData.nameplate.hidden=true;
 const anchors=[];
 for(const model of visible){
  const label=model.userData.nameplate,p=model.position.clone();p.y+=sitting&&model===avatar?1.5:2.05;p.project(camera);
  const onScreen=p.z>=-1&&p.z<=1&&Math.abs(p.x)<1&&Math.abs(p.y)<1;
  label.hidden=!onScreen;if(!onScreen)continue;
  if(!model.userData.labelWidth)model.userData.labelWidth=label.offsetWidth||100;
  anchors.push({model,label,x:(p.x*.5+.5)*innerWidth,y:(-.5*p.y+.5)*innerHeight});
 }
 const occupied=[];
 for(const anchor of anchors.sort((a,b)=>b.y-a.y)){
  const pos=placeNameplate(anchor,anchor.model.userData.labelWidth,occupied,innerWidth);
  anchor.label.hidden=pos.y<18;
  anchor.label.style.transform=`translate(${pos.x}px,${pos.y}px) translate(-50%,-100%)`;
  anchor.label.style.setProperty('--name-stem',pos.stem+'px');
 }
}
function floatingParticles(){const count=65,points=[];for(let i=0;i<count;i++)points.push((rand()-.5)*35,rand()*10+.5,(rand()-.5)*30);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));petals=new THREE.Points(geo,new THREE.PointsMaterial({color:'#f5dfab',map:softTexture(),size:.09,transparent:true,opacity:.7,depthWrite:false}));scene.add(petals);}

function studyDesk(){
 const g=new THREE.Group();g.position.set(-5.9,0,-3.4);g.rotation.y=.16;scene.add(g);
 box(2.2,.12,1.15,palette.wood,0,.95,0,g);for(const x of [-.85,.85])for(const z of [-.4,.4])box(.12,.8,.12,palette.red,x,.5,z,g);
 box(1.4,.025,.68,palette.ivory,0,1.03,0,g);cylinder(.3,.3,.04,palette.brass,.3,1.07,0,g,8);
 for(let i=0;i<4;i++)box(.5,.035,.32,i%2?palette.roof:palette.ivory,-.65,1.05+i*.04,.04,g);
 box(.62,.5,.09,palette.wood,0,1.55,-.48,g);plaque('问 易 台',.58,0,1.55,-.42,g);
 markObject(g,'study');addLabel('study','问易台','book',[-5.9,2.55,-3.4]);
}

function addLabel(action,name,icon,pos,labelArea='temple'){const b=document.createElement('button');b.className='place-label';b.dataset.place=action;b.setAttribute('aria-label','前往'+name);b.innerHTML=`<svg aria-hidden="true"><use href="#i-${icon}"/></svg><span>${name}</span>`;document.querySelector('#scene-labels').appendChild(b);labels.push({element:b,pos:new THREE.Vector3(...pos),area:labelArea});}
function gameplayPlaces(){
 const table=new THREE.Group();table.position.set(2.5,.22,-2.2);scene.add(table);box(1.1,.12,.75,palette.wood,0,.8,0,table);for(const x of [-.4,.4])for(const z of [-.25,.25])box(.08,.74,.08,palette.red,x,.4,z,table);fortuneCup=new THREE.Group();fortuneCup.position.y=.9;table.add(fortuneCup);cylinder(.21,.18,.48,palette.red,0,.24,0,fortuneCup);for(let i=0;i<11;i++){const a=i/11*TAU,r=i%3*.055;const stick=cylinder(.012,.012,.55+(i%3)*.07,palette.ivory,Math.cos(a)*r,.63,Math.sin(a)*r,fortuneCup,5);stick.rotation.z=(i-5)*.018;}cylinder(.215,.215,.035,palette.brass,0,.43,0,fortuneCup);markObject(table,'fortune');
 const forge=new THREE.Group();forge.position.set(-11.2,0,.6);scene.add(forge);contactShadow(-11.2,.6,4,4,.3);cylinder(1.35,1.45,.2,palette.stoneDark,0,.17,0,forge,24);for(let i=0;i<3;i++){const a=i/3*TAU;cylinder(.12,.18,.55,palette.brass,Math.cos(a)*.5,.54,Math.sin(a)*.5,forge);}sphere(.88,palette.roof,0,1.3,0,forge,1,1.1,1);cylinder(.62,.82,.18,palette.brass,0,2.13,0,forge);cylinder(.52,.65,.17,palette.roof,0,2.28,0,forge);sphere(.12,palette.brass,0,2.48,0,forge);for(const side of [-1,1]){const h=mesh(new THREE.TorusGeometry(.25,.055,6,14),palette.brass,side*.9,1.58,0,forge);h.rotation.y=Math.PI/2;}const firemat=mat('#bb8045',{emissive:'#ef8733',emissiveIntensity:.35});furnaceGlow=firemat;const fire=mesh(new THREE.CircleGeometry(.34,20),firemat,0,1.03,.79,forge);fire.castShadow=false;const rim=mesh(new THREE.TorusGeometry(.35,.045,6,20),palette.brass,0,1.03,.81,forge);furnaceFlames=new THREE.Group();furnaceFlames.position.set(0,1.04,.84);forge.add(furnaceFlames);for(let i=0;i<3;i++)sphere(.11,mat('#f0bd63',{emissive:'#e89b43',emissiveIntensity:.6}),(i-1)*.12,.03,0,furnaceFlames,.65,1.5,1);markObject(forge,'alchemy');
 const gate=new THREE.Group();gate.position.set(-8.8,0,10.6);gate.rotation.y=-.18;scene.add(gate);box(4.4,.18,1.8,palette.stoneDark,0,.16,0,gate);for(const x of [-1.7,1.7])box(.8,2.8,.45,palette.stoneDark,x,1.55,0,gate);mesh(new THREE.TorusGeometry(1.35,.19,8,36),palette.stoneLight,0,1.6,0,gate);box(4.4,.15,.6,palette.roofEdge,0,3.16,0,gate);for(const x of [-1.7,1.7])sphere(.16,palette.brass,x,3.32,0,gate);gateVeil=mesh(new THREE.CircleGeometry(1.17,32),new THREE.MeshStandardMaterial({color:'#667f66',transparent:true,opacity:.76,side:THREE.DoubleSide}),0,1.6,.04,gate);gateWheel=new THREE.Group();gateWheel.position.set(0,1.6,.08);gate.add(gateWheel);for(let i=0;i<8;i++){const a=i/8*TAU;const rune=box(.08,.22,.05,palette.brass,Math.sin(a)*.93,Math.cos(a)*.93,0,gateWheel);rune.rotation.z=-a;}const center=mesh(new THREE.PlaneGeometry(.72,.72),new THREE.MeshBasicMaterial({map:makeText('☯',128,128),transparent:true}),0,1.6,.12,gate);markObject(gate,'gate');
 const sign=new THREE.Group();sign.position.set(3.1,0,11.2);scene.add(sign);cylinder(.055,.09,1.45,palette.wood,0,.8,0,sign);box(1.75,.65,.11,palette.wood,0,1.45,0,sign);plaque('洞 天',1.5,0,1.45,.07,sign);markObject(sign,'retreat');
 resourcePatch('leaf',-12.1,-1.9);resourcePatch('dew',12.3,6.5);resourcePatch('moss',-10.9,11.6);
 addLabel('alchemy','丹炉','flame',[-11.2,3.5,.6]);addLabel('gate','月门','gate',[-8.8,4.1,10.6]);addLabel('leaf','听风叶','leaf',[-12.1,1.8,-1.9]);addLabel('dew','莲露','leaf',[12.3,1.6,6.5]);addLabel('retreat','我的洞天','home',[3.1,2.6,11.2]);
}
function resourcePatch(key,x,z){const g=new THREE.Group();g.position.set(x,.18,z);scene.add(g);const colors={leaf:'#a7bc7b',dew:'#acd3d5',moss:'#baa0ce'},m=mat(colors[key],{emissive:colors[key],emissiveIntensity:.1});const tops=[];for(let i=0;i<3;i++){const a=i/3*TAU,px=Math.cos(a)*.38,pz=Math.sin(a)*.38;cylinder(.018,.025,.4,palette.darkLeaf,px,.22,pz,g,5);const leaves=new THREE.Group();leaves.position.set(px,.44,pz);g.add(leaves);for(let j=0;j<4;j++){const a=j/4*TAU;const leaf=sphere(.16,m,Math.cos(a)*.11,0,Math.sin(a)*.11,leaves,1.4,.35,.6);leaf.rotation.y=-a;}if(key==='dew')sphere(.075,m,0,.15,0,leaves,.8,1.3,.8);tops.push(leaves);}resourcePlants[key]=tops;markObject(g,key);}
function personalRetreat(){const g=new THREE.Group();g.position.set(70,0,0);scene.add(g);cylinder(10,11,2,mat('#617c64'),0,-1.15,0,g,40);cylinder(9.5,10,.13,palette.moss,0,-.08,0,g,40);box(11,.23,10,palette.stoneDark,0,.07,-.5,g);for(let i=0;i<22;i++)box(.47,.08,9.6,palette.wood,(i-10.5)*.49,.23,-.5,g);
 const cave=mat('#697e71'),caveDark=mat('#3d5a4d');box(5.5,4.7,.5,caveDark,-2,2.4,-5,g);box(1.5,4.7,.5,caveDark,4,2.4,-5,g);box(2.5,1.5,.5,caveDark,2,4,-5,g);for(const side of [-1,1])for(let i=0;i<5;i++)sphere(.9,cave,side*(4.7+(i%2)*.2),.8+(i%3)*1.1,-4+i*1.6,g,.65,1.2,1.15);mesh(new THREE.TorusGeometry(4.3,.7,8,32,Math.PI),cave,0,1.1,-4.55,g);box(9,.13,.13,palette.wood,0,4.3,-4.1,g);
 const curtain=mat('#879774',{side:THREE.DoubleSide});retreatCurtain=new THREE.Group();g.add(retreatCurtain);box(2.5,3.1,.06,curtain,2,1.88,-4.65,retreatCurtain);for(let i=0;i<8;i++)box(.03,3.05,.04,palette.moss,.9+i*.3,1.88,-4.59,retreatCurtain);
 cylinder(1.2,1.2,.1,palette.moss,0,.37,-.3,g,32);cylinder(.62,.65,.13,palette.ivory,0,.47,-.3,g,24);box(2.3,.12,.9,palette.wood,-2.1,.88,-2.7,g);for(const side of [-1,1])box(.12,.57,.65,palette.red,-2.1+side*.85,.55,-2.7,g);cylinder(.14,.18,.2,palette.brass,-2.25,1.05,-2.7,g);cylinder(.07,.09,.09,palette.ivory,-1.7,1,-2.6,g);
 for(let i=0;i<3;i++){const x=-2.6+i*2.6,z=2.1;cylinder(.52,.39,.68,palette.red,x,.62,z,g,16);cylinder(.57,.57,.07,palette.brass,x,.98,z,g,20);cylinder(.48,.48,.025,mat('#4a4a35'),x,1.02,z,g,20);const plantGroup=new THREE.Group();plantGroup.position.set(x,1.03,z);g.add(plantGroup);branch(new THREE.Vector3(),new THREE.Vector3(0,1.2,0),.035,palette.darkLeaf,plantGroup);for(let j=0;j<5;j++){const a=j*2.3;const leaf=sphere(.24,palette.leaf,Math.cos(a)*.22,.25+j*.17,Math.sin(a)*.22,plantGroup,1.5,.35,.7);leaf.rotation.y=-a;}const flower=new THREE.Group();flower.position.set(0,1.25,0);plantGroup.add(flower);const petals=mat('#d0c09b',{emissive:'#c0aa79',emissiveIntensity:.2});for(let j=0;j<6;j++){const a=j/6*TAU;sphere(.17,petals,Math.cos(a)*.2,0,Math.sin(a)*.2,flower,1,.4,1);}sphere(.13,palette.brass,0,.04,0,flower);retreatPots.push({plant:plantGroup,flower});markObject(plantGroup,'retreat');}
 const chime=new THREE.Group();chime.position.set(-3.9,3.25,-.2);g.add(chime);cylinder(.25,.25,.08,palette.wood,0,0,0,chime);for(let i=0;i<5;i++){const a=i/5*TAU;line([new THREE.Vector3(Math.cos(a)*.16,0,Math.sin(a)*.16),new THREE.Vector3(Math.cos(a)*.16,-.7,Math.sin(a)*.16)],'#c7b984',chime);cylinder(.025,.025,.55,palette.brass,Math.cos(a)*.16,-.68,Math.sin(a)*.16,chime,6);}retreatDecor.charm=chime;
 const scroll=new THREE.Group();scroll.position.set(-1.5,2.7,-4.65);g.add(scroll);box(1.5,1.9,.045,palette.ivory,0,0,0,scroll);for(const y of [-1,1]){const bar=cylinder(.045,.045,1.7,palette.wood,0,y,0,scroll);bar.rotation.z=Math.PI/2;}const art=mesh(new THREE.PlaneGeometry(1.15,1.45),new THREE.MeshBasicMaterial({map:makeText('月',200,240,'#6b7f67'),transparent:true}),0,0,.04,scroll);retreatDecor.ink=scroll;
 const lamp=lantern(3.5,2.8,-1.7,g);lamp.scale.setScalar(1.5);retreatDecor.lantern=lamp;const cloudLamp=lantern(-3.7,3.1,2.4,g);cloudLamp.scale.setScalar(1.7);retreatDecor['cloud-lantern']=cloudLamp;
 retreatExpansion=new THREE.Group();g.add(retreatExpansion);box(4.8,.15,5.3,palette.wood,2,.25,-7.4,retreatExpansion);box(.2,3.8,5.5,cave,4.4,2,-7.4,retreatExpansion);box(.2,3.8,5.5,cave,-.4,2,-7.4,retreatExpansion);box(4.8,3.8,.2,cave,2,2,-10,retreatExpansion);box(2.4,1.9,.55,palette.wood,2,1.25,-9.5,retreatExpansion);for(let j=0;j<3;j++){box(2.5,.07,.6,palette.brass,2,.48+j*.6,-9.5,retreatExpansion);for(let k=0;k<6;k++)box(.17,.42,.3,k%2?palette.ivory:palette.moss,1.05+k*.35,.75+j*.6,-9.45,retreatExpansion);}cylinder(.8,.8,.12,palette.moss,2,.4,-7.2,retreatExpansion,24);retreatExpansion.visible=false;
 for(const d of Object.values(retreatDecor))d.visible=false;for(const p of retreatPots)p.plant.visible=false;pine(63.5,-4,.8);pine(77,-2,.65);for(let i=0;i<18;i++){const a=i/18*TAU;rock(70+Math.cos(a)*9,Math.sin(a)*8,.35+rand()*.3);}
 const portal=new THREE.Group();portal.position.set(74.5,.18,4.4);scene.add(portal);cylinder(.055,.08,1.3,palette.wood,0,.65,0,portal);box(1.5,.55,.12,palette.wood,0,1.3,0,portal);plaque('归 山',1.3,0,1.3,.08,portal);markObject(portal,'wander');addLabel('retreat','云种花圃','leaf',[70,2,2.1],'retreat');addLabel('wander','返回庭院','home',[74.5,2.3,4.4],'retreat');
}
export function initWorld(options={}){Object.assign(hooks,options);const canvas=document.querySelector('#scene');renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.3:1.7));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
 scene=new THREE.Scene();scene.background=new THREE.Color('#aabfb3');scene.fog=new THREE.FogExp2('#aabfb3',.0095);camera=new THREE.PerspectiveCamera(innerWidth<700?55:42,innerWidth/innerHeight,.2,350);clock=new THREE.Clock();hemisphere=new THREE.HemisphereLight('#e6eed8','#314f3e',1.9);scene.add(hemisphere);light=new THREE.DirectionalLight('#ffedbe',2.8);light.position.set(-18,28,15);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-28,right:28,top:28,bottom:-28,near:1,far:90});light.shadow.bias=-.0003;light.shadow.normalBias=.04;scene.add(light);scene.add(light.target);const fill=new THREE.DirectionalLight('#cee3d5',.7);fill.position.set(15,8,-12);scene.add(fill);
 sky=mesh(new THREE.SphereGeometry(3.8,24,16),new THREE.MeshBasicMaterial({color:'#f0dfb4',fog:false}),-35,36,-95);sky.castShadow=false;
 mountains();ground();temple();pavilion(-9,-5,'library');pavilion(9,-5,'music');studyDesk();meditation();bellTower();pond();wishingTree();gameplayPlaces();personalRetreat();makeAvatar();floatingParticles();
 addLabel('fortune','求签阁','fortune',[0,6.6,-5]);addLabel('library','藏经阁','book',[-9,4.8,-4]);addLabel('music','听松亭','music',[9,4.7,-4]);
 if(innerWidth<700){desiredDistance=distance=62;pitch=.7;yaw=.28;desiredTarget.set(0,1.4,0);target.copy(desiredTarget);}else{desiredTarget.set(-4,1.1,0);target.copy(desiredTarget);}
 canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',()=>{drag=null;touches.clear();});canvas.addEventListener('wheel',e=>{e.preventDefault();desiredDistance=THREE.MathUtils.clamp(desiredDistance+e.deltaY*.025,18,90);},{passive:false});
 window.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName))return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){keys.add(k);e.preventDefault();if(!entered)world.enter();}});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());window.addEventListener('resize',resize);
 for(const [id,key] of [['move-up','w'],['move-left','a'],['move-down','s'],['move-right','d']]){const b=document.getElementById(id);b.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(key);b.setPointerCapture(e.pointerId);});b.addEventListener('pointerup',()=>keys.delete(key));b.addEventListener('pointercancel',()=>keys.delete(key));}
 animate();hooks.ready();return world;
}
function resize(){const mobile=innerWidth<700;if(mobile!==mobileLayout){mobileLayout=mobile;desiredDistance=distance=area==='retreat'?(mobile?24:19):(mobile?(entered?43:62):36);camera.fov=mobile?55:42;}camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.3:1.7));}
function pointerDown(e){touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size===2){const [a,b]=[...touches.values()];pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);moved=true;return;}drag={x:e.clientX,y:e.clientY,px:e.clientX,py:e.clientY,id:e.pointerId};moved=false;renderer.domElement.setPointerCapture(e.pointerId);}
function pointerMove(e){if(touches.has(e.pointerId))touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size===2){const [a,b]=[...touches.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance>0)desiredDistance=THREE.MathUtils.clamp(desiredDistance*pinchDistance/Math.max(d,1),18,90);pinchDistance=d;moved=true;return;}if(!drag)return;const dx=e.clientX-drag.px,dy=e.clientY-drag.py;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6)moved=true;if(moved){yaw-=dx*.004;pitch=THREE.MathUtils.clamp(pitch+dy*.004,.28,1.25);}drag.px=e.clientX;drag.py=e.clientY;}
function pointerUp(e){const wasPinch=touches.size>1;touches.delete(e.pointerId);if(wasPinch){drag=null;pinchDistance=0;return;}if(!drag)return;if(!moved){if(!entered){world.enter();drag=null;return;}const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(objects,false);if(hit.length&&hit[0].object.userData.action){hooks.action(hit[0].object.userData.action);}else{const p=new THREE.Vector3();raycaster.ray.intersectPlane(groundPlane,p);if(area==='retreat'?p.x>62&&p.x<78&&p.z>(roomExpanded?-9.6:-4)&&p.z<6:Math.abs(p.x)<13.5&&p.z>-10&&p.z<12){hooks.move();sitting=false;const ex=(p.x-9.5)/4.3,ez=(p.z-4)/3.3;if(area==='retreat'||ex*ex+ez*ez>1)destination.set(p.x,.18,p.z);}}}drag=null;}
function animate(){requestAnimationFrame(animate);const elapsed=clock.getElapsedTime(),dt=Math.min(.05,elapsed-last);last=elapsed;distance=THREE.MathUtils.lerp(distance,desiredDistance,Math.min(1,dt*2));target.lerp(desiredTarget,Math.min(1,dt*2));camera.position.set(target.x+Math.sin(yaw)*Math.cos(pitch)*distance,target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(target);
 if(keys.size&&entered&&!sitting&&!document.querySelector('dialog[open]')){let x=0,z=0;if(keys.has('w')||keys.has('arrowup'))z-=1;if(keys.has('s')||keys.has('arrowdown'))z+=1;if(keys.has('a')||keys.has('arrowleft'))x-=1;if(keys.has('d')||keys.has('arrowright'))x+=1;const v=new THREE.Vector3(x,0,z).normalize().applyAxisAngle(new THREE.Vector3(0,1,0),yaw);destination.copy(avatar.position).addScaledVector(v,dt*4);destination.x=THREE.MathUtils.clamp(destination.x,area==='retreat'?63:-13,area==='retreat'?77:13);destination.z=THREE.MathUtils.clamp(destination.z,area==='retreat'?(roomExpanded?-9.5:-4):-10,area==='retreat'?5:12);}
 const delta=new THREE.Vector3().subVectors(destination,avatar.position);delta.y=0;const dist=delta.length();if(dist>.035&&!sitting){const step=Math.min(dt*3,dist);delta.normalize();avatar.position.addScaledVector(delta,step);const angle=Math.atan2(delta.x,delta.z);let diff=angle-avatar.rotation.y;diff=Math.atan2(Math.sin(diff),Math.cos(diff));avatar.rotation.y+=diff*Math.min(1,dt*9);walkPulse+=dt*11;avatarBody.position.y=Math.sin(walkPulse)*.045;avatarBody.rotation.z=Math.sin(walkPulse)*.035;}else{avatarBody.position.y=THREE.MathUtils.lerp(avatarBody.position.y,sitting?-.35:0,dt*7);avatarBody.scale.y=THREE.MathUtils.lerp(avatarBody.scale.y,sitting?.65:1,dt*6);avatarBody.rotation.z*=.9;}
 if(!sitting)avatarBody.scale.y=THREE.MathUtils.lerp(avatarBody.scale.y,1,dt*6);
 if(bell){const age=elapsed-bellAt;bell.rotation.x=age<8?Math.sin(age*8)*.16*Math.exp(-age*.65):0;}
 if(water){water.material.uniforms.time.value=elapsed;water.material.uniforms.night.value=night?1:0;}
 for(const fish of fishes){const a=elapsed*.12+fish.userData.phase;fish.position.set(9.5+Math.cos(a)*2.5,.15,4+Math.sin(a)*1.7);fish.rotation.y=-a-Math.PI/2;}
 if(smoke&&smoke.visible){const p=smoke.geometry.attributes.position;for(let i=0;i<p.count;i++){const phase=((elapsed*.2+i/p.count)%1);p.setXYZ(i,Math.sin(phase*9+elapsed*.5)*(.06+phase*.38),1.8+phase*2.8,-2.05+Math.cos(phase*8+elapsed*.3)*phase*.22);}p.needsUpdate=true;smoke.material.opacity=elapsed<incenseUntil?.22:Math.max(0,smoke.material.opacity-dt*.04);if(smoke.material.opacity<=0)smoke.visible=false;}
 if(petals){const p=petals.geometry.attributes.position;for(let i=0;i<p.count;i++){let y=p.getY(i)-dt*.045;if(y<.3)y=10;p.setY(i,y);p.setX(i,p.getX(i)+Math.sin(elapsed*.3+i)*dt*.02);}p.needsUpdate=true;}
 if(focusRing?.visible){focusRing.scale.setScalar(1+Math.sin(elapsed*.75)*.08);focusRing.material.opacity=.4+Math.sin(elapsed*.75)*.15;}
 for(const l of labels){if(l.area!==area){l.element.style.display='none';continue;}const p=l.pos.clone().project(camera);l.element.style.left=THREE.MathUtils.clamp((p.x*.5+.5)*innerWidth,80,innerWidth-80)+'px';l.element.style.top=(-p.y*.5+.5)*innerHeight+'px';l.element.style.display=p.z>1||p.x<-1||p.x>1||p.y<-1||p.y>1?'none':'';}
 const px=(avatar.position.x-9.5)/4.3,pz=(avatar.position.z-4)/3.3,pd=Math.hypot(px,pz);if(area==='temple'&&pd<1&&pd>.01){avatar.position.x=9.5+px/pd*4.35;avatar.position.z=4+pz/pd*3.35;}if(!sitting){const x=avatar.position.x,z=avatar.position.z;let floor=.18;if(area==='retreat')floor=.28;else if(Math.abs(x)<5.4&&z<-2.6&&z>-9.3)floor=.82;else if((Math.abs(x+9)<2.8||Math.abs(x-9)<2.6)&&z<-2.5&&z>-7.5)floor=.58;avatar.position.y=THREE.MathUtils.lerp(avatar.position.y,floor,Math.min(1,dt*7));}
 if(fortuneCup){const age=elapsed-fortuneShake;fortuneCup.rotation.z=age<.8?Math.sin(age*35)*.15*(1-age/.8):0;if(fortuneCup.children[6])fortuneCup.children[6].position.y=THREE.MathUtils.lerp(fortuneCup.children[6].position.y,fortuneDrawn?1.05:.63,dt*7);}
 if(gateWheel){gateWheel.rotation.z=THREE.MathUtils.lerp(gateWheel.rotation.z,gateOpened?Math.PI/4:0,dt*2);if(gateOpened&&gateVeil.material.opacity>0){gateVeil.material.opacity=Math.max(0,gateVeil.material.opacity-dt*.8);if(gateVeil.material.opacity===0)gateVeil.visible=false;}}
 if(furnaceFlames)furnaceFlames.scale.y=.75+(furnaceFlames.userData.heat||0)*.7+Math.sin(elapsed*13)*.08;
 animateCompanions(dt,elapsed);
 renderer.render(scene,camera);
}
const companionModels = new Map();
export const world={
 presence() {
  return {x: avatar?.position.x ?? 0, z: avatar?.position.z ?? 7, area};
 },
 setSelfName(name){if(avatar)setPersonName(avatar,name,true);},
 setPeers(peers) {
  if(!scene)return;
  const current=new Set(peers.map(peer=>peer.session));
  for(const [id,model] of companionModels){
   if(current.has(id))continue;
   scene.remove(model);model.userData.nameplate?.remove();
   model.traverse(object=>{
    object.geometry?.dispose();
    if(object.material&&!Object.values(palette).includes(object.material)){object.material.map?.dispose();object.material.dispose();}
   });companionModels.delete(id);
  }
  const robes=[palette.roof,palette.moss,palette.red,palette.ivory,palette.roofEdge];
  for(const peer of peers){
   if(!Number.isFinite(peer.x)||!Number.isFinite(peer.z))continue;
   let model=companionModels.get(peer.session);
   if(!model){
    let color=0;for(const char of peer.session)color+=char.charCodeAt(0);
    model=makePerson(robes[color%robes.length]);
    model.userData.session=peer.session;model.userData.motion=createPeerMotion(peer.x,peer.z,performance.now());
    model.visible=false;companionModels.set(peer.session,model);
   }else receivePeerMotion(model.userData.motion,peer.x,peer.z,performance.now());
   model.userData.area=peer.area;setPersonName(model,peer.name);
  }
 },
 enter(){entered=true;document.body.classList.add('entered');document.getElementById('welcome').inert=true;document.getElementById('adventure-card').inert=false;document.getElementById('scene-labels').inert=false;desiredTarget.set(0,1.2,innerWidth<700?3.5:0);desiredDistance=innerWidth<700?43:36;hooks.location('wander');},
 go(action){if(!entered)this.enter();if(action==='retreat'){area='retreat';avatar.position.set(70,.28,4.1);destination.copy(avatar.position);desiredTarget.set(70,1,-.2);desiredDistance=innerWidth<700?24:19;light.position.set(52,28,15);light.target.position.set(70,0,0);sitting=false;focusRing.visible=false;hooks.location(action);return;}if(area==='retreat'){area='temple';avatar.position.set(0,.18,7.3);light.position.set(-18,28,15);light.target.position.set(0,0,0);}const p=positions[action]||positions.wander;destination.set(...p);sitting=false;focusRing.visible=false;hooks.location(action);if(action==='hall'||action==='fortune'||action==='incense'){desiredTarget.set(0,1.5,-4);desiredDistance=innerWidth<700?37:27;}else if(action==='wander'){desiredTarget.set(0,1.2,innerWidth<700?3.5:0);desiredDistance=innerWidth<700?43:36;}else{desiredTarget.set(p[0]*.5,1.2,p[2]*.5);desiredDistance=innerWidth<700?40:29;}},
 meditate(active){this.go('meditate');sitting=active;focusRing.visible=active;if(active){avatar.position.set(-5.3,.55,3);destination.copy(avatar.position);avatar.rotation.y=.2;desiredTarget.set(-5.3,1.2,3);desiredDistance=innerWidth<700?25:19;}},
 shakeFortune(drawn=false){fortuneShake=clock.getElapsedTime();fortuneDrawn=drawn;},
 openGate(){gateOpened=true;},
 setAlchemy(heat,active){if(furnaceGlow)furnaceGlow.emissiveIntensity=.35+(active?heat*2:0);if(furnaceFlames)furnaceFlames.userData.heat=active?heat:0;},
 syncGame(state){if(!scene)return;roomExpanded=state.expanded;gateOpened=state.flags.includes('gate');if(gateOpened&&gateVeil)gateVeil.visible=false;for(const [key,tops] of Object.entries(resourcePlants))tops.forEach((p,i)=>p.visible=i>=state.gathered[key]);for(let i=0;i<retreatPots.length;i++){const p=state.pots[i],model=retreatPots[i];model.plant.visible=!!p;if(p){const progress=p.readyAt?THREE.MathUtils.clamp(1-(p.readyAt-Date.now())/25000,0,1):0;model.plant.scale.setScalar(.2+progress*.8);model.flower.visible=progress===1;}}for(const [id,group] of Object.entries(retreatDecor))group.visible=state.equipped.includes(id);if(retreatExpansion)retreatExpansion.visible=state.expanded;if(retreatCurtain)retreatCurtain.visible=!state.expanded;},
 ring(){bellAt=clock.getElapsedTime();},
 incense(){incenseUntil=clock.getElapsedTime()+65;smoke.visible=true;smoke.material.opacity=.22;const group=scene.getObjectByName('incense-sticks');if(group.children.length<6){const x=(group.children.length/2-1)*.13;cylinder(.014,.014,.8,palette.wood,x,1.23,0,group,5);sphere(.025,mat('#d79653',{emissive:'#ff943b',emissiveIntensity:2}),x,1.64,0,group);}},
 setNight(value){night=value;scene.background.set(value?'#152e38':'#aabfb3');scene.fog.color.copy(scene.background);scene.fog.density=value?.014:.0095;hemisphere.intensity=value?.9:1.9;hemisphere.color.set(value?'#a8c2d4':'#e6eed8');light.intensity=value?.65:2.8;light.color.set(value?'#bdd4db':'#ffedbe');renderer.toneMappingExposure=value?.95:1.15;for(const l of lights)l.intensity=value?10:0;for(const m of lanternMats)m.emissiveIntensity=value?1.8:.22;sky.material.color.set(value?'#dae3ce':'#f0dfb4');},
 getState(){return{entered,night,avatar:{x:avatar.position.x,z:avatar.position.z},drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};}
};
