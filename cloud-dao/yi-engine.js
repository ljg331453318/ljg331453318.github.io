import {Solar,LunarUtil} from './vendor/lunar.js';
import {TIAOHOU} from './tiaohou.js';

export const GAN=[...'甲乙丙丁戊己庚辛壬癸'],ZHI=[...'子丑寅卯辰巳午未申酉戌亥'];
const GE=[...'木木火火土土金金水水'],ZE=[...'水土木木土火火土金金土水'];
const SHENG={木:'火',火:'土',土:'金',金:'水',水:'木'},KE={木:'土',土:'水',水:'火',火:'金',金:'木'};
export const stemElement=g=>GE[GAN.indexOf(g)];
export function tenGod(day,other){const d=stemElement(day),o=stemElement(other),same=GAN.indexOf(day)%2===GAN.indexOf(other)%2;if(d===o)return same?'比肩':'劫财';if(SHENG[d]===o)return same?'食神':'伤官';if(KE[d]===o)return same?'偏财':'正财';if(KE[o]===d)return same?'七杀':'正官';return same?'偏印':'正印';}
export function validPillar(p){return typeof p==='string'&&p.length===2&&GAN.includes(p[0])&&ZHI.includes(p[1])&&GAN.indexOf(p[0])%2===ZHI.indexOf(p[1])%2;}
export function parseCivil(date,time='12:00'){
 const d=/^(\d{4})-(\d{2})-(\d{2})$/.exec(date||''),t=/^(\d{2}):(\d{2})$/.exec(time||'');
 if(!d||!t)throw Error('请填写有效的公历日期和时间。');
 const [y,m,day,h,min]=[...d.slice(1),...t.slice(1)].map(Number),v=new Date(Date.UTC(y,m-1,day));
 if(y<1900||y>2099||m<1||m>12||day<1||v.getUTCMonth()!==m-1||v.getUTCDate()!==day||h>23||min>59)throw Error('支持 1900—2099 年，请检查日期与时分。');
 return {y,m,day,h,min};
}
export function branchRelations(pillars){
 const out=[],bs=pillars.filter(Boolean).map(p=>p[1]),names=['年','月','日','时'];
 const pairs={六合:['子丑','寅亥','卯戌','辰酉','巳申','午未'],六冲:['子午','丑未','寅申','卯酉','辰戌','巳亥'],六害:['子未','丑午','寅巳','卯辰','申亥','酉戌'],相刑:['寅巳','巳申','申寅','丑戌','戌未','未丑','子卯']};
 for(let i=0;i<bs.length;i++)for(let j=i+1;j<bs.length;j++){const pair=bs[i]+bs[j];for(const [k,ps]of Object.entries(pairs))if(ps.some(x=>x===pair||x===[...pair].reverse().join('')))out.push(`${names[i]}${bs[i]} · ${names[j]}${bs[j]}：${k}`);if(bs[i]===bs[j]&&'辰午酉亥'.includes(bs[i]))out.push(`${names[i]}${names[j]}支${bs[i]}：自刑形态`);}
 for(const [k,gs]of Object.entries({三合:['申子辰','亥卯未','寅午戌','巳酉丑'],三会:['寅卯辰','巳午未','申酉戌','亥子丑']}))for(const g of gs)if([...g].every(b=>bs.includes(b)))out.push(`${g}：${k}齐见`);
 return out;
}
function chartData(pillars,extra={}){
 const day=pillars[2][0],count=Object.fromEntries([...'木火土金水'].map(e=>[e,0]));
 const columns=pillars.map((p,i)=>{if(!p)return null;count[stemElement(p[0])]++;count[ZE[ZHI.indexOf(p[1])]]++;const hide=LunarUtil.ZHI_HIDE_GAN[p[1]];return {pillar:p,gan:p[0],zhi:p[1],element:stemElement(p[0]),god:i===2?'日主':tenGod(day,p[0]),hidden:hide.map(g=>({gan:g,god:tenGod(day,g),exposed:pillars.some(x=>x?.[0]===g),root:g===day})),nayin:LunarUtil.NAYIN[p],xunkong:LunarUtil.getXunKong(p)};});
 const month=columns[1],base=month.hidden[0],roots=columns.flatMap((c,i)=>c?c.hidden.filter(h=>h.root).map(()=>['年','月','日','时'][i]+c.zhi):[]);
 return {pillars,columns,day,element:stemElement(day),count,roots,monthBase:base,pattern:base.god,tiaohou:TIAOHOU[day][month.zhi],relations:branchRelations(pillars),...extra};
}
export function manualChart(values){if(values.length!==4||!values.slice(0,3).every(validPillar)||(values[3]&&!validPillar(values[3])))throw Error('请按年、月、日、时填写合法干支，例如「庚午」。时柱可留空。');return chartData(values.map(x=>x||null),{manual:true,unknown:!values[3],luck:null});}
export function birthChart({date,time,unknown=false,gender=''}){
 const c=parseCivil(date,unknown?'12:00':time),solar=Solar.fromYmdHms(c.y,c.m,c.day,c.h,c.min,0),lunar=solar.getLunar(),ec=lunar.getEightChar();ec.setSect(2);
 const pillars=[ec.getYear(),ec.getMonth(),ec.getDay(),unknown?null:ec.getTime()];let luck=null;
 if(!unknown&&['0','1'].includes(String(gender))&&gender!==''){const yun=ec.getYun(Number(gender),2);luck={forward:yun.isForward(),start:yun.getStartSolar().toYmdHms(),offset:`${yun.getStartYear()} 年 ${yun.getStartMonth()} 月 ${yun.getStartDay()} 日`,cycles:yun.getDaYun(9).filter(d=>d.getGanZhi()).map(d=>({pillar:d.getGanZhi(),start:d.getStartYear(),end:d.getEndYear(),age:d.getStartAge()}))};}
 return chartData(pillars,{date,time:unknown?'时辰未知':time,unknown,manual:false,luck,lunar:lunar.toString(),dishi:[ec.getYearDiShi(),ec.getMonthDiShi(),ec.getDayDiShi(),unknown?'':ec.getTimeDiShi()]});
}

