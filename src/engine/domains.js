import {sequentialActivities,schedulePlan,scheduleReplication} from './schedule.js'
import {gbmStep} from '../science/gbm.js'
import {philox, streamId} from './rng.js'

// All path steps are independently addressed. Separate input channels occupy
// disjoint blocks of 8192 counter values (the largest path has 5000 steps).
const block = 8192
const kinds = ['integration','montyhall','randomwalk','stock','projectmgmt','manufacturing']
export function isDomain(kind) { return kinds.includes(kind) }

const field = (key,label,value,min,max,integer=false) => ({key,label,value,min,max,integer})
export const domainSpecs = {
  integration:{title:'Monte Carlo Integration', question:'How large is the signed integral over this interval?', samples:1000, unit:'integral units', metric:'Signed integral',event:'Positive contribution',scene:'Integrand and sampled abscissae',
    assumptions:'Sample x uniformly between the endpoints. Each signed contribution equals the oriented interval width times f(x). Reversing the bounds reverses the integral.',
    formula:'I=(b-a)E[f(X)]',fields:[field('a','Lower endpoint a',0,-1000,1000),field('b','Upper endpoint b',Math.PI,-1000,1000)]},
  montyhall:{title:'Monty Hall Problem',question:'How often does switching doors win?',samples:100,unit:'wins per game',metric:'Switch win fraction',event:'Switch wins',scene:'Stay and switch win fractions',
    assumptions:'Three doors. The prize and first choice are independently uniform. The host knows the prize location, opens an unchosen goat door, and breaks ties uniformly. Both strategies use the same game.',
    formula:'P(\\mathrm{switch})=2/3',fields:[]},
  randomwalk:{title:'2D Random Walk',question:'How far do independent walkers travel from the origin?',samples:5,unit:'length²',metric:'Mean squared displacement',event:'Ends at origin',scene:'Lattice trajectories',
    assumptions:'Every walker starts at the origin and takes independent steps of fixed length in the four equally likely cardinal directions.',
    formula:'E[R_n^2]=nL^2',fields:[field('steps','Steps per walker',100,0,5000,true),field('length','Step length',1,.001,1000)]},
  stock:{title:'Stock Price Prediction (GBM)',question:'How do annual drift and volatility shape simulated prices?',samples:5,unit:'price units',metric:'Mean terminal price',event:'Terminal price below threshold',scene:'Simulated price paths',
    assumptions:'Illustrative geometric Brownian motion uses independent Gaussian increments. Drift and volatility are annualized. The trading-year convention controls the size of each daily step.',
    formula:'S_{t+\\Delta t}=S_t\\exp[(\\mu-\\sigma^2/2)\\Delta t+\\sigma\\sqrt{\\Delta t}Z]',fields:[field('price','Initial price',100,0.001,1000000),field('drift','Annual drift',0.05,-2,2),field('volatility','Annual volatility',0.2,0,3),field('steps','Trading days',252,0,1000,true),field('year','Trading days per year',252,100,366,true),field('threshold','Terminal price threshold',100,0,1000000)]},
  projectmgmt:{title:'Project Scheduling & Risk',question:'Will three sequential activities finish before the deadline?',samples:5000,unit:'days',metric:'Mean completion time',event:'Finishes by deadline',scene:'Project duration distribution',
    assumptions:'Procurement, construction and inspection run sequentially in abstract days. Independent lognormal durations have the stated arithmetic means and coefficient of variation. Zero variation gives a fixed schedule.',
    formula:'T=T_p+T_c+T_i',fields:[field('procurement','Mean procurement days',30,0,365),field('construction','Mean construction days',60,0,365),field('inspection','Mean inspection days',10,0,365),field('cv','Duration coefficient of variation',0.2,0,1),field('threshold','Deadline in days',100,0,1000)]},
  manufacturing:{title:'Manufacturing Quality Control',question:'How often does monthly production meet demand?',samples:2000,unit:'equivalent units',metric:'Mean monthly production',event:'Meets demand',scene:'Monthly output distribution',
    assumptions:'Each day is independent. A breakdown stops production for one day. Labor and material factors multiply capacity; their normal draws are clipped to [0.5,1] and [0.4,1]. Output uses equivalent units and a fixed good-yield fraction.',
    formula:'Q=\\sum_d C A_d L_d M_d Y',fields:[field('breakdown','Daily breakdown probability (%)',5,0,100),field('threshold','Monthly demand (units)',2400,0,1000000),field('capacity','Capacity per day (units)',100,0,10000),field('days','Days per period',30,1,365,true),field('yieldRate','Good-yield fraction',1,0,1)]},
}

