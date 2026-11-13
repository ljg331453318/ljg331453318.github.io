const id = Number(document.body.dataset.demo);
const root = document.getElementById('lab-root');
const colors = ['#1a5d86','#b66b35','#20866f','#795b9d','#9c4f55'];
const rng = seed => { let x = (seed >>> 0) || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; }; };
const noise = r => (r()+r()+r()+r()+r()+r()-3)*1.414;
const xy = (values, name, color) => ({name,color,values});
const fmt = (value, digits=2) => Number(value).toFixed(digits);
const mean = values => values.reduce((a,b)=>a+b,0)/values.length;
const rmse = values => Math.sqrt(mean(values.map(v=>v*v)));
const dist = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const field = (key,label,type,value,extra={}) => ({key,label,type,value,...extra});

const settings = {
  1:{subtitle:'六轴 IMU 的采集、偏置校准、姿态解算与上位机曲线',scope:'地面姿态样机原理演示；无飞控闭环。六轴 IMU 不提供绝对航向。',fields:[field('motion','测试工况','select','往复转动',{options:['静态倾角','往复转动','短时偏航']}),field('bias','陀螺零偏 °/s','range',0.8,{min:0,max:3,step:0.1}),field('gain','加速度校正权重','range',0.03,{min:0,max:0.15,step:0.01}),field('seed','试验种子','number',23,{min:1,max:9999})]},
  2:{subtitle:'独立真值、GNSS 观测与 IMU 预测的平面定位对照',scope:'松组合 EKF 原理样机。使用合成真值评估；停车时不把 GNSS 航向作为可靠观测。',fields:[field('motion','车辆工况','select','转弯',{options:['直行','转弯','启停']}),field('gnss','GNSS 噪声标准差 m','range',2.2,{min:0.2,max:6,step:0.1}),field('outage','GNSS 中断时长 s','range',4,{min:0,max:15,step:1}),field('seed','试验种子','number',42,{min:1,max:9999})]},
  3:{subtitle:'卫星拒止期间仅前向推算，恢复观测后继续更新',scope:'所有误差使用独立合成真值计算；拒止时不读取未来 GNSS 观测。',fields:[field('motion','运动模式','select','匀速转弯',{options:['直行','匀速转弯','启停']}),field('duration','拒止时长 s','select','10',{options:['5','10','20']}),field('bias','陀螺零偏 °/s','range',0.4,{min:0,max:2,step:0.1}),field('heading','初始航向误差 °','range',1,{min:0,max:8,step:0.5}),field('seed','试验种子','number',73,{min:1,max:9999})]},
  4:{subtitle:'预测新息、卡方门限与连续超限确认',scope:'只检测二维位置观测异常；定位异常不等同于证明 GNSS 欺骗。缺测按超时处理。',fields:[field('anomaly','注入类型','select','位置突变',{options:['正常','位置突变','缓慢漂移','连续缺测']}),field('magnitude','偏置幅度 m / 漂移幅度','range',6,{min:0,max:15,step:0.5}),field('alpha','单次虚警概率 α','select','0.01',{options:['0.05','0.01','0.001']}),field('confirm','连续确认次数','select','2',{options:['1','2','3']}),field('seed','试验种子','number',117,{min:1,max:9999})]},
  5:{subtitle:'四基站 TWR 测距、二维定位与 IMU 辅助预测',scope:'演示距离观测的非线性定位；基站坐标已知。遮挡产生偏差，不称为有效测距。',fields:[field('geometry','基站布局','select','四角布局',{options:['四角布局','近共线布局']}),field('occlusion','遮挡程度','range',0.1,{min:0,max:1,step:0.05}),field('ranging','测距噪声 m','range',0.2,{min:0.05,max:1.2,step:0.05}),field('seed','试验种子','number',31,{min:1,max:9999})]},
  6:{subtitle:'三辆车的联合 EKF、相对测距与通信丢包',scope:'保留绝对 GNSS 约束和车辆交叉协方差；相对距离不等于绝对位置真值。',fields:[field('scenario','交通场景','select','转弯',{options:['直行','会车','转弯']}),field('loss','测距丢包率','select','10',{options:['0','10','30']}),field('outage','单车 GNSS 中断','select','开启',{options:['关闭','开启']}),field('seed','试验种子','number',52,{min:1,max:9999})]},
  7:{subtitle:'二自由度单轨模型、横摆观测与侧向状态 KF',scope:'限定中等非零车速、小转角与线性轮胎条件；低速近零时不计算侧偏角。',fields:[field('steer','转向工况','select','正弦转向',{options:['阶跃转向','正弦转向','模拟变道']}),field('speed','纵向速度 m/s','select','10',{options:['5','10','15']}),field('stiffness','侧偏刚度失配 %','range',0,{min:-20,max:20,step:5}),field('seed','试验种子','number',87,{min:1,max:9999})]},
  8:{subtitle:'匀速、匀加速和协调转弯候选模型的短时预测',scope:'根据当前与过去观测形成候选；真值只用于事后误差评估，不称为完整 IMM。',fields:[field('motion','测试机动','select','协调转弯',{options:['匀速','匀加速','协调转弯','机动切换']}),field('horizon','预测时域 s','select','3',{options:['1','2','3']}),field('uncertainty','观测噪声 m','range',0.8,{min:0.1,max:3,step:0.1}),field('seed','试验种子','number',64,{min:1,max:9999})]},
  9:{subtitle:'单图扫描、船舶框选与批量处理界面示意',scope:'使用合成遥感样例演示检测流程。此处是图像处理原型，不能替代训练后的船舶检测模型或独立测试集 AP50。',fields:[field('scene','影像场景','select','近岸',{options:['开阔水域','近岸','港区','无船']}),field('size','输入尺寸 px','select','512',{options:['512','768']}),field('confidence','置信度阈值','range',0.55,{min:0.1,max:0.95,step:0.05}),field('seed','样例种子','number',12,{min:1,max:9999})]},
  10:{subtitle:'加速度峰值计步、步长标定、航向融合与轨迹推算',scope:'固定携带方式；使用合成加速度/航向序列。无连续真值时只核对检查点和终点。“航向偏置”选项表示磁航向受扰的简化示意。',fields:[field('route','步行路线','select','矩形闭环',{options:['直线','矩形闭环','含转弯']}),field('stride','标定步长 m','range',0.7,{min:0.4,max:1,step:0.02}),field('threshold','计步峰值阈值','range',1.15,{min:0.4,max:2,step:0.05}),field('magnetic','航向偏置','select','关闭',{options:['关闭','开启']}),field('seed','试验种子','number',29,{min:1,max:9999})]}
};

function seriesChart(title,series,note='',wide=false){return {title,series,note,wide,type:'lines'};}
function customChart(title,draw,note='',wide=false){return {title,draw,note,wide,type:'custom'};}
function toPoints(a){return a.map((y,i)=>[i,y]);}

