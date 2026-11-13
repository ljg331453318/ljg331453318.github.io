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
  9:{subtitle:'单图检测、置信度筛选、批量统计与 CSV 导出',scope:'使用合成遥感样例演示检测流程。此处是图像处理原型，不能替代训练后的船舶检测模型或独立测试集 AP50。',fields:[field('scene','影像场景','select','近岸',{options:['开阔水域','近岸','港区','无船']}),field('size','输入尺寸 px','select','512',{options:['512','768']}),field('confidence','置信度阈值','range',0.55,{min:0.1,max:0.95,step:0.05}),field('seed','样例种子','number',12,{min:1,max:9999})]},
  10:{subtitle:'加速度峰值计步、步长标定、航向融合与轨迹推算',scope:'固定携带方式；使用合成加速度/航向序列。无连续真值时只核对检查点和终点。',fields:[field('route','步行路线','select','矩形闭环',{options:['直线','矩形闭环','含转弯']}),field('stride','标定步长 m','range',0.7,{min:0.4,max:1,step:0.02}),field('threshold','计步峰值阈值','range',1.15,{min:0.4,max:2,step:0.05}),field('magnetic','磁场异常','select','关闭',{options:['关闭','开启']}),field('seed','试验种子','number',29,{min:1,max:9999})]}
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
  const attitude=customChart('三维姿态与坐标轴',(ctx,w,h)=>{const phi=fusedRoll.at(-1)*Math.PI/180,theta=fusedPitch.at(-1)*Math.PI/180,psi=fusedYaw.at(-1)*Math.PI/180;const rotate=([x,y,z])=>{let X=x*Math.cos(psi)-y*Math.sin(psi),Y=x*Math.sin(psi)+y*Math.cos(psi);let Z=-X*Math.sin(theta)+z*Math.cos(theta);X=X*Math.cos(theta)+z*Math.sin(theta);return [X,Y*Math.cos(phi)-Z*Math.sin(phi),Y*Math.sin(phi)+Z*Math.cos(phi)];};const project=point=>{const [x,y,z]=rotate(point);return [w/2+(x-y)*1.35,h/2+(x+y)*.5-z*1.6];};const arm=(a,b,color)=>{const A=project(a),B=project(b);ctx.strokeStyle=color;ctx.lineWidth=12;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(...A);ctx.lineTo(...B);ctx.stroke();};arm([-80,0,0],[80,0,0],colors[0]);arm([0,-80,0],[0,80,0],colors[2]);arm([0,0,-45],[0,0,45],colors[1]);ctx.fillStyle='#173d60';ctx.beginPath();ctx.arc(...project([0,0,0]),13,0,2*Math.PI);ctx.fill();ctx.font='16px Arial';ctx.fillText(`Roll ${fmt(fusedRoll.at(-1),1)}° · Pitch ${fmt(fusedPitch.at(-1),1)}° · Yaw ${fmt(fusedYaw.at(-1),1)}°`,30,40);},'偏航为相对初始方向，六轴 IMU 不能提供绝对航向。');
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
      if(!denied){dx=x+noise(r)*.25;dy=y+noise(r)*.25;dh=h+(+p.heading)*Math.PI/180*.1;ox=x;oy=y;ovx=v*Math.cos(h);ovy=v*Math.sin(h);}else{dh+=(turn+(+p.bias)*Math.PI/180+noise(r)*.004)*.1;dx+=(v+noise(r)*.12)*.1*Math.cos(dh);dy+=(v+noise(r)*.12)*.1*Math.sin(dh);}
      truth.push([x,y]);dr.push([dx,dy]);cv.push(denied?[ox+ovx*(t-5),oy+ovy*(t-5)]:[x,y]);error.push([t,Math.hypot(dx-x,dy-y)]);rows.push([fmt(t),denied?'拒止/预测':'GNSS 更新',fmt(x),fmt(y),fmt(dx),fmt(dy),fmt(Math.hypot(dx-x,dy-y))]);
    }return {truth,dr,cv,error,rows};};
  const a=trial(+p.seed),end=Math.round((5+duration)*10)-1,errors=a.error.filter(v=>v[0]>=5&&v[0]<5+duration).map(v=>v[1]);let endpoints=[];
  for(let j=0;j<30;j++){let q=trial((+p.seed)+j),e=q.error[end][1];endpoints.push(e);}
  return {metrics:[['拒止末端误差',fmt(a.error[end][1])+' m'],['拒止区间 RMSE',fmt(rmse(errors))+' m'],['30 次均值',fmt(mean(endpoints))+' m'],['失锁时长',duration+' s']],charts:[seriesChart('轨迹：真值、IMU 推算、匀速外推基线',[xy(a.truth,'真值',colors[0]),xy(a.dr,'IMU 推算',colors[2]),xy(a.cv,'匀速基线',colors[1])],'5 秒开始拒止；恢复后才允许使用 GNSS 更新。',true),seriesChart('推算误差与恢复',[xy(a.error,'位置误差',colors[2])])],headers:['时间 s','观测状态','真值东 m','真值北 m','推算东 m','推算北 m','误差 m'],rows:a.rows,explain:'每次运行以当前随机种子生成 30 组独立噪声，比较拒止末端误差。长期无卫星观测会持续漂移，恢复观测后的误差不属于拒止期实时精度。'};
}

