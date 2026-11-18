import { philox, streamId } from '../engine/rng.js'
import { criticalT, wilson } from '../engine/index.js'

const integer = (key, label, value, min, max) => ({key,label,value,min,max,step:1})
const real = (key, label, value, min, max) => ({key,label,value,min,max,step:'any'})
const choice = (key, label, value, options) => ({key,label,value,options})
export const examples = {
  coins: {
    title:'Coin & Dice Experiments', question:'How closely do observed counts follow their expected frequencies?',
    assumptions:'Each replication uses independent tosses of the same coin or one fair six-sided die.',
    fields:[choice('mode','Experiment','coin',['coin','die']),integer('tosses','Tosses per coin experiment',5,1,50),real('p','Probability of heads',0.5,0,1)],
    metric:p => p.mode === 'coin' ? 'Mean heads per experiment' : 'Mean die face',
    reference:p => p.mode === 'coin' ? p.tosses*p.p : 3.5,
  },
  birthday: {
    title:'Birthday Paradox', question:'How often do two people in a group share a birthday?',
    assumptions:'Birthdays are independent and uniformly distributed across 365 days. Leap days are excluded.',
    fields:[integer('people','People in each group',23,1,366)],
    metric:()=>'Probability of a shared birthday', probability:true,
    reference:p => { let distinct=1; for(let i=0;i<p.people;i++) distinct *= (365-i)/365; return 1-distinct },
  },
  reliability: {
    title:'System Reliability', question:'How does component arrangement change system survival?',
    assumptions:'Three independent components each either survive or fail over the same mission. Series requires all three, and parallel requires at least one.',
    fields:[choice('layout','Connection','series',['series','parallel']),...['a','b','c'].map((key,i)=>real(key,'Component '+(i+1)+' survival probability',0.9,0,1))],
    metric:()=>'System survival probability', probability:true,
    reference:p => p.layout === 'series' ? p.a*p.b*p.c : 1-(1-p.a)*(1-p.b)*(1-p.c),
  },
  queue: {
    title:'Queueing & Service Operations', question:'How much time do customers spend waiting for a single server?',
    assumptions:'Each FCFS queue starts empty. Interarrival and service times are independent exponentials. The first customers are warm-up; the next customers form the measured cohort. A departure at the arrival instant frees the server first.',
    fields:[real('arrival','Arrivals per hour',4,0.01,100),real('service','Service completions per hour',6,0.01,100),integer('warmup','Warm-up customers',40,0,500),integer('customers','Measured customers per queue',100,1,500)],
    metric:()=>'Mean waiting time (minutes)',
    reference:p => p.arrival < p.service ? 60*p.arrival/(p.service*(p.service-p.arrival)) : null,
  },
  inventory: {
    title:'Inventory & Reorder Planning', question:'What does a higher reorder point cost under the same demand?',
    assumptions:'Daily demand is an independent discrete uniform count between zero and the maximum. At each daily review, receive due orders, serve demand from stock, and lose unfilled sales. If ending stock plus outstanding orders is at or below the reorder point, place one fixed-size order. Lead time is measured in whole days. Both policies face identical demand.',
    fields:[integer('days','Planning horizon (days)',30,1,180),integer('initial','Initial stock (units)',30,0,2000),integer('demand','Maximum daily demand (units)',12,0,100),integer('point','Baseline reorder point (units)',10,0,1000),integer('alternate','Alternative reorder point (units)',18,0,1000),integer('order','Order size (units)',24,1,1000),integer('lead','Lead time (days)',3,1,30),real('holding','Holding cost per unit per day',0.2,0,100),real('lost','Lost sale cost per unit',3,0,1000),real('target','Unit fill-rate target',0.95,0,1)],
    metric:()=>'Mean baseline cost (cost units per horizon)',reference:()=>null,
  },
}
export function defaults(id) {
  return {id,seed:42,samples:1000,...Object.fromEntries(examples[id].fields.map(f=>[f.key,f.value]))}
}
export function issues(p) {
  if (!p || !Object.hasOwn(examples,p.id)) return ['Choose an available experiment.']
  const fields=[...examples[p.id].fields,integer('seed','Seed',0,0,4294967295),integer('samples','Replications',0,1,100000)]
  const messages=[]
  for(const f of fields){
    const v=p[f.key]
    if(f.options) { if(!f.options.includes(v)) messages.push('Choose a valid '+f.label.toLowerCase()+'.') }
    else if(!Number.isFinite(v)||v<f.min||v>f.max||(f.step===1&&!Number.isInteger(v))) messages.push(f.label+' must be '+(f.step===1?'a whole number ':'')+'from '+f.min+' to '+f.max+'.')
  }
  const steps={coins:p.mode==='coin'?p.tosses:1,birthday:p.people,reliability:3,queue:p.warmup+p.customers,inventory:p.days}[p.id]
  if(p.samples*steps>10000000) messages.push('Reduce the workload to 10 million steps or fewer.')
  return messages
}

function inventoryPath(p,demands,threshold,record) {
  const arrivals=new Float64Array(p.days+p.lead)
  let stock=p.initial, outstanding=0,served=0,unfilled=0,stockouts=0,holdingCost=0
  const days=[]
  for(let day=0;day<p.days;day++){
    stock+=arrivals[day]
    outstanding-=arrivals[day]
    const supply=Math.min(stock,demands[day])
    stock-=supply
    served+=supply
    unfilled+=demands[day]-supply
    stockouts+=Number(demands[day]>supply)
    const ordered=stock+outstanding<=threshold ? p.order : 0
    arrivals[day+p.lead]+=ordered
    outstanding+=ordered
    holdingCost+=stock*p.holding
    if(record) days.push({day:day+1,demand:demands[day],stock,received:arrivals[day],ordered})
  }
  return {cost:holdingCost+unfilled*p.lost,served,unfilled,stockouts,holdingCost,days}
}