function sim1(p){
  const r=rng(+p.seed),n=500,dt=.01,roll=[],pitch=[],yaw=[],gyroRoll=[],fusedRoll=[],fusedPitch=[],fusedYaw=[],raw=[];
  let gr=0,q=[1,0,0,0],prevR=0,prevP=0,prevY=0;
  for(let i=0;i<n;i++){
    const t=i*dt,truthR=p.motion==='静态倾角'?18:p.motion==='短时偏航'?5:21*Math.sin(1.7*t),truthP=p.motion==='静态倾角'?-8:9*Math.cos(1.1*t),truthY=p.motion==='短时偏航'?28*Math.sin(.7*t):0;
    const gR=(truthR-prevR)/dt+(+p.bias)+noise(r)*.35,gP=(truthP-prevP)/dt+(+p.bias)*.6+noise(r)*.3,gY=(truthY-prevY)/dt+(+p.bias)*.5+noise(r)*.25;
    const rd=truthR*Math.PI/180,pd=truthP*Math.PI/180,dynamic=p.motion==='往复转动'?.11*Math.sin(3*t):0;
    let ax=-Math.sin(pd)+dynamic+noise(r)*.025,ay=Math.sin(rd)*Math.cos(pd)+noise(r)*.025,az=Math.cos(rd)*Math.cos(pd)+noise(r)*.025;
    const mag=Math.hypot(ax,ay,az),weight=Math.abs(mag-1)>.08?.15:1;ax/=mag;ay/=mag;az/=mag;
    const [w,x,y,z]=q,vx=2*(x*z-w*y),vy=2*(w*x+y*z),vz=w*w-x*x-y*y+z*z;
    const ex=ay*vz-az*vy,ey=az*vx-ax*vz,ez=ax*vy-ay*vx,kp=(+p.gain)*80*weight;
    const gx=(gR*Math.PI/180)+kp*ex,gy=(gP*Math.PI/180)+kp*ey,gz=(gY*Math.PI/180)+kp*ez;
    q=[w+.5*(-x*gx-y*gy-z*gz)*dt,x+.5*(w*gx+y*gz-z*gy)*dt,y+.5*(w*gy-x*gz+z*gx)*dt,z+.5*(w*gz+x*gy-y*gx)*dt];const norm=Math.hypot(...q);q=q.map(v=>v/norm);
    const [a,b,c,d]=q,fr=Math.atan2(2*(a*b+c*d),1-2*(b*b+c*c))*180/Math.PI,fp=Math.asin(clamp(2*(a*c-d*b),-1,1))*180/Math.PI,fy=Math.atan2(2*(a*d+b*c),1-2*(c*c+d*d))*180/Math.PI;
    gr+=gR*dt;roll.push(truthR);pitch.push(truthP);yaw.push(truthY);gyroRoll.push(gr);fusedRoll.push(fr);fusedPitch.push(fp);fusedYaw.push(fy);raw.push([fmt(t),fmt(truthR),fmt(gR),fmt(ax),fmt(ay),fmt(az),fmt(fr),fmt(fp),fmt(fy)]);prevR=truthR;prevP=truthP;prevY=truthY;
  }
  const e=roll.map((v,i)=>v-fusedRoll[i]),ep=pitch.map((v,i)=>v-fusedPitch[i]);
  const attitude=customChart('三维姿态与坐标轴',(ctx,w,h,progress)=>{
    const sample=Math.min(fusedRoll.length-1,Math.floor(progress*(fusedRoll.length-1)));
    const phi=fusedRoll[sample]*Math.PI/180,theta=fusedPitch[sample]*Math.PI/180,psi=fusedYaw[sample]*Math.PI/180;
    const rotate=([x,y,z])=>{let X=x*Math.cos(psi)-y*Math.sin(psi),Y=x*Math.sin(psi)+y*Math.cos(psi);let Z=-X*Math.sin(theta)+z*Math.cos(theta);X=X*Math.cos(theta)+z*Math.sin(theta);return [X,Y*Math.cos(phi)-Z*Math.sin(phi),Y*Math.sin(phi)+Z*Math.cos(phi)];};
    const project=point=>{const [x,y,z]=rotate(point);return [w/2+(x-y)*1.35,h/2+(x+y)*.5-z*1.6];};
    const scale=Math.min(w/520,h/310)*1.25;
    const screen=point=>{const p=project(point);return [w/2+(p[0]-w/2)*scale,h/2+(p[1]-h/2)*scale];};
    const line=(a,b,color,width=8)=>{const A=screen(a),B=screen(b);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(...A);ctx.lineTo(...B);ctx.stroke();};
    const rotors=[[-74,-56,0],[74,-56,0],[-74,56,0],[74,56,0]];
    // Four-arm airframe, motor pods and propellers rotate with the estimated attitude.
    rotors.forEach((r,i)=>{line([0,0,0],r,i<2?'#64748b':'#94a3b8',11);const [x,y]=screen(r);ctx.fillStyle='#dbeafe';ctx.strokeStyle='#334155';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,19*scale,0,2*Math.PI);ctx.fill();ctx.stroke();ctx.strokeStyle=i%2?'#0f766e':'#2563eb';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,y,26*scale,4*scale,phi*.3,0,2*Math.PI);ctx.stroke();});
    const body=screen([0,0,0]);ctx.fillStyle='#1e3a5f';ctx.strokeStyle='#0f172a';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(body[0],body[1],24*scale,16*scale,psi*.15,0,2*Math.PI);ctx.fill();ctx.stroke();
    const nose=screen([0,-27,5]);ctx.fillStyle='#ef4444';ctx.beginPath();ctx.arc(nose[0],nose[1],4*scale,0,2*Math.PI);ctx.fill();
    ctx.fillStyle='#1d1d1f';ctx.font='600 15px -apple-system, sans-serif';ctx.fillText('四旋翼机体 · 姿态估计实时示意',22,30);
    ctx.fillStyle='#6e6e73';ctx.font='12px -apple-system, sans-serif';ctx.fillText(`横滚 ${fmt(fusedRoll[sample],1)}°   俯仰 ${fmt(fusedPitch[sample],1)}°   相对偏航 ${fmt(fusedYaw[sample],1)}°`,22,52);
  },'机体姿态由合成 IMU 数据驱动；这是姿态测量原理动画，不代表真实飞行器或飞控闭环。');
  return {metrics:[['横滚 RMSE',fmt(rmse(e))+'°'],['俯仰 RMSE',fmt(rmse(ep))+'°'],['采样率','100 Hz'],['纯陀螺末端误差',fmt(Math.abs(gyroRoll.at(-1)-roll.at(-1)))+'°']],charts:[seriesChart('横滚角：真值、Mahony 四元数估计与纯积分',[xy(toPoints(roll),'合成参考',colors[0]),xy(toPoints(fusedRoll),'Mahony',colors[2]),xy(toPoints(gyroRoll),'纯陀螺积分',colors[1])],'静态角度参考须由角度夹具独立提供。',true),attitude,seriesChart('俯仰角与相对偏航',[xy(toPoints(pitch),'参考俯仰',colors[0]),xy(toPoints(fusedPitch),'估计俯仰',colors[2]),xy(toPoints(fusedYaw),'相对偏航',colors[1])])],headers:['时间 s','参考横滚 °','角速度 °/s','加计 x g','加计 y g','加计 z g','估计横滚 °','估计俯仰 °','估计偏航 °'],rows:raw,explain:'以 100 Hz 对合成角速度作四元数积分和归一化，用重力方向反馈校正横滚与俯仰；非重力加速度较大时降低校正权重。真实样机仍须完成 I²C/SPI 采集、串口协议、角度夹具和端到端延迟验证。'};
}