function sim4(p){
  const r=rng(+p.seed),alpha=+p.alpha,threshold=-2*Math.log(alpha),data=[],gate=[],rows=[];let streak=0,alarmAt=null,falseAlarms=0,miss=0;
  for(let i=0;i<120;i++){
    const active=i>=42&&i<92,missing=active&&p.anomaly==='连续缺测',bias=active?(p.anomaly==='位置突变'?+p.magnitude:p.anomaly==='缓慢漂移'?(i-42)/50*(+p.magnitude):0):0;
    const vx=noise(r)*1.1+bias,vy=noise(r)*1.1,nis=missing?null:(vx*vx+vy*vy)/1.21;
    let state='正常';if(missing){streak=0;state='数据超时';if(active&&alarmAt===null)alarmAt=i;}
    else if(nis>threshold){streak++;if(streak>=+p.confirm){state='异常告警';if(active&&alarmAt===null)alarmAt=i;if(!active)falseAlarms++;}}else streak=0;
    data.push([i,nis]);gate.push([i,threshold]);rows.push([i,missing?'缺测':fmt(vx),missing?'—':fmt(nis),fmt(threshold),state]);
  }
  const activeEvents=p.anomaly==='正常'?0:1;miss=activeEvents&&alarmAt===null?1:0;
  return {metrics:[['二维 NIS 门限',fmt(threshold)],['事件检测',activeEvents?(miss?'漏检':'检出'):'无注入'],['首次告警延迟',alarmAt===null?'—':Math.max(0,alarmAt-42)+' 帧'],['正常段误报',falseAlarms+' 帧']],charts:[seriesChart('预测新息统计量与 χ²₂ 门限',[xy(data,'NIS',colors[0]),xy(gate,'门限',colors[1])],'缺测样本留空并产生独立超时事件，不能代入卡方检验。',true)],headers:['帧','东向新息 m','NIS','门限','检测状态'],rows,explain:`门限由二维位置观测和 α=${p.alpha} 推出。单次检验虚警概率不等于连续确认后的经验虚警率；要报告实际虚警率与检测率，需要独立正常/异常测试集。`};
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
    for(const [c,d] of [[0,1],[1,2]]){if(r()<loss){dropped++;continue;}const dx=b[2*c]-b[2*d],dy=b[2*c+1]-b[2*d],range=Math.hypot(dx,dy),H=Array(6).fill(0);H[2*c]=dx/range;H[2*c+1]=dy/range;H[2*d]=-dx/range;H[2*d+1]=-dy/range;update(H,range+noise(r)*.55,0.31);used++;}
    for(let c=0;c<3;c++)joint[c].push([b[2*c],b[2*c+1]]);
    uncertainty.push([t,Math.sqrt(Math.max(0,P[2][2]+P[3][3]))]);
    rows.push([t,...b.map(v=>fmt(v)),used,dropped]);
  }
  const ej=joint.flatMap((track,c)=>track.map((v,i)=>dist(v,truth[c][i]))),ei=ind.flatMap((track,c)=>track.map((v,i)=>dist(v,truth[c][i])));
  return {metrics:[['联合位置 RMSE',fmt(rmse(ej))+' m'],['独立滤波 RMSE',fmt(rmse(ei))+' m'],['有效相对测距',used+' 条'],['丢弃测距',dropped+' 条']],charts:[seriesChart('三车真值与联合估计',[...truth.map((v,c)=>xy(v,`车${c+1}真值`,colors[c])),...joint.map((v,c)=>xy(v,`车${c+1}联合`,colors[c+2]))],'测距每条仅更新一次；联合协方差含车辆间相关性。',true),seriesChart('中间车辆：独立与协同定位',[xy(truth[1],'真值',colors[0]),xy(ind[1],'独立',colors[1]),xy(joint[1],'协同',colors[2])]),seriesChart('中间车辆位置不确定度',[xy(uncertainty,'√trace(P)',colors[3])])],headers:['帧','车1东','车1北','车2东','车2北','车3东','车3北','累计有效测距','累计丢包'],rows,explain:'联合状态包含三辆车的二维位置，绝对 GNSS 更新与车间距离更新使用同一协方差矩阵。仅相对距离不能确定全局平移或旋转。'};
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

