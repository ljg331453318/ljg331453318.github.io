// Logistic classifier with extended Kalman updates. Outcomes are self-reported.
export const MODEL_VERSION = 'ekf-logistic-v1';
export const MIN_CASES = 400;
const RELATIONS = ['用生体','体用比和','体克用','体生用','用克体'];
export const DISCIPLINES = ['engineering','science','medicine','social','other'];

export function featureVector(facts, context = {}) {
  const hour = Number(facts.time.slice(0,2)) + Number(facts.time.slice(3))/60;
  const weekday = new Date(facts.date+'T12:00:00Z').getUTCDay();
  return [1, Math.sin(hour*Math.PI/12), Math.cos(hour*Math.PI/12),
    Math.sin(weekday*Math.PI*2/7), Math.cos(weekday*Math.PI*2/7),
    Number(facts.yellow), Number(facts.timeYellow), Math.min(facts.clashes.length,4)/4,
    Math.min(facts.timeClashes.length,4)/4, Number(facts.writing), Number(facts.timeWriting),
    ...RELATIONS.map(value=>Number(facts.plumRelation===value)),
    ...RELATIONS.map(value=>Number(facts.timeRelation===value)),
    ...DISCIPLINES.map(value=>Number(context.discipline===value)),
    ...['Q1','Q2','Q3','Q4','unknown'].map(value=>Number(context.tier===value)),
    Number(context.stage==='resubmission')];
}

const sigmoid = value => 1/(1+Math.exp(-Math.max(-20,Math.min(20,value))));
export function predict(model, features) {
  return sigmoid(model.weights.reduce((sum,weight,index)=>sum+weight*features[index],0));
}

export function fitKalmanLogistic(rows) {
  const size = rows[0].features.length;
  const weights = Array(size).fill(0);
  const covariance = Array.from({length:size},(_,i)=>Array.from({length:size},(_,j)=>i===j?.5:0));
  for (const row of rows) {
    const x = row.features;
    const probability = sigmoid(weights.reduce((sum,weight,i)=>sum+weight*x[i],0));
    const gradient = x.map(value=>probability*(1-probability)*value);
    for (let i=0;i<size;i++) covariance[i][i]+=0.00001;
    const projection = covariance.map(line=>line.reduce((sum,value,j)=>sum+value*gradient[j],0));
    const noise = Math.max(.02,probability*(1-probability));
    const innovation = noise+gradient.reduce((sum,value,i)=>sum+value*projection[i],0);
    for (let i=0;i<size;i++) weights[i]=Math.max(-8,Math.min(8,weights[i]+projection[i]/innovation*(row.label-probability)));
    for (let i=0;i<size;i++) for (let j=0;j<size;j++) covariance[i][j]-=projection[i]*projection[j]/innovation;
  }
  return {weights};
}

export function trainSubmissionModel(rows) {
  rows = rows.filter(row=>Array.isArray(row.features) && row.features.length===32 && row.features.every(Number.isFinite)
    && [0,1].includes(row.label) && Number.isFinite(row.submittedAt) && Number.isFinite(row.decidedAt)
    && row.decidedAt>=row.submittedAt && typeof row.author==='string');
  const accepted = rows.filter(row=>row.label===1).length;
  const base = {version:MODEL_VERSION, ready:false, cases:rows.length, accepted, rejected:rows.length-accepted, minimum:MIN_CASES};
  const authors = new Set(rows.map(row=>row.author));
  if (rows.length<MIN_CASES || accepted<80 || rows.length-accepted<80 || authors.size<30) {
    return {...base,reason:'样本或独立作者数量不足，学习部分未参与推算'};
  }
  const ordered = [...rows].sort((a,b)=>a.submittedAt-b.submittedAt);
  const cutoff = ordered[Math.floor(ordered.length*.75)].submittedAt;
  const test = ordered.filter(row=>row.submittedAt>=cutoff);
  const testAuthors = new Set(test.map(row=>row.author));
  // A decision must already have been known at the validation prediction time.
  const train = ordered.filter(row=>row.submittedAt<cutoff && row.decidedAt<cutoff && !testAuthors.has(row.author));
  if (train.length<200 || test.length<100 || [0,1].some(label=>train.filter(row=>row.label===label).length<30 || test.filter(row=>row.label===label).length<20)) {
    return {...base,reason:'尚无足够的按时间及作者隔离的验证样本，学习部分未参与推算'};
  }
  const model = fitKalmanLogistic(train);
  const baseline = (train.filter(row=>row.label===1).length+1)/(train.length+2);
  const differences = test.map(row=>(predict(model,row.features)-row.label)**2-(baseline-row.label)**2);
  const delta = differences.reduce((a,b)=>a+b,0)/test.length;
  // Cluster the uncertainty by author, so repeated papers do not masquerade as independent authors.
  const groups=new Map();
  test.forEach((row,index)=>{const values=groups.get(row.author)||[];values.push(differences[index]);groups.set(row.author,values);});
  const authorDeltas=[...groups.values()].map(values=>values.reduce((a,b)=>a+b,0)/values.length);
  if(authorDeltas.length<20) return {...base,reason:'验证集独立作者不足 20 位，学习部分未参与推算'};
  const authorDelta=authorDeltas.reduce((a,b)=>a+b,0)/authorDeltas.length;
  const variance=authorDeltas.reduce((sum,value)=>sum+(value-authorDelta)**2,0)/(authorDeltas.length-1);
  const upperBound=authorDelta+2.1*Math.sqrt(variance/authorDeltas.length);
  const modelBrier = test.reduce((sum,row)=>sum+(predict(model,row.features)-row.label)**2,0)/test.length;
  const baselineBrier = test.reduce((sum,row)=>sum+(baseline-row.label)**2,0)/test.length;
  const metrics = {train:train.length,validation:test.length,validationAuthors:authorDeltas.length,modelBrier,baselineBrier,deltaUpperApprox95:upperBound};
  if (upperBound>=0 || modelBrier>baselineBrier*.95) return {...base,metrics,reason:'留出验证尚未优于基线，学习部分未参与推算'};
  // Keep the evaluated model frozen. Later labels cannot alter the validation fit.
  return {...base,...model,metrics,ready:true,reason:'通过本站预设的留出验证，可提供试验性历史参考'};
}