function sim2(p){
  const r=rng(+p.seed),truth=[],gnss=[],est=[],err=[],speedTruth=[],speedEst=[],rows=[],dt=.2;
  let x=0,y=0,h=0,oldSpeed=0,s=[0,0,0,0],P=[[4,0,0,0],[0,4,0,0],[0,0,2,0],[0,0,0,.08]];
  const Q=[.015,.015,.07,.001];
  const update=(axis,z)=>{const S=P[axis][axis]+p.gnss*p.gnss,K=P.map(row=>row[axis]/S),innovation=z-s[axis],prior=P.map(row=>[...row]);s=s.map((v,i)=>v+K[i]*innovation);P=P.map((row,i)=>row.map((v,j)=>v-K[i]*prior[axis][j]));};
  for(let i=0;i<160;i++){
    const t=i*dt,v=p.motion==='启停'?(i%55<12?0:2):2.2,turn=p.motion==='转弯'?.032:0;h+=turn;x+=v*dt*Math.cos(h);y+=v*dt*Math.sin(h);truth.push([x,y]);
    const imuA=(v-oldSpeed)/dt+noise(r)*.22,imuYaw=turn/dt+noise(r)*.01;oldSpeed=v;
    const h0=s[3],v0=s[2],F=[[1,0,dt*Math.cos(h0),-v0*dt*Math.sin(h0)],[0,1,dt*Math.sin(h0),v0*dt*Math.cos(h0)],[0,0,1,0],[0,0,0,1]];
    s=[s[0]+v0*dt*Math.cos(h0),s[1]+v0*dt*Math.sin(h0),v0+imuA*dt,h0+imuYaw*dt];
    const FP=F.map(row=>P[0].map((_,j)=>row.reduce((sum,v,k)=>sum+v*P[k][j],0)));
    P=FP.map((row,a)=>row.map((_,b)=>row.reduce((sum,v,k)=>sum+v*F[b][k],0)+(a===b?Q[a]:0)));
    const missing=t>=12&&t<12+(+p.outage),observed=i%5===0&&!missing;
    if(observed){const zx=x+noise(r)*(+p.gnss),zy=y+noise(r)*(+p.gnss);update(0,zx);update(1,zy);gnss.push([zx,zy]);}
    est.push([s[0],s[1]]);err.push([t,Math.hypot(s[0]-x,s[1]-y)]);speedTruth.push([t,v]);speedEst.push([t,s[2]]);rows.push([fmt(t),fmt(x),fmt(y),observed?'GNSS 更新':'IMU 预测',fmt(s[0]),fmt(s[1]),fmt(Math.hypot(s[0]-x,s[1]-y))]);
  }
  const errors=est.map((v,i)=>dist(v,truth[i]));
  return {metrics:[['融合 RMSE',fmt(rmse(errors))+' m'],['95% 误差',fmt([...errors].sort((a,b)=>a-b)[Math.floor(errors.length*.95)])+' m'],['GNSS 更新次数',gnss.length],['连续输出率','100%']],charts:[seriesChart('车辆轨迹：独立真值、GNSS 观测与融合输出',[xy(truth,'独立真值',colors[0]),xy(gnss,'GNSS 观测',colors[1]),xy(est,'融合输出',colors[2])],'停车时不从静止位置点构造航向。',true),seriesChart('位置误差随时间',[xy(err,'融合误差',colors[2])]),seriesChart('速度估计与工况',[xy(speedTruth,'真值速度',colors[0]),xy(speedEst,'EKF 速度',colors[2])])],headers:['时间 s','真值东 m','真值北 m','更新状态','估计东 m','估计北 m','误差 m'],rows,explain:'平面状态为位置、速度和航向；合成 IMU 加速度与角速度用于非线性预测，GNSS 位置用于低频更新，协方差由雅可比传播。实车应另用独立 RTK 或测量参考验证，并完成时间同步与零偏标定。'};
}

function sim3(p){
  const duration=+p.duration,trial=seed=>{const r=rng(seed),truth=[],dr=[],cv=[],error=[],rows=[];let x=0,y=0,h=0,dx=0,dy=0,dh=(+p.heading)*Math.PI/180,ox=0,oy=0,ovx=0,ovy=0;
    for(let i=0;i<320;i++){const t=i*.1,v=p.motion==='启停'?(i%75<15?0:2.7):3,turn=p.motion==='匀速转弯'?.055:0;h+=turn*.1;x+=v*.1*Math.cos(h);y+=v*.1*Math.sin(h);
      const denied=t>=5&&t<5+duration;
      // Gyro-derived heading is integrated continuously. GNSS may reset position, never hidden truth heading.
      dh+=(turn+(+p.bias)*Math.PI/180+noise(r)*.004)*.1;
      if(!denied){dx=x+noise(r)*.25;dy=y+noise(r)*.25;ox=x;oy=y;ovx=v*Math.cos(h);ovy=v*Math.sin(h);}else{dx+=(v+noise(r)*.12)*.1*Math.cos(dh);dy+=(v+noise(r)*.12)*.1*Math.sin(dh);}
      truth.push([x,y]);dr.push([dx,dy]);cv.push(denied?[ox+ovx*(t-5),oy+ovy*(t-5)]:[x,y]);error.push([t,Math.hypot(dx-x,dy-y)]);rows.push([fmt(t),denied?'拒止/预测':'GNSS 更新',fmt(x),fmt(y),fmt(dx),fmt(dy),fmt(Math.hypot(dx-x,dy-y))]);
    }return {truth,dr,cv,error,rows};};
  const a=trial(+p.seed),end=Math.round((5+duration)*10)-1,errors=a.error.filter(v=>v[0]>=5&&v[0]<5+duration).map(v=>v[1]);let endpoints=[];
  for(let j=0;j<30;j++){let q=trial((+p.seed)+j),e=q.error[end][1];endpoints.push(e);}
  return {metrics:[['拒止末端误差',fmt(a.error[end][1])+' m'],['拒止区间 RMSE',fmt(rmse(errors))+' m'],['30 次均值',fmt(mean(endpoints))+' m'],['失锁时长',duration+' s']],charts:[seriesChart('轨迹：真值、IMU 推算、匀速外推基线',[xy(a.truth,'真值',colors[0]),xy(a.dr,'IMU 推算',colors[2]),xy(a.cv,'匀速基线',colors[1])],'5 秒开始拒止；恢复后才允许使用 GNSS 更新。',true),seriesChart('推算误差与恢复',[xy(a.error,'位置误差',colors[2])])],headers:['时间 s','观测状态','真值东 m','真值北 m','推算东 m','推算北 m','误差 m'],rows:a.rows,explain:'每次运行以当前随机种子生成 30 组独立噪声，比较拒止末端误差。长期无卫星观测会持续漂移，恢复观测后的误差不属于拒止期实时精度。'};
}

function sim4(p){
  const r=rng(+p.seed),alpha=+p.alpha,threshold=-2*Math.log(alpha),data=[],gate=[],rows=[];let streak=0,alarmAt=null,falseAlarmEvents=0,miss=0,wasAlarm=false;
  for(let i=0;i<120;i++){
    const active=i>=42&&i<92,missing=active&&p.anomaly==='连续缺测',bias=active?(p.anomaly==='位置突变'?+p.magnitude:p.anomaly==='缓慢漂移'?(i-42)/50*(+p.magnitude):0):0;
    const vx=noise(r)*1.1+bias,vy=noise(r)*1.1,nis=missing?null:(vx*vx+vy*vy)/1.21;
    let state='正常';if(missing){streak=0;wasAlarm=false;state='数据超时';if(active&&alarmAt===null)alarmAt=i;}
    else if(nis>threshold){streak++;if(streak>=+p.confirm){state='异常告警';if(active&&alarmAt===null)alarmAt=i;if(!active&&!wasAlarm)falseAlarmEvents++;wasAlarm=true;}}else{streak=0;wasAlarm=false;}
    data.push([i,nis]);gate.push([i,threshold]);rows.push([i,missing?'缺测':fmt(vx),missing?'—':fmt(nis),fmt(threshold),state]);
  }
  const activeEvents=p.anomaly==='正常'?0:1;miss=activeEvents&&alarmAt===null?1:0;
  return {metrics:[['二维 NIS 门限',fmt(threshold)],['事件检测',activeEvents?(miss?'漏检':'检出'):'无注入'],['首次告警延迟',alarmAt===null?'—':Math.max(0,alarmAt-42)+' 帧'],['正常段误报事件',falseAlarmEvents+' 次']],charts:[seriesChart('预测新息统计量与 χ²₂ 门限',[xy(data,'NIS',colors[0]),xy(gate,'门限',colors[1])],'缺测样本留空并产生独立超时事件，不能代入卡方检验。',true)],headers:['帧','东向新息 m','NIS','门限','检测状态'],rows,explain:`门限基于二维、各向同性且方差为 1.21 m² 的简化新息模型与 α=${p.alpha} 计算。正常段误报按连续告警事件计数；这只是单条合成序列示意，不能据此宣称经验虚警率。`};
}