function sim8(p){
  const r=rng(+p.seed),dt=.2,history=[],truth=[],rows=[];let x=0,y=0,v=2.4,h=0;
  for(let i=0;i<65;i++){const t=i*dt,mode=p.motion==='机动切换'?(i<35?'匀速':'协调转弯'):p.motion;if(mode==='匀加速')v+=.008;if(mode==='协调转弯')h+=.04;x+=v*dt*Math.cos(h);y+=v*dt*Math.sin(h);truth.push([x,y]);history.push([x+noise(r)*(+p.uncertainty),y+noise(r)*(+p.uncertainty)]);}
  const k=38,now=history[k],prev=history[k-5],older=history[k-10],vel=[(now[0]-prev[0]),(now[1]-prev[1])],acc=[now[0]-2*prev[0]+older[0],now[1]-2*prev[1]+older[1]],H=+p.horizon*5;
  const candidates=[0,1,2].map(model=>{const out=[];for(let j=1;j<=H;j++){const s=j/5;let px=now[0]+vel[0]*s,py=now[1]+vel[1]*s;if(model===1){px+=.5*acc[0]*s*s;py+=.5*acc[1]*s*s;}if(model===2){const a=.13*s;const vx=vel[0]*Math.cos(a)-vel[1]*Math.sin(a),vy=vel[0]*Math.sin(a)+vel[1]*Math.cos(a);px=now[0]+vx*s;py=now[1]+vy*s;}out.push([px,py]);}return out;});
  const prior=history[k-15],priorVel=[prev[0]-older[0],prev[1]-older[1]],priorAcc=[prev[0]-2*older[0]+prior[0],prev[1]-2*older[1]+prior[1]];
  const likelihood=[0,1,2].map(j=>{let predicted=[prev[0]+priorVel[0],prev[1]+priorVel[1]];if(j===1)predicted=[predicted[0]+.5*priorAcc[0],predicted[1]+.5*priorAcc[1]];if(j===2){const a=.13;predicted=[prev[0]+priorVel[0]*Math.cos(a)-priorVel[1]*Math.sin(a),prev[1]+priorVel[0]*Math.sin(a)+priorVel[1]*Math.cos(a)];}const err=dist(predicted,now);return Math.exp(-err*err/(3+p.uncertainty*p.uncertainty))+.000001;}),sum=likelihood.reduce((a,b)=>a+b,0),probs=likelihood.map(v=>v/sum),selected=probs.indexOf(Math.max(...probs)),best=candidates[selected],future=truth.slice(k+1,k+H+1);
  const ade=mean(best.map((v,i)=>dist(v,future[i]))),fde=dist(best.at(-1),future.at(-1));for(let j=0;j<H;j++)rows.push([fmt((j+1)*dt),fmt(future[j][0]),fmt(future[j][1]),fmt(best[j][0]),fmt(best[j][1]),fmt(dist(best[j],future[j]))]);
  return {metrics:[['预测 ADE',fmt(ade)+' m'],['预测 FDE',fmt(fde)+' m'],['主导模型',['匀速','匀加速','协调转弯'][selected]],['模型概率',probs.map(v=>fmt(v,2)).join(' / ')]],charts:[seriesChart('观测历史、三条候选航迹和未来真值',[xy(history.slice(0,k+1),'历史观测',colors[0]),...candidates.map((v,j)=>xy([now,...v],['匀速','匀加速','协调转弯'][j],colors[j+1])),xy(future,'评估真值',colors[4])],'未来真值只在误差评价中使用，不参与候选生成。',true),customChart('候选模型概率',(ctx,w,h)=>{const names=['匀速','匀加速','协调转弯'];probs.forEach((v,j)=>{ctx.fillStyle=colors[j+1];ctx.fillRect(90,48+j*83,(w-180)*v,35);ctx.fillStyle='#33485c';ctx.font='15px Arial';ctx.fillText(names[j]+' '+fmt(v,3),90,38+j*83);});})],headers:['预测时域 s','真值东','真值北','预测东','预测北','位置误差'],rows,explain:'根据历史观测生成匀速、加速和转弯候选，归一化得到模型权重并选择主导候选。此页未实现交互混合步骤，因此不称为 IMM。'};
}