export const TOPICS=[
 {id:'career',name:'事业与学业',words:['工作','事业','职业','升职','学业','考试','学习','读书','考研'],lessons:['foundation','pattern','career']},
 {id:'wealth',name:'财富观念',words:['财','钱','投资','收入','生意','创业'],lessons:['foundation','pattern','wealth']},
 {id:'relationship',name:'婚恋与家庭',words:['婚','恋','感情','伴侣','家庭','父母','子女','六亲'],lessons:['foundation','relationships','images']},
 {id:'character',name:'性情与修习',words:['性格','性情','修行','修习','情绪','身心','健康','睡眠','焦虑'],lessons:['foundation','balance','images']},
 {id:'timing',name:'岁运与变化',words:['运','流年','今年','明年','时候','时机','变化'],lessons:['foundation','balance','timing']}
];
export function matchTopics(question='',selected='auto'){if(selected!=='auto'){const t=TOPICS.find(x=>x.id===selected);return t?[{...t,matched:[]}]:[];}const s=question.slice(0,600);return TOPICS.filter(t=>t.words.some(w=>s.includes(w))).map(t=>({...t,matched:t.words.filter(w=>s.includes(w))}));}

export const TRIGRAMS=[
 ['乾','天','金',[1,1,1]],['兑','泽','金',[1,1,0]],['离','火','火',[1,0,1]],['震','雷','木',[1,0,0]],['巽','风','木',[0,1,1]],['坎','水','水',[0,1,0]],['艮','山','土',[0,0,1]],['坤','地','土',[0,0,0]]
].map(([name,image,element,lines],i)=>({name,image,element,lines,n:i+1}));
const HEX=[
 [[1,'乾为天'],[10,'天泽履'],[13,'天火同人'],[25,'天雷无妄'],[44,'天风姤'],[6,'天水讼'],[33,'天山遁'],[12,'天地否']],
 [[43,'泽天夬'],[58,'兑为泽'],[49,'泽火革'],[17,'泽雷随'],[28,'泽风大过'],[47,'泽水困'],[31,'泽山咸'],[45,'泽地萃']],
 [[14,'火天大有'],[38,'火泽睽'],[30,'离为火'],[21,'火雷噬嗑'],[50,'火风鼎'],[64,'火水未济'],[56,'火山旅'],[35,'火地晋']],
 [[34,'雷天大壮'],[54,'雷泽归妹'],[55,'雷火丰'],[51,'震为雷'],[32,'雷风恒'],[40,'雷水解'],[62,'雷山小过'],[16,'雷地豫']],
 [[9,'风天小畜'],[61,'风泽中孚'],[37,'风火家人'],[42,'风雷益'],[57,'巽为风'],[59,'风水涣'],[53,'风山渐'],[20,'风地观']],
 [[5,'水天需'],[60,'水泽节'],[63,'水火既济'],[3,'水雷屯'],[48,'水风井'],[29,'坎为水'],[39,'水山蹇'],[8,'水地比']],
 [[26,'山天大畜'],[41,'山泽损'],[22,'山火贲'],[27,'山雷颐'],[18,'山风蛊'],[4,'山水蒙'],[52,'艮为山'],[23,'山地剥']],
 [[11,'地天泰'],[19,'地泽临'],[36,'地火明夷'],[24,'地雷复'],[46,'地风升'],[7,'地水师'],[15,'地山谦'],[2,'坤为地']]
];
export const rem=(n,d)=>n%d||d;
function tri(lines){return TRIGRAMS.find(t=>t.lines.every((v,i)=>v===lines[i]));}
export function hexagram(lines){const lower=tri(lines.slice(0,3)),upper=tri(lines.slice(3)),[number,name]=HEX[upper.n-1][lower.n-1];return {lines:[...lines],upper,lower,number,name};}
export function elementRelation(body,use){if(body===use)return '体用比和';if(SHENG[use]===body)return '用生体';if(SHENG[body]===use)return '体生用';if(KE[use]===body)return '用克体';return '体克用';}
export function plumFromSums(upperSum,lowerSum,movingSum){
 if(![upperSum,lowerSum,movingSum].every(n=>Number.isSafeInteger(n)&&n>0&&n<=1e9))throw Error('请使用 1—1,000,000,000 内的正整数。');
 const upper=TRIGRAMS[rem(upperSum,8)-1],lower=TRIGRAMS[rem(lowerSum,8)-1],moving=rem(movingSum,6),base=hexagram([...lower.lines,...upper.lines]),lines=[...base.lines];lines[moving-1]=1-lines[moving-1];
 const change=hexagram(lines),mutual=hexagram([...base.lines.slice(1,4),...base.lines.slice(2,5)]),body=moving<=3?upper:lower,use=moving<=3?lower:upper,changedUse=moving<=3?change.lower:change.upper;
 return {upperSum,lowerSum,movingSum,moving,base,mutual,change,body,use,changedUse,relation:elementRelation(body.element,use.element),changedRelation:elementRelation(body.element,changedUse.element)};
}
export function plumNumbers(a,b){if(a>1e8||b>1e8)throw Error('课堂两数请填写 1—100,000,000 的正整数。');return {...plumFromSums(a,b,a+b),mode:'numbers'};}
export function plumCalendar(date,time){const c=parseCivil(date,time),l=Solar.fromYmdHms(c.y,c.m,c.day,c.h,c.min,0).getLunar(),year=l.getYearZhiIndex()+1,month=Math.abs(l.getMonth()),day=l.getDay(),hour=Math.floor((c.h+1)/2)%12+1,sum=year+month+day;return {...plumFromSums(sum,sum+hour,sum+hour),mode:'time',year,month,day,hour,lunar:l.toString(),yearBranch:ZHI[year-1],hourBranch:ZHI[hour-1]};}
export function plumClassic(){return {...plumFromSums(5+12+17,5+12+17+9,5+12+17+9),mode:'classic',year:5,month:12,day:17,hour:9,yearBranch:'辰',hourBranch:'申'};}