function sim5(p){
  const r=rng(+p.seed),anchors=p.geometry==='四角布局'?[[0,0],[12,0],[12,8],[0,8]]:[[0,0],[4,0.15],[8,-.12],[12,.1]],truth=[],uwb=[],fused=[],residual=[],rows=[],dt=.1;
  let s=[2,4,0,0],P=[[4,0,0,0],[0,4,0,0],[0,0,2,0],[0,0,0,2]],prevV=[0,0],accepted=0;
  const F=[[1,0,dt,0],[0,1,0,dt],[0,0,1,0],[0,0,0,1]];
  for(let i=0;i<105;i++){
    const t=i*.1,x=2+8*i/104,y=4+2*Math.sin(i*.075),ranges=anchors.map((a,j)=>dist([x,y],a)+noise(r)*(+p.ranging)+(j===2&&i>35&&i<75?(+p.occlusion)*3:0));
    const velocity=[(x-(truth.at(-1)?.[0]??x))/dt,(y-(truth.at(-1)?.[1]??y))/dt],imu=[(velocity[0]-prevV[0])/dt+noise(r)*.08,(velocity[1]-prevV[1])/dt+noise(r)*.08];prevV=velocity;
    s=[s[0]+s[2]*dt+.5*imu[0]*dt*dt,s[1]+s[3]*dt+.5*imu[1]*dt*dt,s[2]+imu[0]*dt,s[3]+imu[1]*dt];
    const FP=F.map(row=>P[0].map((_,j)=>row.reduce((sum,v,k)=>sum+v*P[k][j],0)));
    P=FP.map((row,a)=>row.map((_,b)=>row.reduce((sum,v,k)=>sum+v*F[b][k],0)+(a===b?(a<2?.01:.05):0)));
    let ux=s[0],uy=s[1];for(let k=0;k<5;k++){let gx=0,gy=0,denx=0,deny=0;anchors.forEach((a,j)=>{const d=Math.max(.1,dist([ux,uy],a)),e=ranges[j]-d,hx=(ux-a[0])/d,hy=(uy-a[1])/d;gx+=e*hx;gy+=e*hy;denx+=hx*hx;deny+=hy*hy;});ux+=gx/Math.max(denx,1);uy+=gy/Math.max(deny,1);}
    anchors.forEach((a,j)=>{const d=Math.max(.1,dist([s[0],s[1]],a)),H=[(s[0]-a[0])/d,(s[1]-a[1])/d,0,0],innov=ranges[j]-d;
      if(Math.abs(innov)>1.3+4*(+p.ranging))return;
      const PH=P.map(row=>row.reduce((sum,v,k)=>sum+v*H[k],0)),S=H.reduce((sum,v,k)=>sum+v*PH[k],p.ranging*p.ranging),K=PH.map(v=>v/S),prior=P.map(row=>[...row]);s=s.map((v,k)=>v+K[k]*innov);P=P.map((row,k)=>row.map((v,l)=>v-K[k]*H.reduce((sum,h,m)=>sum+h*prior[m][l],0)));accepted++;});
    truth.push([x,y]);uwb.push([ux,uy]);fused.push([s[0],s[1]]);residual.push([i*.1,Math.abs(ranges[2]-dist([s[0],s[1]],anchors[2]))]);rows.push([fmt(t),...ranges.map(v=>fmt(v)),fmt(ux),fmt(uy),fmt(s[0]),fmt(s[1])]);
  }
  const e=fused.map((v,i)=>dist(v,truth[i]));
  return {metrics:[['融合 RMSE',fmt(rmse(e))+' m'],['95% 位置误差',fmt([...e].sort((a,b)=>a-b)[99])+' m'],['有效测距率',fmt(accepted/(105*4)*100,1)+'%'],['基站布局',p.geometry]],charts:[seriesChart('室内轨迹与基站布局',[xy(truth,'独立真值',colors[0]),xy(uwb,'单 UWB',colors[1]),xy(fused,'UWB/IMU',colors[2]),xy(anchors,'4 个基站',colors[3])],'近共线基站可观察几何退化。',true),seriesChart('第 3 基站测距残差',[xy(residual,'残差',colors[1])])],headers:['时间 s','距基站1 m','距基站2 m','距基站3 m','距基站4 m','UWB东 m','UWB北 m','融合东 m','融合北 m'],rows,explain:'四状态 EKF 用合成 IMU 加速度预测位置与速度，按各基站非线性距离观测逐条更新；过大残差暂不用于更新。真实试验须测量基站坐标，并单独记录遮挡、缺测和非视距偏差。'};
}

function sim6(p){
  const r=rng(+p.seed),truth=[[],[],[]],ind=[[],[],[]],joint=[[],[],[]],uncertainty=[],rows=[],loss=+p.loss/100;
  let x=[0,0,20,5,42,-4],a=[...x],b=[...x],P=Array.from({length:6},(_,i)=>Array.from({length:6},(_,j)=>i===j?2:0));
  const update=(H,z,R)=>{const PH=P.map(row=>row.reduce((s,v,k)=>s+v*H[k],0)),S=H.reduce((s,v,k)=>s+v*PH[k],R),K=PH.map(v=>v/S),res=z-H.reduce((s,v,k)=>s+v*b[k],0);b=b.map((v,k)=>v+K[k]*res);P=P.map((row,i)=>row.map((v,j)=>v-K[i]*PH[j]));};
  let used=0,dropped=0;
  for(let t=0;t<90;t++){
    for(let c=0;c<3;c++){
      const speed=p.scenario==='会车'&&c===1?-0.22:.2+.025*c,dy=p.scenario==='转弯'?.06*Math.sin(t*.065+c):p.scenario==='会车'?.012*c:0;
      x[2*c]+=speed;x[2*c+1]+=dy;a[2*c]+=speed+noise(r)*.035;a[2*c+1]+=dy+noise(r)*.035;b[2*c]+=speed+noise(r)*.035;b[2*c+1]+=dy+noise(r)*.035;
      P[2*c][2*c]+=.05;P[2*c+1][2*c+1]+=.05;
      const noGps=p.outage==='开启'&&c===1&&t>=35&&t<70;if(t%4===0&&!noGps){for(let axis=0;axis<2;axis++){const index=2*c+axis,z=x[index]+noise(r)*1.35,H=Array(6).fill(0);H[index]=1;update(H,z,1.82);a[index]+=.45*(z-a[index]);}}
      truth[c].push([x[2*c],x[2*c+1]]);ind[c].push([a[2*c],a[2*c+1]]);
    }
    for(const [c,d] of [[0,1],[1,2]]){if(r()<loss){dropped++;continue;}const dx=b[2*c]-b[2*d],dy=b[2*c+1]-b[2*d+1],range=Math.max(1e-6,Math.hypot(dx,dy)),H=Array(6).fill(0);H[2*c]=dx/range;H[2*c+1]=dy/range;H[2*d]=-dx/range;H[2*d+1]=-dy/range;const measured=dist([x[2*c],x[2*c+1]],[x[2*d],x[2*d+1]])+noise(r)*.55,linearizedMeasurement=H.reduce((s,v,k)=>s+v*b[k],0)+measured-range;update(H,linearizedMeasurement,.3025);used++;}
    for(let c=0;c<3;c++)joint[c].push([b[2*c],b[2*c+1]]);
    uncertainty.push([t,Math.sqrt(Math.max(0,P[2][2]+P[3][3]))]);
    rows.push([t,...b.map(v=>fmt(v)),used,dropped]);
  }
  const ej=joint.flatMap((track,c)=>track.map((v,i)=>dist(v,truth[c][i]))),ei=ind.flatMap((track,c)=>track.map((v,i)=>dist(v,truth[c][i])));
  return {metrics:[['联合位置 RMSE',fmt(rmse(ej))+' m'],['独立滤波 RMSE',fmt(rmse(ei))+' m'],['有效相对测距',used+' 条'],['丢弃测距',dropped+' 条']],charts:[seriesChart('三车真值与联合估计',[...truth.map((v,c)=>xy(v,`车${c+1}真值`,colors[c])),...joint.map((v,c)=>xy(v,`车${c+1}联合`,colors[c+2]))],'测距每条仅更新一次；联合协方差含车辆间相关性。',true),seriesChart('中间车辆：独立与协同定位',[xy(truth[1],'真值',colors[0]),xy(ind[1],'独立',colors[1]),xy(joint[1],'协同',colors[2])]),seriesChart('中间车辆位置不确定度',[xy(uncertainty,'√trace(P)',colors[3])])],headers:['帧','车1东','车1北','车2东','车2北','车3东','车3北','累计有效测距','累计丢包'],rows,explain:'这是二维位置状态的简化联合滤波示意：利用GNSS位置观测和线性化的车间距离残差形成车辆间约束。当前版本未包含车辆速度状态及完整运动模型，因此不应将其理解为完整联合EKF；仅有相对距离也不能确定全局平移或旋转。'};
}