export function replicate(p,index,record=false) {
  const key=streamId(p.id)
  // Independent counter pair for each replication and draw; no batch-dependent state.
  let draw=0
  const nextWord=()=>philox(index,draw++,p.seed ^ key)[0]
  const uniform=()=>(nextWord()+0.5)/4294967296
  // Equal-sized integer buckets with rejection of the short tail.
  const integerBelow=bound=>{
    const bucket=Math.floor(4294967296/bound),limit=bucket*bound
    let word
    do { word=nextWord() } while(word>=limit)
    return Math.floor(word/bucket)
  }
  if(p.id==='coins'){
    let value=0
    if(p.mode==='coin') for(let j=0;j<p.tosses;j++) value+=Number(uniform()<p.p)
    else value=1+integerBelow(6)
    return {value,category:value}
  }
  if(p.id==='birthday'){
    const seen=new Set(), days=[]
    let shared=false
    for(let i=0;i<p.people;i++){
      const day=1+integerBelow(365)
      if(seen.has(day)) shared=true
      seen.add(day)
      if(record) days.push(day)
      else if(shared) break
    }
    return {value:Number(shared),scene:days}
  }
  if(p.id==='reliability'){
    const components=[p.a,p.b,p.c].map(prob=>uniform()<prob)
    return {value:Number(p.layout==='series'?components.every(Boolean):components.some(Boolean)),scene:components}
  }
  if(p.id==='queue'){
    let arrival=0,end=0,wait=0,first=0,serviceSum=0
    const scene=[]
    for(let i=0;i<p.warmup+p.customers;i++){
      arrival-=Math.log(uniform())*60/p.arrival
      const start=Math.max(arrival,end)
      const service=-Math.log(uniform())*60/p.service
      end=start+service
      if(i<p.warmup) continue
      if(i===p.warmup) first=arrival
      serviceSum+=service
      wait+=start-arrival
      if(record&&scene.length<24) scene.push({customer:i-p.warmup+1,arrival,start,end})
    }
    // Observe the measured cohort from its first arrival until its last departure.
    // The integral of waiting cohort size equals the sum of its individual waits.
    return {value:wait/p.customers,scene,wait,window:end-first,serviceSum}
  }
  const demands=Array.from({length:p.days},()=>integerBelow(p.demand+1))
  const base=inventoryPath(p,demands,p.point,record),alt=inventoryPath(p,demands,p.alternate,record)
  return {value:base.cost,scene:base.days,altScene:alt.days,base,alt}
}

export function experiment(p) {
  const errors=issues(p)
  if(errors.length) throw new Error(errors.join(' '))
  const meta=examples[p.id], totals={},frequencies={},values=new Float64Array(p.samples),convergence=[]
  let n=0, mean=0,m2=0,scene,altScene
  const add=(key,v)=>{totals[key]=(totals[key]??0)+v}
  function step(batch){
    const stop=Math.min(n+batch,p.samples)
    while(n<stop){
      const trial=replicate(p,n,n===0)
      if(n===0){scene=trial.scene;altScene=trial.altScene}
      if(p.id==='coins') frequencies[trial.value]=(frequencies[trial.value]??0)+1
      if(p.id==='queue') for(const key of ['window','wait','serviceSum']) add(key,trial[key])
      if(p.id==='inventory') for(const policy of ['base','alt']){
        for(const key of ['served','unfilled','stockouts','holdingCost','cost']) add(policy+key,trial[policy][key])
      }
      values[n]=trial.value
      n++
      const delta=trial.value-mean
      mean+=delta/n
      m2+=delta*(trial.value-mean)
      if(n===1||n===p.samples||n%Math.ceil(p.samples/100)===0) convergence.push({n,mean})
    }
    return n
  }
  function result(){
    const sorted=values.slice(0,n).sort()
    const radius=n>1?criticalT(n-1)*Math.sqrt(m2/(n*(n-1))):null
    const interval=meta.probability?wilson(Math.round(mean*n),n):radius===null?null:[mean-radius,mean+radius]
    const quantile=q=>{
      const i=(n-1)*q
      return sorted[Math.floor(i)]+(sorted[Math.ceil(i)]-sorted[Math.floor(i)])*(i%1)
    }
    const min=sorted[0],max=sorted[n-1]
    const discrete=p.id==='coins'||meta.probability
    const bins=discrete?max-min+1:min===max?1:Math.min(24,Math.ceil(Math.sqrt(n)))
    const width=discrete||min===max?1:(max-min)/bins
    const histogram=Array.from({length:bins},(_,i)=>({low:min+i*width,high:discrete||min===max?min+i*width:min+(i+1)*width,count:0}))
    for(const value of sorted) histogram[Math.min(bins-1,Math.floor((value-min)/width))].count++
    return {n,mean,interval,totals,frequencies,scene,altScene,convergence,histogram,
      cdf:Array.from({length:101},(_,i)=>({q:i/100,value:quantile(i/100)})),
      reference:meta.reference(p)}
  }
  return {step,result}
}