export const integrands = {'sin':'sin(x)','cos':'cos(x)','one':'1','negative':'−1','linear':'x','square':'x²','gaussian':'exp(−x²)'}
const functions = {sin:Math.sin,cos:Math.cos,one:()=>1,negative:()=>-1,linear:x=>x,square:x=>x*x,gaussian:x=>Math.exp(-x*x)}
export function functionValue(id,x) {return functions[id](x)}

export function defaults(kind) {
  const spec = domainSpecs[kind]
  return {kind,seed:42,samples:spec.samples,params:Object.fromEntries(spec.fields.map(f=>[f.key,f.value])),
    ...(kind==='integration' ? {integrand:'sin'} : {})}
}
export function domainErrors(m) {
  const errors=[]
  for (const f of domainSpecs[m.kind].fields) {
    const v = m.params?.[f.key]
    if (!Number.isFinite(v) || v<f.min || v>f.max || (f.integer && !Number.isInteger(v))) errors.push(f.label+' must be '+(f.integer?'an integer ':'')+'between '+f.min+' and '+f.max+'.')
  }
  if (m.kind==='integration' && (!Object.hasOwn(integrands,m.integrand) || m.params?.a===m.params?.b)) errors.push('Choose a preset function and distinct endpoints.')
  if(m.kind==='projectmgmt' && m.activities!==undefined){
    try {schedulePlan(m.activities)} catch(error){errors.push(error.message)}
  }
  if (m.samples>50000 || m.samples*(m.params?.steps || m.params?.days || 1)>3000000) errors.push('Use up to 50,000 replications and 3,000,000 total steps.')
  return errors
}

export function reference(m) {
  const p=m.params
  if (m.kind==='integration') {
    const primitive = {sin:x=>-Math.cos(x),cos:Math.sin,one:x=>x,negative:x=>-x,linear:x=>x*x/2,square:x=>x**3/3}[m.integrand]
    return primitive ? primitive(p.b)-primitive(p.a) : null
  }
  if (m.kind==='montyhall') return 2/3
  if (m.kind==='randomwalk') return p.steps*p.length**2
  if (m.kind==='stock') return p.price*Math.exp(p.drift*p.steps/p.year)
  if (m.kind==='projectmgmt') {
    if(m.activities===undefined)return p.procurement+p.construction+p.inspection
    const plan=schedulePlan(m.activities)
    if(plan.every(t=>t.distribution==='constant'))
      return scheduleReplication({...m,plan},0).output
    return null
  }
  return null
}

export function compileDomain(m) {
  const spec=domainSpecs[m.kind]
  const namespace = streamId('domain/'+m.kind)
  const schedule=m.kind==='projectmgmt'?{plan:schedulePlan(m.activities??sequentialActivities(m.params))}:{}
  return {...m,...schedule,stream:namespace,question:m.activities?'How often does this activity network finish by its deadline?':spec.question,assumptions:m.activities?'Activities start when all predecessors finish. Durations are independent, in abstract days. Project completion is the latest finish. Beta-PERT uses λ = 4.':spec.assumptions,unit:spec.unit,reference:reference(m)}
}

function random(m,i,channel,step=0) {
  return philox(i,(m.stream+channel*block+step)>>>0,m.seed)
}
function uniform(m,i,channel,step=0) {return random(m,i,channel,step)[0]/4294967296}
function normal(m,i,channel,step=0) {
  const [u,v]=random(m,i,channel,step)
  return Math.sqrt(-2*Math.log1p(-u/4294967296))*Math.cos(2*Math.PI*v/4294967296)
}

export function playGame(prize,pick,tie) {
  const eligible=[0,1,2].filter(d=>d!==prize && d!==pick)
  const opened=eligible[Math.floor(tie*eligible.length)]
  const switched=3-pick-opened
  return {prize:prize+1,pick:pick+1,opened:opened+1,switched:switched+1}
}