function sim7(p){
  const r=rng(+p.seed),vx=+p.speed,mis=1+(+p.stiffness)/100,dt=.02,n=500,truth=[],est=[],steer=[],rows=[],M=1300,Iz=2200,lf=1.2,lr=1.5,Cf=70000,Cr=80000;
  let vy=0,yaw=0,ev=0,er=0,pv=.5,pr=.2;
  for(let i=0;i<n;i++){
    const t=i*dt,delta=(p.steer==='阶跃转向'?(t>1?.035:0):p.steer==='正弦转向'?.025*Math.sin(t*1.4):.045*Math.sin(t*1.2)*Math.exp(-Math.max(0,t-4)/4));
    const dynamics=(v,z,scale)=>{const cf=Cf*scale,cr=Cr*scale,Ff=cf*(delta-(v+lf*z)/vx),Fr=cr*(-(v-lr*z)/vx);return [(Ff+Fr)/M-vx*z,(lf*Ff-lr*Fr)/Iz,Ff+Fr];};
    const [dvy,dr,F]=dynamics(vy,yaw,1);vy+=dvy*dt;yaw+=dr*dt;
    const [edvy,edr]=dynamics(ev,er,mis);ev+=edvy*dt;er+=edr*dt;pv+=.001;pr+=.0003;
    const measuredR=yaw+noise(r)*.004,Kr=pr/(pr+.0001);er+=Kr*(measuredR-er);pr*=1-Kr;
    const ay=F/M+noise(r)*.035,innovation=ay-(dynamics(ev,er,mis)[2]/M),Kv=pv/(pv+.1);ev+=Kv*innovation*.07;pv*=1-.08*Kv;
    truth.push([t,vy]);est.push([t,ev]);steer.push([t,delta*180/Math.PI]);rows.push([fmt(t),fmt(delta*180/Math.PI),fmt(vy),fmt(ev),fmt(yaw),fmt(er),fmt(Math.atan2(ev,vx)*180/Math.PI)]);
  }
  const e=truth.map((v,i)=>v[1]-est[i][1]);
  const yawTruth=rows.map(v=>[+v[0],+v[4]]),yawEstimate=rows.map(v=>[+v[0],+v[5]]),beta=rows.map(v=>[+v[0],+v[6]]);
  return {metrics:[['侧向速度 RMSE',fmt(rmse(e),3)+' m/s'],['末端侧偏角',fmt(Math.atan2(ev,vx)*180/Math.PI)+'°'],['横摆角速度',fmt(er,3)+' rad/s'],['模型刚度偏差',p.stiffness+'%']],charts:[seriesChart('侧向速度：仿真真值与 KF 估计',[xy(truth,'独立真值',colors[0]),xy(est,'估计值',colors[2])],'仅适用于非零中等车速与小侧偏角。',true),seriesChart('前轮转角输入',[xy(steer,'转角 °',colors[1])]),seriesChart('横摆角速度：真值与估计',[xy(yawTruth,'真值',colors[0]),xy(yawEstimate,'估计',colors[2])]),seriesChart('质心侧偏角估计',[xy(beta,'β °',colors[3])])],headers:['时间 s','前轮角 °','真值 vy','估计 vy','真值 r','估计 r','估计 β °'],rows,explain:'二维单轨模型由前轮转角驱动，以横摆角速度和侧向加速度辅助状态更新。刚度失配选项用于观察模型偏差；不包含整车稳定性控制。'};
}

