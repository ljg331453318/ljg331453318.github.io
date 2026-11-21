import {prepareProgress,progressStorage,createCommunity} from './community.js?v=20261121-learning';
await prepareProgress();
import {initWorld,world} from './scene.js';
import {tracks,articles} from './content.js';
import {createTempleGame} from './game.js?v=20261121-learning';
import {createStudy} from './study.js?v=20261121-learning';
import {createSubmissionPicker} from './submission.js?v=20261121-learning';
let game=null,study=null;
const $=s=>document.querySelector(s),icon=n=>`<svg aria-hidden="true"><use href="#i-${n}"/></svg>`;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data;const initial={xp:0,minutes:0,sessions:0,favorites:[],bookmarks:[],read:[],posts:[],likes:[],name:'云游道友',incenseDays:[],sound:false,night:false};
try{data={...initial,...JSON.parse(progressStorage.getItem('cloud-dao-v1')||'{}')};}catch{data={...initial};}
function save(){try{progressStorage.setItem('cloud-dao-v1',JSON.stringify(data));}catch{toast('当前浏览器未能保存这份记录。');}updateJourney();}
function updateJourney(){const stage=data.xp>=300?'静山境':data.xp>=100?'青林境':'初心境';$('#journey>span:last-child').innerHTML=stage+`<small id="journey-points">${data.xp} 点静心值</small>`;}
let toastTimeout;function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('#toast').classList.remove('visible'),4500);}
function panel(html){$('#panel').classList.remove('game-panel','study-panel','submission-panel');$('#panel-content').innerHTML=html;$('#panel').scrollTop=0;if(!$('#panel').open)$('#panel').showModal();}
function closePanel(){$('#panel').close();}
$('#close-panel').addEventListener('click',closePanel);$('#panel').addEventListener('click',e=>{if(e.target===$('#panel')){const r=$('#panel').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closePanel();}});
const places={study:['问易台','观其象，明其理；学一页，推一卦。'],wander:['云栖庭院','山中无所求，且自在停留。'],hall:['云栖殿','为心中珍重之事，留一点空处。'],meditate:['静坐台','安然落座，让呼吸自在流转。'],incense:['上香庭','一念随烟起，山中自有回响。'],bell:['山钟','听一声钟响，直至余音散尽。'],library:['藏经阁','读古人之言，照今日之心。'],music:['听松亭','弦声、风声，与音符间的留白。'],journal:['寄语树','留一句心语，寄于枝叶之间。'],fortune:['求签阁','一段心语，静候于竹签之间。'],alchemy:['炼丹院','炉火微起，万般可能。'],gate:['月门','一印转动，邻印相随。'],leaf:['听风松林','采一枝嫩叶，收一点山意。'],dew:['莲池','云种生机，始于一滴莲露。'],moss:['月华小圃','月门深处，有微光静候。'],retreat:['我的洞天','把沿途的小小发现，养成自己的天地。']};
function location(action){const p=places[action]||places.wander;$('#location-name').textContent=p[0];$('#location-description').textContent=p[1];document.querySelectorAll('.action-dock button').forEach(b=>b.classList.toggle('active',b.dataset.action===action));}
let session={active:false,running:false,total:300,remaining:300,end:0};
function cancelPractice(notify=true){if(!session.active)return;session.active=false;session.running=false;$('#practice-overlay').hidden=true;world.meditate(false);if(notify)toast('把这份清静带走，想来时再回来。');}
function action(which){if(session.active&&which!=='meditate')cancelPractice(false);if(study?.visit(which))return;if(game?.visit(which))return;world.go(which);
 if(which==='meditate')openMeditation();
 if(which==='music')openMusic();
 if(which==='library')openLibrary();
 if(which==='journal')openJournal();
 if(which==='hall')openHall();
 if(which==='incense'){closePanel();world.incense();sound.incense();const day=new Date().toLocaleDateString('en-CA');if(!data.incenseDays.includes(day)){data.incenseDays.push(day);data.xp+=2;save();}toast('清香已燃，让一份心意随烟轻起。');}
 if(which==='bell'){closePanel();world.ring();sound.bell();toast('一声钟响，为纷繁思绪留一点空隙。');}
 if(which==='wander')closePanel();
}
$('#enter').addEventListener('click',()=>{world.enter();toast('点击地标即可前往，也可点击庭院地面，自在漫步。');});
$('#home').addEventListener('click',e=>{e.preventDefault();action('wander');});
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.action)action(b.dataset.action);
 if(b.dataset.place)action(b.dataset.place);
 if(b.dataset.minutes){session.total=Number(b.dataset.minutes)*60;openMeditation();}
 if(b.dataset.track!==undefined){sound.select(Number(b.dataset.track));openMusic();}
 if(b.dataset.article)openArticle(b.dataset.article);
 if(b.dataset.read){const id=b.dataset.read;if(!data.read.includes(id)){data.read.push(id);data.xp+=10;save();toast('一页读罢，已积累十点静心值。');}openArticle(id);}
 if(b.dataset.bookmark){const id=b.dataset.bookmark;data.bookmarks=data.bookmarks.includes(id)?data.bookmarks.filter(v=>v!==id):[...data.bookmarks,id];save();openArticle(id);}
 if(b.dataset.journalTab)openJournal(b.dataset.journalTab);
 if(b.id==='start-practice')startPractice();
 if(b.id==='library-back')openLibrary();
 if(b.id==='visit-library')action('library');
 if(b.id==='visit-meditation')action('meditate');
 if(b.id==='help-map')openMap();
});
function openHall(){panel(`<div class="panel-overline">云栖观 · 云栖殿</div><h2>山门常开，随时可来。</h2><p>且将日常琐事暂放一旁。庭中漫步，拈香寄意，或安然落座，不必急着抵达哪里。</p><p>这里是一方取意于道家文化的虚构山境。修习之路记录你的参与与停留，不代表真实的修行品阶。</p><div class="panel-actions"><button class="panel-button" id="visit-meditation">${icon('meditate')}寻一处安坐</button><button class="panel-button outline" id="visit-library">${icon('book')}翻阅一篇文章</button></div><p class="panel-note">此刻游历的是属于你自己的山境。点击「道友同游」进入公共庭院，与在线道友交流。</p>`);}
function openMeditation(){if(session.active){closePanel();return;}panel(`<div class="panel-overline">静坐台 · 暂歇片刻</div><h2>且放下诸事，<br>安坐片刻。</h2><p>在台上寻一处坐下，以舒适的姿势自然呼吸，听听身边的风与声。</p><div class="duration-choices" aria-label="静坐时长">${[1,5,10,15].map(m=>`<button data-minutes="${m}" class="${session.total===m*60?'active':''}" aria-pressed="${session.total===m*60}">${m} 分钟</button>`).join('')}</div><button class="panel-button" id="start-practice">${icon('meditate')}开始静坐</button><p class="panel-note">无需追求特定状态。完成一次静坐后，每分钟可积累五点静心值。</p>`);}
function startPractice(){session.active=true;session.running=true;session.remaining=session.total;session.end=Date.now()+session.total*1000;closePanel();world.meditate(true);$('#practice-overlay').hidden=false;$('#practice-pause').textContent='暂停';$('#practice-time').textContent=format(session.remaining);$('#practice-phrase').textContent='让呼吸，自有节律。';}
function format(s){s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
$('#practice-pause').addEventListener('click',()=>{if(session.running){session.remaining=Math.max(0,Math.ceil((session.end-Date.now())/1000));session.running=false;}else{session.end=Date.now()+session.remaining*1000;session.running=true;}$('#practice-pause').textContent=session.running?'暂停':'继续';$('#practice-phrase').textContent=session.running?'让呼吸，自有节律。':'不必着急，山一直在。';});
$('#practice-end').addEventListener('click',()=>{cancelPractice();world.go('wander');});
setInterval(()=>{if(!session.active||!session.running)return;session.remaining=Math.max(0,Math.ceil((session.end-Date.now())/1000));$('#practice-time').textContent=format(session.remaining);if(session.remaining===0){const minutes=session.total/60;session.active=false;session.running=false;data.sessions++;data.minutes+=minutes;data.xp+=minutes*5;save();$('#practice-overlay').hidden=true;world.meditate(false);sound.bell(.4);toast(`片刻清静，已积累 ${minutes*5} 点静心值。`);}},250);
function openLibrary(){panel(`<div class="panel-overline">藏经阁 · 一页观心</div><h2>慢翻一页，静观一心。</h2><p>选一篇文章，让其中一个小小的念头，陪你走一段路。</p><button class="library-book" data-action="study"><span class="book-spine">易</span><span><strong>易学研习 · 问易台</strong><small>八字排盘、按需课程与梅花易数</small></span></button>${articles.map(a=>`<button class="library-book" data-article="${a.id}"><span class="book-spine">${a.character}</span><span><strong>${a.title}</strong><small>${a.minutes} 分钟阅读${data.read.includes(a.id)?' · 已读':''}${data.bookmarks.includes(a.id)?' · 已收藏':''}</small></span></button>`).join('')}<p class="panel-note">这里收录入门短文与日常观心练习，涉及经典的文章附有出处，便于进一步阅读。</p>`);}
function openArticle(id){const a=articles.find(a=>a.id===id);if(!a)return;panel(`<button class="panel-back" id="library-back">返回藏经阁</button><div class="panel-overline">${a.category} · ${a.minutes} 分钟阅读</div><h2>${a.title}</h2>${a.quote?`<div class="article-quote"><span lang="zh">${a.quote}</span><br>${a.quoteEnglish}</div>`:''}${a.content}${a.source?`<p><a href="${a.source}" class="source-link" target="_blank" rel="noopener noreferrer">${a.sourceLabel}</a></p>`:''}<div class="panel-actions"><button class="panel-button" data-read="${id}" ${data.read.includes(id)?'disabled':''}>${icon('check')}${data.read.includes(id)?'已读完':'读完此篇'}</button><button class="panel-button outline" data-bookmark="${id}">${data.bookmarks.includes(id)?'已收藏':'收藏此篇'}</button></div>`);}
function openJournal(tab='write'){panel(`<div class="panel-overline">寄语树 · 枝叶寄心</div><h2>留一份心意，<br>寄于枝叶之间。</h2><p>有些片刻值得珍藏。留几句话，赠予明日再来此处的自己。</p><div class="journal-tabs"><button data-journal-tab="write" class="${tab==='write'?'active':''}">留句心语</button><button data-journal-tab="read" class="${tab==='read'?'active':''}">我的心语 (${data.posts.length})</button></div>${tab==='write'?`<form id="reflection-form"><label class="field" for="reflection-title">为此刻起个名字</label><input type="text" name="title" id="reflection-title" required maxlength="100" placeholder="山中让我想起……"><label class="field" for="reflection-body">此刻的心语</label><textarea name="body" id="reflection-body" required maxlength="3000" placeholder="今天，我留意到……"></textarea><div class="panel-actions"><button class="panel-button" type="submit">${icon('leaf')}寄于树间</button></div></form>`:data.posts.length?data.posts.map(p=>`<article class="journal-entry"><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p><small>${new Date(p.date).toLocaleDateString('zh-CN',{month:'short',day:'numeric',year:'numeric'})}</small></article>`).join(''):'<p>枝叶静候。一句简单的话，也可以成为第一份心语。</p>'}<p class="panel-note">心语仅保存在本设备，属于你的私人记录。公共交流请使用「道友同游」聊天栏。</p>`);}
document.addEventListener('submit',e=>{if(e.target.id==='reflection-form'){e.preventDefault();const f=new FormData(e.target),title=String(f.get('title')).trim(),body=String(f.get('body')).trim();if(!title||!body){toast('请为这份心语写上标题，再留几句话。');return;}data.posts.unshift({id:'post-'+Date.now(),title,body,name:data.name,topic:'日常修习',mine:true,date:new Date().toISOString(),likes:0});save();openJournal('read');toast('心语已寄于枝叶之间，保存在本设备。');}});
function openJourney(){panel(`<div class="panel-overline">修习之路 · 点滴积累</div><h2>静心片刻，<br>自有生长。</h2><p>山不催人。这条虚构的修习之路，会随你的静坐、阅读与重访，一点点延展。</p><div class="journey-stats"><div><strong>${data.xp}</strong><small>静心值</small></div><div><strong>${data.minutes}</strong><small>静坐分钟</small></div><div><strong>${data.read.length}</strong><small>阅读篇数</small></div></div><div class="journey-path"><span class="${data.xp<100?'active':''}">初心境<small>从此刻开始 · 0 点静心值</small></span><span class="${data.xp>=100&&data.xp<300?'active':''}">青林境<small>携好奇再来 · 100 点静心值</small></span><span class="${data.xp>=300?'active':''}">静山境<small>静中仍有生机 · 300 点静心值</small></span></div><div class="panel-actions"><button class="panel-button" id="visit-meditation">开始静坐</button></div><p class="panel-note">静心值是游历参与的趣味记录，并非真实修行成就。完成静坐后每分钟积累五点，每篇首次读完的文章积累十点，进度保存在本设备。</p>`);}
$('#journey').addEventListener('click',openJourney);
function openHelp(){panel(`<div class="panel-overline">入山游历指南</div><h2>循着好奇，<br>自在寻幽。</h2><p>这是一方可以漫游的立体山境。环顾四周，走入庭院，试着触碰途中遇见的物件。</p><div class="controls-list"><strong>点击地面</strong><span>走到点击的位置</span><strong>拖动场景</strong><span>环顾山中景色</span><strong>滚动缩放</strong><span>拉近或拉远视角</span><strong>W A S D</strong><span>在庭院中行走</span><strong>点击地标</strong><span>前往亭阁或参与活动</span><strong>日月图标</strong><span>切换清晨与月夜</span></div><div class="panel-actions"><button class="panel-button" id="help-map">${icon('map')}看看山中各处</button></div><p class="panel-note">云道是一方取意于道家文化的当代虚构山境。声景为原创合成环境音乐，并非传统科仪录音。游历与心语保存在本设备，场景中没有伪装成在线访客的角色。</p>`);}
function openMap(){panel(`<div class="panel-overline">云栖山 · 山中小径</div><h2>择一径，向清静处。</h2><div class="map-grid">${[['study','book','问易台 · 易学研习'],['fortune','fortune','求签阁'],['alchemy','flame','丹炉'],['gate','gate','月门'],['retreat','home','我的洞天'],['leaf','leaf','听风叶林'],['dew','leaf','莲池'],['meditate','meditate','静坐台'],['library','book','藏经阁'],['music','music','听松亭'],['bell','bell','山钟'],['journal','leaf','寄语树']].map(([a,i,n])=>`<button data-place="${a}">${icon(i)}${n}</button>`).join('')}</div>`);}
$('#help').addEventListener('click',openHelp);
$('#day-toggle').addEventListener('click',()=>{data.night=!data.night;world.setNight(data.night);updateDay();save();});
function updateDay(){$('#day-toggle').innerHTML=icon(data.night?'moon':'sun');$('#day-toggle').setAttribute('aria-label',data.night?'切换至清晨':'切换至月夜');$('#time-label').innerHTML=data.night?'月下时分<small>灯火微明 · 月夜</small>':'清晨时分<small>晨雾轻笼 · 清晨</small>';}
// Original pentatonic soundscapes, made locally with Web Audio.
const sound={ctx:null,master:null,ambient:null,playing:false,selected:0,volume:.45,nodes:[],interval:null,step:0,
 init(){if(this.ctx)return;this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=this.volume*.38;const limiter=this.ctx.createDynamicsCompressor();limiter.threshold.value=-20;this.master.connect(limiter);limiter.connect(this.ctx.destination);},
 tone(freq,bell=false,gain=.16,delay=0){this.init();this.ctx.resume();const when=this.ctx.currentTime+delay,g=this.ctx.createGain();g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(gain,when+.015);g.gain.exponentialRampToValueAtTime(.0001,when+(bell?8:4));g.connect(this.master);const harmonics=bell?[1,2.76,5.4]:[1,2,3];for(let i=0;i<harmonics.length;i++){const o=this.ctx.createOscillator(),hg=this.ctx.createGain();o.type='sine';o.frequency.value=freq*harmonics[i];hg.gain.value=1/(i*3+1);o.connect(hg);hg.connect(g);o.start(when);o.stop(when+9);this.nodes.push(o);o.onended=()=>{this.nodes=this.nodes.filter(n=>n!==o);o.disconnect();hg.disconnect();};}setTimeout(()=>g.disconnect(),10000);},
 wind(){const buffer=this.ctx.createBuffer(1,this.ctx.sampleRate*4,this.ctx.sampleRate),channel=buffer.getChannelData(0);let prev=0;for(let i=0;i<channel.length;i++){const v=Math.random()*2-1;prev=(prev+v*.02)/1.02;channel[i]=prev*3;}const src=this.ctx.createBufferSource();src.buffer=buffer;src.loop=true;const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=this.selected===1?1300:500;const gain=this.ctx.createGain();gain.gain.value=this.selected===1?.25:.13;src.connect(filter);filter.connect(gain);gain.connect(this.master);src.start();this.ambient=src;},
 start(){try{this.init();this.ctx.resume();this.stop(false);this.playing=true;this.wind();this.step=0;const play=()=>{const t=tracks[this.selected],scale=[0,3,5,7,10,12,15,7,5,3],degree=scale[(this.step*t.seed+Math.floor(this.step/4))%scale.length];this.tone(t.root*2**(degree/12),this.selected===2,this.selected===2?.11:.14);this.step++;};play();this.interval=setInterval(play,this.selected===2?6500:3500);updateSound();}catch{toast('当前浏览器暂时无法播放声音。');}},
 stop(update=true){clearInterval(this.interval);if(this.ambient){try{this.ambient.stop();}catch{}this.ambient=null;}for(const n of this.nodes){try{n.stop();}catch{}}this.nodes=[];this.playing=false;if(update)updateSound();},
 select(i){if(i===this.selected&&this.playing)this.stop();else{this.selected=i;this.start();}},
 bell(gain=.8){try{this.init();this.tone(164.81,true,.42*gain);this.tone(329.62,true,.12*gain,.06);}catch{}},
 incense(){if(this.playing)this.tone(440,false,.05);}
};
function updateSound(){document.body.classList.toggle('sound-on',sound.playing);$('#sound-toggle').innerHTML=icon(sound.playing?'volume':'mute');$('#sound-toggle').setAttribute('aria-label',sound.playing?'关闭山间声景':'开启山间声景');$('#audio-label').textContent=sound.playing?tracks[sound.selected].title:'山静候，风亦听';}
function openMusic(){panel(`<div class="panel-overline">听松亭 · 山间声景</div><h2>听弦外之音，<br>留心间余白。</h2><p>一缕乐声，随山风轻轻送来。</p>${tracks.map((t,i)=>`<button class="music-choice ${sound.playing&&sound.selected===i?'active':''}" data-track="${i}" aria-pressed="${sound.playing&&sound.selected===i}"><span><strong>${t.title}</strong><small>${t.subtitle}</small></span><span class="disc">${icon(sound.playing&&sound.selected===i?'pause':'play')}</span></button>`).join('')}<label class="volume-control">${icon('volume')}<span>音量</span><input type="range" id="music-volume" min="0" max="100" value="${sound.volume*100}" aria-label="声景音量"></label><p class="panel-note">以拨弦、微风与钟声意象创作的当代合成声景，取意自然，并非传统道教科仪录音。</p>`);}
document.addEventListener('input',e=>{if(e.target.id==='music-volume'){sound.volume=Number(e.target.value)/100;if(sound.master)sound.master.gain.setTargetAtTime(sound.volume*.38,sound.ctx.currentTime,.1);}});
$('#sound-toggle').addEventListener('click',()=>sound.playing?sound.stop():sound.start());$('#music-open').addEventListener('click',()=>action('music'));
updateJourney();updateDay();updateSound();
try{initWorld({action,location,move:()=>{if(session.active)cancelPractice(false);},ready:()=>{world.setNight(data.night);requestAnimationFrame(()=>{$('#loading').classList.add('ready');$('#loading').setAttribute('aria-hidden','true');});}});}catch(error){$('#loading').classList.add('error');$('#loading').innerHTML='<span class="loading-mark">云道</span><p>这方山境需要 WebGL 才能显现。请开启浏览器硬件加速，或换用支持 WebGL 的浏览器。</p><button id="retry-world">重新进入</button>';$('#retry-world').addEventListener('click',()=>window.location.reload());console.error('Unable to create the sanctuary:',error);}

if(!document.querySelector('.loading.error')){game=createTempleGame({world,panel,closePanel,toast,icon,esc,action,reward:n=>{data.xp+=n;save();}});game.sync();}

study=createStudy({world,panel,esc,toast});

createCommunity({world,panel,esc,toast});

createSubmissionPicker({panel,esc,beforeOpen:()=>cancelPractice(false)});