export function domainReplication(m,i,paths,bands,walk) {
  const p=m.params
  switch(m.kind) {
    case 'integration': {
      const x=p.a+(p.b-p.a)*uniform(m,i,0)
      const y=functionValue(m.integrand,x)
      return {inputs:{x,y},output:(p.b-p.a)*y,event:(p.b-p.a)*y>0}
    }
    case 'montyhall': {
      const inputs=playGame(Math.floor(3*uniform(m,i,0)),Math.floor(3*uniform(m,i,1)),uniform(m,i,2))
      const event=inputs.prize===inputs.switched
      return {inputs,output:Number(event),event}
    }
    case 'randomwalk': {
      let east=0,north=0
      const path=i<8?[[0,0]]:null
      const stride=Math.ceil(p.steps/64)
      let col=0
      for(let t=0;t<p.steps;t++){
        const direction=Math.floor(uniform(m,i,0,t)*4)
        if(direction===0) east++
        if(direction===1) east--
        if(direction===2) north++
        if(direction===3) north--
        path?.push([east*p.length,north*p.length])
        if((t+1)%stride===0||t+1===p.steps){
          if(!walk.msd[col])walk.msd[col]={step:t+1,sum:0}
          walk.msd[col++].sum+=(east**2+north**2)*p.length**2
        }
      }
      if(path) paths.push(path)
      walk.endpoints.push([east*p.length,north*p.length])
      return {inputs:{x:east*p.length,y:north*p.length},output:(east*east+north*north)*p.length**2,event:east===0&&north===0}
    }
    case 'stock': {
      let price=p.price
      const path=i<8?[[0,price]]:null
      const stride=Math.max(1,Math.ceil(p.steps/64))
      let column=0
      for(let t=0;t<p.steps;t++){
        price=gbmStep(price,p.drift,p.volatility,1/p.year,normal(m,i,0,t))
        if ((t+1)%stride===0 || t+1===p.steps) {
          path?.push([t+1,price])
          if(!bands[column]) bands[column]={day:t+1,prices:[]}
          bands[column++].prices.push(price)
        }
      }
      if(path) paths.push(path)
      return {inputs:{terminal:price},output:price,event:price<p.threshold}
    }
    case 'projectmgmt': return scheduleReplication(m,i)
    case 'manufacturing': {
      let output=0,downDays=0
      for(let d=0;d<p.days;d++){
        if(uniform(m,i,0,d)<p.breakdown/100){downDays++;continue}
        const labor=Math.min(1,Math.max(.5,.9+.05*normal(m,i,1,d)))
        const material=Math.min(1,Math.max(.4,.85+.1*normal(m,i,2,d)))
        output+=p.capacity*labor*material*p.yieldRate
      }
      return {inputs:{downDays,activeDays:p.days-downDays},output,event:output>=p.threshold}
    }
  }
}

export function quantile(ordered,p) {
  const t=p*(ordered.length-1),a=Math.floor(t)
  return ordered[a]+(t-a)*(ordered[Math.ceil(t)]-ordered[a])
}

export function describeOutputs(values) {
  const sorted=[...values].sort((a,b)=>a-b)
  const low=sorted[0], high=sorted.at(-1)
  const count=high===low?1:30, width=(high-low)/count
  const histogram=Array.from({length:count},(_,i)=>({low:low+i*width,high:low+(i+1)*width,count:0}))
  for(const v of sorted) histogram[Math.min(count-1,width?Math.floor((v-low)/width):0)].count++
  return {quantiles:[.05,.25,.5,.75,.8,.9,.95].map(p=>({p,value:quantile(sorted,p)})),histogram}
}

export function walkSummary(walk) {
  const n=walk.endpoints.length
  let bound=0
  for(const [x,y] of walk.endpoints)bound=Math.max(bound,Math.abs(x),Math.abs(y))
  bound=bound||1
  const bins=20,width=2*bound/bins
  const counts=new Uint32Array(bins*bins)
  const idx=v=>Math.max(0,Math.min(bins-1,Math.floor((v+bound)/width)))
  for(const [x,y] of walk.endpoints)counts[idx(y)*bins+idx(x)]++
  const cells=[]
  counts.forEach((count,i)=>{
    if(count)cells.push({x:-bound+(i%bins)*width,y:-bound+Math.floor(i/bins)*width,width,count})
  })
  return {endpoints:walk.endpoints.slice(0,2048),cells,bound,msd:walk.msd.map(d=>[d.step,d.sum/n])}
}