function sim7(p){
  const r=rng(+p.seed),vx=+p.speed,mis=1+(+p.stiffness)/100,dt=.02,n=500,M=1300,Iz=2200,lf=1.2,lr=1.5,Cf=70000,Cr=80000;
  const truth=[],est=[],steer=[],yawTruth=[],yawEstimate=[],beta=[],rows=[];let vy=0,yaw=0,xhat=[0,0],P=[[.5,0],[0,.2]];
  const filterModel=(scale)=>{const cf=Cf*scale,cr=Cr*scale;return{A:[[-(cf+cr)/(M*vx),(-lf*cf+lr*cr)/(M*vx)-vx],[(lr*cr-lf*cf)/(Iz*vx),-(lf*lf*cf+lr*lr*cr)/(Iz*vx)]],B:[cf/M,lf*cf/Iz],H:[[-(cf+cr)/(M*vx),(-lf*cf+lr*cr)/(M*vx)+vx],[0,1]],D:[cf/M,0]};};
  const plant=filterModel(mis),nom=filterModel(1),Ad=[[1+dt*nom.A[0][0],dt*nom.A[0][1]],[dt*nom.A[1][0],1+dt*nom.A[1][1]]],Bd=nom.B.map(v=>v*dt);
  const scalarUpdate=(h,z,R)=>{const ph=P.map(row=>row[0]*h[0]+row[1]*h[1]),S=h[0]*ph[0]+h[1]*ph[1]+R,K=ph.map(v=>v/S),innovation=z-h[0]*xhat[0]-h[1]*xhat[1],prior=P.map(row=>[...row]);xhat=xhat.map((v,i)=>v+K[i]*innovation);P=P.map((row,i)=>row.map((v,j)=>prior[i][j]-K[i]*(h[0]*prior[0][j]+h[1]*prior[1][j])));};
  for(let i=0;i<n;i++){
    const t=i*dt,delta=(p.steer==='阶跃转向'?(t>1?.035:0):p.steer==='正弦转向'?.025*Math.sin(t*1.4):.045*Math.sin(t*1.2)*Math.exp(-Math.max(0,t-4)/4));
    const [dvy,dr]=plant.A.map((row,k)=>row[0]*[vy,yaw][0]+row[1]*[vy,yaw][1]+plant.B[k]*delta);vy+=dvy*dt;yaw+=dr*dt;
    xhat=[Ad[0][0]*xhat[0]+Ad[0][1]*xhat[1]+Bd[0]*delta,Ad[1][0]*xhat[0]+Ad[1][1]*xhat[1]+Bd[1]*delta];
    const AP=Ad.map(row=>P[0].map((_,j)=>row.reduce((s,v,k)=>s+v*P[k][j],0)));P=AP.map((row,a)=>row.map((_,b)=>row.reduce((s,v,k)=>s+v*Ad[b][k],0)+(a===b?.002:.0002)));
    const f=plant.A[0][0]*vy+plant.A[0][1]*yaw+plant.B[0]*delta,ay=f+vx*yaw+noise(r)*.035,measYaw=yaw+noise(r)*.004;
    scalarUpdate(nom.H[1],measYaw,.004**2);scalarUpdate(nom.H[0],ay-nom.D[0]*delta,.035**2);
    const estimatedBeta=Math.atan2(xhat[0],vx)*180/Math.PI;truth.push([t,vy]);est.push([t,xhat[0]]);steer.push([t,delta*180/Math.PI]);yawTruth.push([t,yaw]);yawEstimate.push([t,xhat[1]]);beta.push([t,estimatedBeta]);rows.push([fmt(t),fmt(delta*180/Math.PI),fmt(vy),fmt(xhat[0]),fmt(yaw),fmt(xhat[1]),fmt(estimatedBeta)]);
  }
  return {metrics:[],charts:[seriesChart('车辆横向状态：单轨模型与卡尔曼估计',[xy(truth,'模型状态',colors[0]),xy(est,'KF估计',colors[2])],'线性单轨模型；侧向速度由横摆角速度和侧向加速度观测更新。',true),seriesChart('前轮转角输入',[xy(steer,'前轮转角 °',colors[1])]),seriesChart('横摆角速度',[xy(yawTruth,'模型状态',colors[0]),xy(yawEstimate,'KF估计',colors[2])]),seriesChart('质心侧偏角估计',[xy(beta,'β估计 °',colors[3])])],headers:['时间 s','前轮角 °','模型vy','KF估计vy','模型r','KF估计r','估计β °'],rows,explain:'采用二自由度线性单轨模型和离散二维卡尔曼滤波，观测为横摆角速度与侧向加速度。侧偏刚度失配用于展示模型误差影响；该简化演示不代表实车参数辨识或控制系统。'};
}

function sim8(p){
  const r=rng(+p.seed),dt=.2,history=[],truth=[],rows=[];let x=0,y=0,v=2.4,h=0;
  for(let i=0;i<65;i++){const t=i*dt,mode=p.motion==='机动切换'?(i<35?'匀速':'协调转弯'):p.motion;if(mode==='匀加速')v+=.008;if(mode==='协调转弯')h+=.04;x+=v*dt*Math.cos(h);y+=v*dt*Math.sin(h);truth.push([x,y]);history.push([x+noise(r)*(+p.uncertainty),y+noise(r)*(+p.uncertainty)]);}
  const k=38,now=history[k],prev=history[k-5],older=history[k-10],vel=[(now[0]-prev[0]),(now[1]-prev[1])],acc=[now[0]-2*prev[0]+older[0],now[1]-2*prev[1]+older[1]],H=+p.horizon*5;
  const candidates=[0,1,2].map(model=>{const out=[];for(let j=1;j<=H;j++){const s=j/5;let px=now[0]+vel[0]*s,py=now[1]+vel[1]*s;if(model===1){px+=.5*acc[0]*s*s;py+=.5*acc[1]*s*s;}if(model===2){const a=.13*s;const vx=vel[0]*Math.cos(a)-vel[1]*Math.sin(a),vy=vel[0]*Math.sin(a)+vel[1]*Math.cos(a);px=now[0]+vx*s;py=now[1]+vy*s;}out.push([px,py]);}return out;});
  const prior=history[k-15],priorVel=[prev[0]-older[0],prev[1]-older[1]],priorAcc=[prev[0]-2*older[0]+prior[0],prev[1]-2*older[1]+prior[1]];
  const likelihood=[0,1,2].map(j=>{let predicted=[prev[0]+priorVel[0],prev[1]+priorVel[1]];if(j===1)predicted=[predicted[0]+.5*priorAcc[0],predicted[1]+.5*priorAcc[1]];if(j===2){const a=.13;predicted=[prev[0]+priorVel[0]*Math.cos(a)-priorVel[1]*Math.sin(a),prev[1]+priorVel[0]*Math.sin(a)+priorVel[1]*Math.cos(a)];}const err=dist(predicted,now);return Math.exp(-err*err/(3+p.uncertainty*p.uncertainty))+.000001;}),sum=likelihood.reduce((a,b)=>a+b,0),probs=likelihood.map(v=>v/sum),selected=probs.indexOf(Math.max(...probs)),best=candidates[selected],future=truth.slice(k+1,k+H+1);
  const ade=mean(best.map((v,i)=>dist(v,future[i]))),fde=dist(best.at(-1),future.at(-1));for(let j=0;j<H;j++)rows.push([fmt((j+1)*dt),fmt(future[j][0]),fmt(future[j][1]),fmt(best[j][0]),fmt(best[j][1]),fmt(dist(best[j],future[j]))]);
  return {metrics:[['预测 ADE',fmt(ade)+' m'],['预测 FDE',fmt(fde)+' m'],['主导模型',['匀速','匀加速','协调转弯'][selected]],['模型概率',probs.map(v=>fmt(v,2)).join(' / ')]],charts:[seriesChart('观测历史与短时候选航迹',[xy(history.slice(0,k+1),'历史观测',colors[0]),...candidates.map((v,j)=>xy([now,...v],['匀速','匀加速','协调转弯'][j],colors[j+1]))],'仅显示当前观测和向前推演的候选航迹；未来真值不进入预测画面。',true),customChart('候选模型权重示意',(ctx,w,h,progress)=>{const names=['匀速','匀加速','协调转弯'];probs.forEach((v,j)=>{ctx.fillStyle=colors[j+1];ctx.fillRect(90,48+j*83,(w-180)*v*progress,35);ctx.fillStyle='#33485c';ctx.font='15px Arial';ctx.fillText(names[j],90,38+j*83);});})],headers:['预测时域 s','参考轨迹东','参考轨迹北','预测东','预测北','位置误差'],rows,explain:'依据历史观测形成匀速、匀加速和协调转弯候选，再用一步预测残差构造启发式权重并选取主导模型。这里不是完整 IMM，模型权重仅作教学示意。'};
}

