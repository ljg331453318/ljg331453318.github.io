export const ingredients={leaf:{name:'听风叶',symbol:'叶',color:'#a9bf80',place:'leaf'},dew:{name:'莲露',symbol:'露',color:'#9dc9d0',place:'dew'},moss:{name:'月华苔',symbol:'苔',color:'#d1b7da',place:'gate'}};
export const recipes=[
 {id:'cloudseed',name:'云种珠',symbol:'种',description:'将一缕云意，种成满园生机。',mix:{leaf:1,dew:1,moss:1},zones:[[28,55],[57,81],[35,58]]},
 {id:'charm',name:'松风铃坠',symbol:'风',description:'为洞天添一串随风轻响的铃。',mix:{leaf:2,dew:1,moss:0},zones:[[22,47],[48,73],[30,55]]},
 {id:'ink',name:'暮色墨',symbol:'墨',description:'研一砚暮色，绘一幅月影。',mix:{leaf:1,dew:2,moss:0},zones:[[35,62],[55,80],[18,44]]},
 {id:'lantern',name:'苔光灯芯',symbol:'灯',description:'在洞天里，点起一盏温柔的灯。',mix:{leaf:1,dew:0,moss:2},zones:[[50,77],[65,88],[35,62]]}
];
export const fortunes=[
 {id:'water',number:8,title:'石下清流',character:'水',verse:'磐石虽不移，\n流水自有径。',reflection:'不妨换一种柔和的方式，也许便能看见先前忽略的出口。',prompt:'今天，有什么事可以少用一点力？'},
 {id:'pine',number:17,title:'松根待时',character:'松',verse:'山中未见树，\n根已向深处。',reflection:'有些值得等待的事，正在你看不见的地方慢慢生长。',prompt:'哪一件小事，值得你再照料一天？'},
 {id:'moon',number:23,title:'借月入怀',character:'月',verse:'池水不留月，\n满池却是光。',reflection:'好时光不必紧紧留住，也可以尽心欣赏。',prompt:'有什么美好，可以欣赏而不必拥有？'},
 {id:'door',number:31,title:'虚掩之门',character:'门',verse:'携钥行千里，\n回看门未扃。',reflection:'那一步迟迟未迈出的路，也许并没有想象中艰难。',prompt:'有什么事，不必等准备万全也能先试一试？'},
 {id:'wind',number:42,title:'风来有信',character:'风',verse:'叶不问风向，\n随风亦成舞。',reflection:'若今天的安排有所改变，不妨留一点余地，随势而行。',prompt:'此刻，你可以放松哪一种期待？'},
 {id:'tea',number:56,title:'再添一盏',character:'茶',verse:'缓缓斟茶去，\n尚可共一盏。',reflection:'为一次不赶时间的交谈，留出一点空闲。',prompt:'谁会因为你一句不求回报的问候，感到暖意？'},
 {id:'cloud',number:64,title:'云外一步',character:'云',verse:'前路隐云雾，\n一步在足下。',reflection:'不必先看清整条路，也能走好眼前的一步。',prompt:'眼下，你真正能做的下一件事是什么？'},
 {id:'seed',number:72,title:'一粒新生',character:'芽',verse:'空盆一粒种，\n已许明日青。',reflection:'从一件足够小、也照顾得来的事开始。',prompt:'对你而言，一个从容的开始会是什么模样？'}
];
export const questSteps=[
 {flag:'fortune',title:'山中来信',task:'到云栖殿求签阁，抽取第一支签。',action:'fortune'},
 {flag:'dew',title:'循水而行',task:'前往锦鲤池畔，采集莲露。',action:'dew'},
 {flag:'gate',title:'叩开月门',task:'转动四方印记，寻得月华苔。',action:'gate'},
 {flag:'cloudseed',title:'云上一粒种',task:'各取一份听风叶、莲露与月华苔，炼成云种珠。',action:'alchemy'},
 {flag:'planted',title:'洞天初成',task:'回到洞天，种下一颗云种珠。',action:'retreat'},
 {flag:'harvest',title:'静待花开',task:'以莲露浇灌云种，待花开后采收。',action:'retreat'}
];
const itemKeys=['leaf','dew','moss','cloudseed','charm','ink','lantern','bloom','ash'];
const count=n=>Number.isFinite(n)?Math.max(0,Math.floor(n)):0;
export function createGameState(raw={}){const s={version:1,bag:{},gathered:{leaf:0,dew:0,moss:0},flags:[],fortunes:[],known:[],brews:0,harvests:0,pots:[null,null,null],decor:[],equipped:[],expanded:false,seals:[2,2,1,1],activeBrew:null,lastBrew:null,rewarded:[],...raw};s.bag=Object.fromEntries(itemKeys.map(k=>[k,count(raw.bag?.[k])]));s.gathered=Object.fromEntries(['leaf','dew','moss'].map(k=>[k,Math.min(3,count(raw.gathered?.[k]))]));for(const k of ['flags','fortunes','known','decor','equipped','rewarded'])if(!Array.isArray(s[k]))s[k]=[];s.brews=count(s.brews);s.harvests=count(s.harvests);s.pots=Array.from({length:3},(_,i)=>{const p=raw.pots?.[i];return p&&Number.isFinite(p.plantedAt)?{plantedAt:p.plantedAt,readyAt:Number.isFinite(p.readyAt)?p.readyAt:null}:null;});if(!Array.isArray(s.seals)||s.seals.length!==4||s.seals.some(v=>!Number.isInteger(v)||v<0||v>3))s.seals=[2,2,1,1];if(s.activeBrew&&(!Array.isArray(s.activeBrew.hits)||s.activeBrew.hits.length>2||!s.activeBrew.mix))s.activeBrew=null;return s;}
export function flag(s,key){if(!s.flags.includes(key))s.flags.push(key);}
export function gather(s,key){if(!ingredients[key])return{ok:false,message:'未识别的材料。'};if(key==='moss'&&!s.flags.includes('gate'))return{ok:false,message:'月门尚未开启，先解开四方印记。'};if(s.bag[key]>=12)return{ok:false,message:'行囊中已有十二份，不妨先开炉试炼。'};if(s.gathered[key]>=3)return{ok:false,message:'此处本轮已采集完毕。完成一次炼制后，材料会重新生长。'};s.bag[key]++;s.gathered[key]++;flag(s,key);return{ok:true};}
export function findRecipe(mix){return recipes.find(r=>Object.keys(ingredients).every(k=>(mix[k]||0)===r.mix[k]));}
export function beginBrew(s,mix){if(s.activeBrew)return{ok:false,message:'炉中已有一份材料，先完成这次炼制。'};if(Object.keys(mix).some(k=>!ingredients[k]))return{ok:false,message:'请从行囊中选取材料。'};if(Object.keys(ingredients).some(k=>!Number.isInteger(mix[k]||0)||(mix[k]||0)<0))return{ok:false,message:'材料数量须为整数。'};if(Object.values(mix).reduce((a,b)=>a+b,0)!==3)return{ok:false,message:'每炉需放入恰好三份材料。'};if(Object.keys(ingredients).some(k=>(mix[k]||0)>s.bag[k]))return{ok:false,message:'材料尚未备齐，请先采集后再开炉。'};for(const k of Object.keys(ingredients))s.bag[k]-=mix[k]||0;s.activeBrew={mix:{...mix},recipeId:findRecipe(mix)?.id||null,hits:[]};return{ok:true};}
export function isHeatHit(value,zone){return Number.isFinite(value)&&value>=zone[0]&&value<=zone[1];}
export function finishBrew(s){const b=s.activeBrew;if(!b||b.hits.length!==3)return null;const good=b.hits.filter(Boolean).length,recipe=recipes.find(r=>r.id===b.recipeId),success=!!recipe&&good>=2;const result={recipeId:recipe?.id||null,name:success?recipe.name:recipe?'余香灰':'一炉意外的余香灰',success,good,perfect:good===3,at:Date.now()};if(success){s.bag[recipe.id]+=good===3?2:1;s.brews++;if(!s.known.includes(recipe.id))s.known.push(recipe.id);flag(s,recipe.id);}else s.bag.ash++;s.gathered={leaf:0,dew:0,moss:0};s.lastBrew=result;s.activeBrew=null;return result;}
export function turnSeal(seals,index){const result=[...seals];result[index]=(result[index]+1)%4;result[(index+1)%4]=(result[(index+1)%4]+1)%4;return result;}
export function sealsSolved(seals){return seals.every(v=>v===0);}
export function sealHint(seals){if(sealsSolved(seals))return null;const queue=[{v:seals,path:[]}],seen=new Set([seals.join('')]);for(let n=0;n<queue.length;n++){for(let i=0;i<4;i++){const v=turnSeal(queue[n].v,i),key=v.join('');if(seen.has(key))continue;const path=[...queue[n].path,i];if(sealsSolved(v))return path[0];seen.add(key);queue.push({v,path});}}return null;}
export function plotUnlocked(s,i){return i===0||i===1&&s.brews>=2||i===2&&s.harvests>=2;}
export function plant(s,i,now=Date.now()){if(!plotUnlocked(s,i)||s.pots[i]||s.bag.cloudseed<1)return false;s.bag.cloudseed--;s.pots[i]={plantedAt:now,readyAt:null};flag(s,'planted');return true;}
export function water(s,i,now=Date.now()){const p=s.pots[i];if(!p||p.readyAt||s.bag.dew<1)return false;s.bag.dew--;p.readyAt=now+25000;return true;}
export function harvest(s,i,now=Date.now()){const p=s.pots[i];if(!p?.readyAt||now<p.readyAt)return false;s.pots[i]=null;s.bag.bloom++;s.harvests++;flag(s,'harvest');return true;}
export function craftDecor(s,id){if(!['charm','ink','lantern'].includes(id)||s.bag[id]<1||s.decor.includes(id))return false;s.bag[id]--;s.decor.push(id);s.equipped.push(id);return true;}
export function expandRetreat(s){if(s.expanded||s.bag.bloom<2||s.brews<3)return false;s.bag.bloom-=2;s.expanded=true;return true;}
export function currentQuest(s){return questSteps.findIndex(q=>!s.flags.includes(q.flag));}