function sim9(p){
  const r=rng(+p.seed),scene=p.scene,W=p.size==='768'?192:128,H=Math.round(W*7/16),pixels=new Uint8Array(W*H),index=(x,y)=>y*W+x;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const land=(scene==='近岸'||scene==='港区')&&x<W*(.11+.09*y/H);pixels[index(x,y)]=land?170+Math.floor(r()*15):132+Math.floor(r()*18);}
  const count=scene==='无船'?0:scene==='港区'?10:scene==='开阔水域'?5:7;
  for(let i=0;i<count;i++){const cx=10+Math.floor(r()*(W-20)),cy=7+Math.floor(r()*(H-14)),rx=3+Math.floor(r()*4),ry=1.4+r();for(let y=Math.max(0,cy-4);y<Math.min(H,cy+5);y++)for(let x=Math.max(0,cx-rx-2);x<Math.min(W,cx+rx+3);x++){const dx=x-cx,dy=y-cy;if((dx*dx)/(rx*rx)+(dy*dy)/(ry*ry)<1)pixels[index(x,y)]=238+Math.floor(r()*17);}}
  if(scene==='港区'){for(let y=8;y<14;y++)for(let x=5;x<14;x++)pixels[index(x,y)]=232;}
  const seen=new Uint8Array(W*H),candidates=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++){const start=index(x,y);if(seen[start]||pixels[start]<218)continue;const queue=[start];seen[start]=1;let minx=x,maxx=x,miny=y,maxy=y,sum=0;for(let head=0;head<queue.length;head++){const v=queue[head],cx=v%W,cy=Math.floor(v/W);sum+=pixels[v];minx=Math.min(minx,cx);maxx=Math.max(maxx,cx);miny=Math.min(miny,cy);maxy=Math.max(maxy,cy);for(const [nx,ny] of [[cx-1,cy],[cx+1,cy],[cx,cy-1],[cx,cy+1]]){if(nx<0||ny<0||nx>=W||ny>=H)continue;const k=index(nx,ny);if(!seen[k]&&pixels[k]>=218){seen[k]=1;queue.push(k);}}}if(queue.length<5)continue;const width=maxx-minx+1,height=maxy-miny+1,aspect=width/Math.max(height,1),confidence=clamp(.43+.055*aspect+.006*queue.length+.001*(sum/queue.length-218),.1,.99);candidates.push({x:minx,y:miny,w:width,h:height,conf:confidence});}
  const filtered=candidates.filter(o=>o.conf>=+p.confidence),rows=filtered.map((o,i)=>[i+1,o.x,o.y,o.w,o.h,fmt(o.conf),scene]);
  const image=customChart('合成遥感图像的像素连通域检测',(ctx,w,h)=>{const temp=document.createElement('canvas');temp.width=W;temp.height=H;const tctx=temp.getContext('2d'),data=tctx.createImageData(W,H);for(let i=0;i<pixels.length;i++){const v=pixels[i];data.data[4*i]=v-20;data.data[4*i+1]=v;data.data[4*i+2]=Math.min(255,v+12);data.data[4*i+3]=255;}tctx.putImageData(data,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(temp,0,0,w,h);ctx.lineWidth=2;filtered.forEach(o=>{ctx.strokeStyle='#17856c';ctx.strokeRect(o.x/W*w,o.y/H*h,o.w/W*w,o.h/H*h);ctx.fillStyle='#155b4c';ctx.font='13px Arial';ctx.fillText(fmt(o.conf),o.x/W*w,Math.max(13,o.y/H*h-5));});},'框由像素阈值与连通域运算产生；只用于演示检测流程，不能替代训练后的模型。',true);
  return {metrics:[['检测框数',filtered.length+' 个'],['连通域候选',candidates.length+' 个'],['置信度门限',fmt(p.confidence)],['输入规格',p.size+' px']],charts:[image,customChart('批量样本组成示意',(ctx,w,h)=>{const labels=['空白水域','单船','多船'],counts=scene==='无船'?[5,0,0]:[2,4,3];labels.forEach((s,i)=>{ctx.fillStyle=colors[i];ctx.fillRect(65,60+i*76,(w-150)*counts[i]/6,28);ctx.fillStyle='#3b5267';ctx.font='14px Arial';ctx.fillText(`${s}: ${counts[i]}`,65,48+i*76);});})],headers:['编号','左上角 x','左上角 y','宽','高','示意置信度','场景'],rows,explain:'本演示在合成像素图上实际执行阈值分割与连通域定位。真实毕业设计需从 Airbus 标注解码 RLE、按影像划分训练/验证/测试集，迁移训练轻量检测模型，并在独立测试集报告 AP50、查准率、查全率与耗时。'};
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
  return {metrics:[['检测步数',steps+' 步'],['估计总距离',fmt(steps*(+p.stride))+' m'],['终点误差',fmt(dist(end,ref))+' m'],['磁场质量',p.magnetic==='开启'?'异常提示':'正常']],charts:[seriesChart('平面轨迹与独立检查点',[xy(truth,'测量路线',colors[0]),xy(estimate,'PDR 推算',colors[2])],'无连续位置真值时只比较已测检查点与终点。',true),seriesChart('加速度模长与检测峰值',[xy(acc,'模长 m/s²',colors[0]),xy(peaks,'有效步峰',colors[1])])],headers:['时间 s','加速度模长','有效步峰','累计步数','估计东 m','估计北 m','航向 °'],rows,explain:'先检测加速度峰值和最小步间隔，再按标定步长与航向逐步更新。磁场异常选项用于提示航向质量。真实系统需使用手机传感器时间戳、固定携带方式与独立测量路线。'};
}