function sim9(p){
  const r=rng(+p.seed),scene=p.scene,W=p.size==='768'?192:128,H=Math.round(W*7/16),pixels=new Uint8Array(W*H),index=(x,y)=>y*W+x;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const land=(scene==='近岸'||scene==='港区')&&x<W*(.11+.09*y/H);pixels[index(x,y)]=land?170+Math.floor(r()*15):132+Math.floor(r()*18);}
  const count=scene==='无船'?0:scene==='港区'?10:scene==='开阔水域'?5:7;
  for(let i=0;i<count;i++){const cx=10+Math.floor(r()*(W-20)),cy=7+Math.floor(r()*(H-14)),rx=3+Math.floor(r()*4),ry=1.4+r();for(let y=Math.max(0,cy-4);y<Math.min(H,cy+5);y++)for(let x=Math.max(0,cx-rx-2);x<Math.min(W,cx+rx+3);x++){const dx=x-cx,dy=y-cy;if((dx*dx)/(rx*rx)+(dy*dy)/(ry*ry)<1)pixels[index(x,y)]=238+Math.floor(r()*17);}}
  if(scene==='港区'){for(let y=8;y<14;y++)for(let x=5;x<14;x++)pixels[index(x,y)]=232;}
  const seen=new Uint8Array(W*H),candidates=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++){const start=index(x,y);if(seen[start]||pixels[start]<218)continue;const queue=[start];seen[start]=1;let minx=x,maxx=x,miny=y,maxy=y,sum=0;for(let head=0;head<queue.length;head++){const v=queue[head],cx=v%W,cy=Math.floor(v/W);sum+=pixels[v];minx=Math.min(minx,cx);maxx=Math.max(maxx,cx);miny=Math.min(miny,cy);maxy=Math.max(maxy,cy);for(const [nx,ny] of [[cx-1,cy],[cx+1,cy],[cx,cy-1],[cx,cy+1]]){if(nx<0||ny<0||nx>=W||ny>=H)continue;const k=index(nx,ny);if(!seen[k]&&pixels[k]>=218){seen[k]=1;queue.push(k);}}}if(queue.length<5)continue;const width=maxx-minx+1,height=maxy-miny+1,aspect=width/Math.max(height,1),confidence=clamp(.43+.055*aspect+.006*queue.length+.001*(sum/queue.length-218),.1,.99);candidates.push({x:minx,y:miny,w:width,h:height,conf:confidence});}
  const filtered=candidates.filter(o=>o.conf>=+p.confidence),rows=filtered.map((o,i)=>[i+1,o.x,o.y,o.w,o.h,fmt(o.conf),scene]);
  const image=customChart('遥感图像扫描与船舶框选示意',(ctx,w,h,progress)=>{const temp=document.createElement('canvas');temp.width=W;temp.height=H;const tctx=temp.getContext('2d'),data=tctx.createImageData(W,H);for(let i=0;i<pixels.length;i++){const v=pixels[i];data.data[4*i]=v-20;data.data[4*i+1]=v;data.data[4*i+2]=Math.min(255,v+12);data.data[4*i+3]=255;}tctx.putImageData(data,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(temp,0,0,w,h);ctx.fillStyle='rgba(255,255,255,.60)';ctx.fillRect(0,progress*h,w,(1-progress)*h);ctx.strokeStyle='#155b4c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,progress*h);ctx.lineTo(w,progress*h);ctx.stroke();filtered.filter(o=>o.y+o.h<=progress*H).forEach(o=>{ctx.strokeStyle='#17856c';ctx.lineWidth=2;ctx.strokeRect(o.x/W*w,o.y/H*h,o.w/W*w,o.h/H*h);});},'扫描与框选为合成画面示意；真实毕业设计须训练并测试检测模型。',true);
  return {metrics:[['检测框数',filtered.length+' 个'],['连通域候选',candidates.length+' 个'],['置信度门限',fmt(p.confidence)],['输入规格',p.size+' px']],charts:[image,customChart('批量处理流程',(ctx,w,h,progress)=>{const labels=['导入影像','逐张扫描','保存标注','导出记录'],active=Math.min(3,Math.floor(progress*4));ctx.font='16px Arial';labels.forEach((label,i)=>{const x=45+i*(w-90)/4,boxW=(w-120)/4;ctx.fillStyle=i<=active?'#e8f0f5':'#fff';ctx.fillRect(x,120,boxW,70);ctx.strokeStyle=i<=active?'#155b82':'#cbd8e0';ctx.lineWidth=2;ctx.strokeRect(x,120,boxW,70);ctx.fillStyle='#2d4e66';ctx.fillText(label,x+18,162);if(i<3){ctx.fillStyle='#8aa1b0';ctx.fillText('→',x+boxW+8,162);}});},'学生需实现单图检测、批量处理、标注保存和记录导出。')],headers:['编号','左上角 x','左上角 y','宽','高','示意置信度','场景'],rows,explain:'本演示在合成像素图上实际执行阈值分割与连通域定位。真实毕业设计需从 Airbus 标注解码 RLE、按影像划分训练/验证/测试集，迁移训练轻量检测模型，并在独立测试集报告 AP50、查准率、查全率与耗时。'};
}

function sim10(p){
  const r=rng(+p.seed),n=80,dt=.1,acc=[],peaks=[],truth=[],estimate=[],rows=[];let px=0,py=0,tx=0,ty=0,steps=0,last=-100,heading=0;
  for(let i=0;i<n;i++){
    const t=i*dt,peak=i%6===3,mag=9.8+(peak?1.8:0)+noise(r)*.16,detected=mag-9.8>+p.threshold&&i-last>=4;
    if(detected){steps++;last=i;const angle=p.route==='直线'?0:p.route==='矩形闭环'?Math.floor(steps/8)*Math.PI/2:steps<11?0:steps<20?.6:0;
      heading=angle+(p.magnetic==='开启'&&steps>15?0.2:0)+noise(r)*.025;px+=(+p.stride)*Math.cos(heading);py+=(+p.stride)*Math.sin(heading);tx+=.7*Math.cos(angle);ty+=.7*Math.sin(angle);
      truth.push([tx,ty]);estimate.push([px,py]);peaks.push([t,mag]);}
    acc.push([t,mag]);rows.push([fmt(t),fmt(mag),detected?'是':'否',steps,fmt(px),fmt(py),fmt(heading*180/Math.PI)]);
  }
  const end=estimate.at(-1)||[0,0],ref=truth.at(-1)||[0,0];
  return {metrics:[['检测步数',steps+' 步'],['估计总距离',fmt(steps*(+p.stride))+' m'],['终点误差',fmt(dist(end,ref))+' m'],['磁场质量',p.magnetic==='开启'?'异常提示':'正常']],charts:[seriesChart('平面轨迹与独立检查点',[xy(truth,'测量路线',colors[0]),xy(estimate,'PDR 推算',colors[2])],'无连续位置真值时只比较已测检查点与终点。',true),seriesChart('加速度模长与检测峰值',[xy(acc,'模长 m/s²',colors[0]),xy(peaks,'有效步峰',colors[1])])],headers:['时间 s','加速度模长','有效步峰','累计步数','估计东 m','估计北 m','航向 °'],rows,explain:'先检测加速度峰值和最小步间隔，再按标定步长与航向逐步更新。航向偏置选项在转弯阶段加入固定角度偏差，不含磁力计观测或磁场异常检测。真实系统需使用手机传感器时间戳、固定携带方式与独立测量路线。'};
}

const simulators={1:sim1,2:sim2,3:sim3,4:sim4,5:sim5,6:sim6,7:sim7,8:sim8,9:sim9,10:sim10};

function drawLineChart(canvas,series,progress=1){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,pad={l:48,r:18,t:22,b:34};ctx.clearRect(0,0,w,h);ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
  const valid=series.flatMap(s=>s.values).filter(v=>v&&Number.isFinite(v[0])&&Number.isFinite(v[1]));if(!valid.length)return;
  let xmin=Math.min(...valid.map(v=>v[0])),xmax=Math.max(...valid.map(v=>v[0])),ymin=Math.min(...valid.map(v=>v[1])),ymax=Math.max(...valid.map(v=>v[1]));if(xmax===xmin)xmax++;if(ymax===ymin)ymax++;
  const xm=(xmax-xmin)*.04,ym=(ymax-ymin)*.08;xmin-=xm;xmax+=xm;ymin-=ym;ymax+=ym;const X=x=>pad.l+(x-xmin)/(xmax-xmin)*(w-pad.l-pad.r),Y=y=>h-pad.b-(y-ymin)/(ymax-ymin)*(h-pad.t-pad.b);
  ctx.lineWidth=1;for(let j=0;j<=4;j++){let yy=pad.t+(h-pad.t-pad.b)*j/4;ctx.strokeStyle='#e6edf1';ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(w-pad.r,yy);ctx.stroke();}
  for(let j=0;j<=4;j++){let xx=pad.l+(w-pad.l-pad.r)*j/4;ctx.strokeStyle='#e6edf1';ctx.beginPath();ctx.moveTo(xx,pad.t);ctx.lineTo(xx,h-pad.b);ctx.stroke();}
  series.forEach(s=>{const position=progress*Math.max(0,s.values.length-1),whole=Math.floor(position),fraction=position-whole,visible=s.values.slice(0,whole+1);if(fraction>0&&s.values[whole]&&s.values[whole+1]){const a=s.values[whole],b=s.values[whole+1];visible.push([a[0]+fraction*(b[0]-a[0]),a[1]+fraction*(b[1]-a[1])]);}ctx.strokeStyle=s.color;ctx.lineWidth=s.values.length<8?2.5:1.8;ctx.beginPath();let started=false;for(const value of visible){if(!value||!Number.isFinite(value[1])){started=false;continue;}const x=X(value[0]),y=Y(value[1]);if(!started){ctx.moveTo(x,y);started=true;}else ctx.lineTo(x,y);}ctx.stroke();const last=[...visible].reverse().find(v=>v&&Number.isFinite(v[1]));if(last){ctx.beginPath();ctx.arc(X(last[0]),Y(last[1]),5,0,2*Math.PI);ctx.fillStyle=s.color;ctx.fill();}});
}

function htmlEscape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fieldHtml(f){const common=`id="field-${f.key}" data-key="${f.key}"`;if(f.type==='select')return `<label>${htmlEscape(f.label)}<select ${common}>${f.options.map(o=>`<option value="${htmlEscape(o)}" ${String(o)===String(f.value)?'selected':''}>${htmlEscape(o)}</option>`).join('')}</select></label>`;return `<label>${htmlEscape(f.label)} <span class="field-value" id="value-${f.key}">${f.value}</span><input ${common} type="${f.type}" min="${f.min}" max="${f.max}" step="${f.step||1}" value="${f.value}"></label>`;}
function params(){const out={};settings[id].fields.forEach(f=>out[f.key]=document.getElementById('field-'+f.key).value);return out;}
function csvDownload(headers,rows){const csv='\ufeff'+[headers,...rows].map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`graduation-demo-${String(id).padStart(2,'0')}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
let lastResult;
let progress=0;
let playing=true;
let lastFrame=0;
let lastPaint=0;

function paint() {
  if (!lastResult) return;
  lastResult.charts.forEach((chart,index) => {
    const canvas=document.getElementById(`chart-${index}`);
    if (chart.type==='lines') drawLineChart(canvas,chart.series,progress);
    else {const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);chart.draw(ctx,canvas.width,canvas.height,progress);}
  });
  document.getElementById('timeline').value=String(Math.round(progress*1000));
  document.getElementById('timeline-value').textContent=Math.round(progress*100)+'%';
  document.getElementById('play-state').textContent=playing?'演示运行中':'已暂停';
  document.getElementById('play-toggle').textContent=playing?'暂停':'播放';
}

function animate(now) {
  const elapsed=lastFrame?Math.min(Math.max(now-lastFrame,0),100):0;
  lastFrame=now;
  if (playing && lastResult) {
    progress+=elapsed*Number(document.getElementById('speed').value)/12000;
    if (progress>=1) progress=0;
  }
  if (now-lastPaint>50) {paint();lastPaint=now;}
  requestAnimationFrame(animate);
}

function renderRun() {
  lastResult=simulators[id](params());
  document.getElementById('charts').innerHTML=lastResult.charts.map((chart,index)=>`<section class="chart ${chart.wide?'wide':''}"><h3>${htmlEscape(chart.title)}</h3><canvas id="chart-${index}" width="800" height="350"></canvas>${chart.type==='lines'?`<div class="legend">${chart.series.map(series=>`<span><i style="background:${series.color}"></i>${htmlEscape(series.name)}</span>`).join('')}</div>`:''}${chart.note?`<p class="chart-note">${htmlEscape(chart.note)}</p>`:''}</section>`).join('');
  progress=0;
  playing=true;
  paint();
}

async function boot(){if(!settings[id]){root.textContent='未找到演示题目。';return;}const [topics,references]=await Promise.all([fetch('../grad-topics.json').then(r=>r.json()),fetch('../grad-references.json').then(r=>r.json())]);const topic=topics.find(v=>v.id===id),cfg=settings[id];document.title=topic.title+' · 动态演示';document.getElementById('page-title').textContent=topic.title;document.getElementById('page-subtitle').textContent=cfg.subtitle;document.getElementById('page-scope').textContent=cfg.scope;
  const cited=new Set();for(const match of topic.sections['研究依据与适用性'].matchAll(/\[(\d+)(?:\s*[-–]\s*(\d+))?\]/g)){for(let number=Number(match[1]);number<=Number(match[2]||match[1]);number++)cited.add(number);}
  const relevant=references.filter(value=>cited.has(Number(value.match(/^\[(\d+)\]/)?.[1])));
  root.innerHTML=`<div class="lab"><aside class="controls panel"><h2>场景与参数</h2>${cfg.fields.map(fieldHtml).join('')}<div class="buttons"><button id="run">重新演示</button></div><div class="control-help"><strong>需要完成的设计任务</strong><p>${htmlEscape(topic.sections['设计任务1'])}</p><p>${htmlEscape(topic.sections['设计任务2'])}</p><p>${htmlEscape(topic.sections['设计任务3'])}</p></div></aside><div class="results"><div class="results-top"><h2>动态界面示意</h2><p class="status">合成场景 · 非毕业设计结果</p></div><div class="playback"><button id="play-toggle" type="button">暂停</button><button id="rewind" type="button" class="secondary">重置</button><span class="play-state" id="play-state">演示运行中</span><input id="timeline" type="range" min="0" max="1000" value="0" aria-label="播放进度"><output id="timeline-value">0%</output><select id="speed" aria-label="播放速度"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></div><div id="charts" class="plot-grid"></div><div class="explain"><strong>设计提示　</strong>${htmlEscape(topic.sections['验证与评价'])}</div></div></div><section class="demo-references"><h2>参考文献与技术资料</h2>${relevant.map(value=>`<p>${htmlEscape(value).replace(/https:\/\/[^\s]+/g,url=>`<a href="${url}" target="_blank" rel="noopener">${url}</a>`)}</p>`).join('')}</section>`;
  document.getElementById('run').onclick=renderRun;
  document.getElementById('play-toggle').onclick=()=>{playing=!playing;paint();};
  document.getElementById('rewind').onclick=()=>{progress=0;playing=false;paint();};
  document.getElementById('timeline').oninput=event=>{playing=false;progress=Number(event.target.value)/1000;paint();};
  cfg.fields.forEach(f=>{const el=document.getElementById('field-'+f.key);el.addEventListener('input',()=>{const v=document.getElementById('value-'+f.key);if(v)v.textContent=el.value;});el.addEventListener('change',renderRun);});
  renderRun();
  requestAnimationFrame(animate);
}
boot().catch(error=>{root.textContent='演示加载失败：'+error.message;console.error(error);});