const simulators={1:sim1,2:sim2,3:sim3,4:sim4,5:sim5,6:sim6,7:sim7,8:sim8,9:sim9,10:sim10};

function drawLineChart(canvas,series){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,pad={l:48,r:18,t:22,b:34};ctx.clearRect(0,0,w,h);ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
  const valid=series.flatMap(s=>s.values).filter(v=>v&&Number.isFinite(v[0])&&Number.isFinite(v[1]));if(!valid.length)return;
  let xmin=Math.min(...valid.map(v=>v[0])),xmax=Math.max(...valid.map(v=>v[0])),ymin=Math.min(...valid.map(v=>v[1])),ymax=Math.max(...valid.map(v=>v[1]));if(xmax===xmin)xmax++;if(ymax===ymin)ymax++;
  const xm=(xmax-xmin)*.04,ym=(ymax-ymin)*.08;xmin-=xm;xmax+=xm;ymin-=ym;ymax+=ym;const X=x=>pad.l+(x-xmin)/(xmax-xmin)*(w-pad.l-pad.r),Y=y=>h-pad.b-(y-ymin)/(ymax-ymin)*(h-pad.t-pad.b);
  ctx.font='12px Arial';ctx.lineWidth=1;for(let j=0;j<=4;j++){let yy=pad.t+(h-pad.t-pad.b)*j/4;ctx.strokeStyle='#e6edf1';ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(w-pad.r,yy);ctx.stroke();ctx.fillStyle='#6b7d8d';ctx.fillText(fmt(ymax-(ymax-ymin)*j/4,1),5,yy+4);}
  for(let j=0;j<=4;j++){let xx=pad.l+(w-pad.l-pad.r)*j/4;ctx.strokeStyle='#e6edf1';ctx.beginPath();ctx.moveTo(xx,pad.t);ctx.lineTo(xx,h-pad.b);ctx.stroke();ctx.fillStyle='#6b7d8d';ctx.fillText(fmt(xmin+(xmax-xmin)*j/4,1),xx-12,h-10);}
  series.forEach(s=>{ctx.strokeStyle=s.color;ctx.lineWidth=s.values.length<8?2.5:1.8;ctx.beginPath();let started=false;for(const value of s.values){if(!value||!Number.isFinite(value[1])){started=false;continue;}const x=X(value[0]),y=Y(value[1]);if(!started){ctx.moveTo(x,y);started=true;}else ctx.lineTo(x,y);}ctx.stroke();if(s.values.length<9)s.values.forEach(v=>{ctx.beginPath();ctx.arc(X(v[0]),Y(v[1]),4,0,2*Math.PI);ctx.fillStyle=s.color;ctx.fill();});});
}

function htmlEscape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fieldHtml(f){const common=`id="field-${f.key}" data-key="${f.key}"`;if(f.type==='select')return `<label>${htmlEscape(f.label)}<select ${common}>${f.options.map(o=>`<option value="${htmlEscape(o)}" ${String(o)===String(f.value)?'selected':''}>${htmlEscape(o)}</option>`).join('')}</select></label>`;return `<label>${htmlEscape(f.label)} <span class="field-value" id="value-${f.key}">${f.value}</span><input ${common} type="${f.type}" min="${f.min}" max="${f.max}" step="${f.step||1}" value="${f.value}"></label>`;}
function params(){const out={};settings[id].fields.forEach(f=>out[f.key]=document.getElementById('field-'+f.key).value);return out;}
function csvDownload(headers,rows){const csv='\ufeff'+[headers,...rows].map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`graduation-demo-${String(id).padStart(2,'0')}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
let lastResult;
function renderRun(){const result=simulators[id](params());lastResult=result;document.getElementById('metrics').innerHTML=result.metrics.map(([name,value])=>`<div class="metric"><span>${htmlEscape(name)}</span><strong>${htmlEscape(value)}</strong></div>`).join('');document.getElementById('charts').innerHTML=result.charts.map((c,j)=>`<section class="chart ${c.wide?'wide':''}"><h3>${htmlEscape(c.title)}</h3><canvas id="chart-${j}" width="800" height="350"></canvas>${c.type==='lines'?`<div class="legend">${c.series.map(s=>`<span><i style="background:${s.color}"></i>${htmlEscape(s.name)}</span>`).join('')}</div>`:''}${c.note?`<p class="chart-note">${htmlEscape(c.note)}</p>`:''}</section>`).join('');result.charts.forEach((c,j)=>{const canvas=document.getElementById(`chart-${j}`);if(c.type==='lines')drawLineChart(canvas,c.series);else c.draw(canvas.getContext('2d'),canvas.width,canvas.height);});document.getElementById('explain').textContent=result.explain;document.getElementById('table').innerHTML=`<thead><tr>${result.headers.map(h=>`<th>${htmlEscape(h)}</th>`).join('')}</tr></thead><tbody>${result.rows.slice(0,18).map(row=>`<tr>${row.map(v=>`<td>${htmlEscape(v)}</td>`).join('')}</tr>`).join('')}</tbody>`;document.getElementById('status').textContent=`已生成 ${result.rows.length} 条模拟记录`;}

async function boot(){if(!settings[id]){root.textContent='未找到演示题目。';return;}const response=await fetch('../grad-topics.json');const topics=await response.json(),topic=topics.find(v=>v.id===id),cfg=settings[id];document.title=topic.title+' · 独立演示';document.getElementById('page-title').textContent=topic.title;document.getElementById('page-subtitle').textContent=cfg.subtitle;document.getElementById('page-scope').textContent=cfg.scope;
  root.innerHTML=`<div class="lab"><aside class="controls panel"><h2>场景与参数</h2>${cfg.fields.map(fieldHtml).join('')}<div class="buttons"><button id="run">运行 / 更新</button><button id="export" class="secondary">导出 CSV</button></div><div class="control-help"><strong>与设计任务对应</strong><p>${htmlEscape(topic.sections['设计任务1'])}</p><p>${htmlEscape(topic.sections['设计任务2'])}</p></div></aside><div class="results"><div class="results-top"><h2>交互结果</h2><p class="status" id="status"></p></div><div id="metrics" class="metric-grid"></div><div id="charts" class="plot-grid"></div><div class="explain"><strong>方法与边界　</strong><span id="explain"></span></div><div class="panel" style="padding:15px"><h2 style="font-size:15px;color:#173d60;margin:0">模拟数据记录（前 18 行）</h2><div class="data-table-wrap"><table class="data-table" id="table"></table></div></div></div></div>`;
  document.getElementById('run').onclick=renderRun;document.getElementById('export').onclick=()=>csvDownload(lastResult.headers,lastResult.rows);cfg.fields.forEach(f=>{const el=document.getElementById('field-'+f.key);el.addEventListener('input',()=>{const v=document.getElementById('value-'+f.key);if(v)v.textContent=el.value;});el.addEventListener('change',renderRun);});renderRun();}
boot().catch(error=>{root.textContent='演示加载失败：'+error.message;console.error(error);});
