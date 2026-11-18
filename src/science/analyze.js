import {compile, sample, criticalT, wilson, eventOccurs} from '../engine/index.js'
import {streamId} from '../engine/rng.js'
import jStat from 'jstat'
import {evaluate} from '../engine/formula.js'

function moments() {
  return {n:0,mean:0,m2:0}
}
function add(m,x) {
  m.n++
  const delta=x-m.mean
  m.mean+=delta/m.n
  m.m2+=delta*(x-m.mean)
  if(!Number.isFinite(m.m2)) throw Error('The output exceeds the numerical range. Rescale the inputs.')
}
function interval(m) {
  if(m.n<2) return null
  const radius=criticalT(m.n-1)*Math.sqrt(m.m2/(m.n*(m.n-1)))
  return [m.mean-radius,m.mean+radius]
}
function output(model,i) {
  const inputs=Object.create(null)
  for(const v of model.inputs) inputs[v.name]=sample(v,i,model.seed)
  const result=evaluate(model.ast,inputs)
  if(!Number.isFinite(result)) throw Error('Nonfinite output at replication '+(i+1)+'. Check the formula and input support.')
  return result
}
function describe(values) {
  values.sort()
  const n=values.length
  const quantile=p=>{
    const k=(n-1)*p,i=Math.floor(k)
    return values[i]+(k-i)*(values[Math.ceil(k)]-values[i])
  }
  const min=values[0],max=values[n-1],bins=min===max?1:Math.min(32,n)
  const width=min===max?1:(max-min)/bins
  if(!Number.isFinite(width)||width<=0) throw Error('The range of outputs exceeds the histogram resolution.')
  const counts=Array(bins).fill(0)
  for(const v of values) counts[Math.min(bins-1, Math.floor((v-min)/width))]++
  return {quantiles:[.05,.25,.5,.75,.95].map(quantile),
    rows:counts.map((count,i)=>({lo:min+i*width,hi:i===bins-1?max:min+(i+1)*width,count,observed:count/n}))}
}
function independentDifference(left,right) {
  if(left.n<2||right.n<2) return null
  const l=left.m2/(left.n*(left.n-1)),r=right.m2/(right.n*(right.n-1))
  const df=(l+r)**2/(l*l/(left.n-1)+r*r/(right.n-1))
  const diff=right.mean-left.mean
  const radius=l+r===0?0:jStat.studentt.inv(.975,df)*Math.sqrt(l+r)
  return [diff-radius,diff+radius]
}

export function analyze(config, alternative=null, progress=()=>{}, coupling='paired') {
  if(config.kind!=='builder') throw Error('Choose a Builder model for this analysis.')
  const a=compile(config),b=alternative?compile(alternative):null
  if(b&&(a.samples!==b.samples||a.seed!==b.seed)) throw Error('Paired models require the same seed and replication count.')
  if(b && coupling==='independent') {
    const used=new Set(a.inputs.map(v=>v.stream))
    for(const input of b.inputs) {
      let key='alternative/'+input.name
      while(used.has(streamId(key))) key+='/'
      input.stream=streamId(key)
      used.add(input.stream)
    }
  }
  const baseline=moments(),alternativeMean=moments(),change=moments(),chanceChange=moments()
  const values=new Float64Array(a.samples)
  const altValues=b?new Float64Array(a.samples):null
  let successes=0,altSuccesses=0
  const convergence=[],stride=Math.ceil(a.samples/80)
  for(let i=0;i<a.samples;i++) {
    const y=output(a,i),yes=Number(eventOccurs(y,a))
    values[i]=y;successes+=yes;add(baseline,y)
    if(b) {
      const z=output(b,i),altYes=Number(eventOccurs(z,b))
      altValues[i]=z
      altSuccesses+=altYes;add(alternativeMean,z);add(change,z-y);add(chanceChange,altYes-yes)
    }
    if(i===0||(i+1)%stride===0||i+1===a.samples) {
      convergence.push({n:i+1,mean:baseline.mean})
      progress(i+1)
    }
  }
  let differenceCI=interval(chanceChange)
  if(b && coupling==='independent') {
    const left=successes/a.samples,right=altSuccesses/b.samples
    const l=wilson(successes,a.samples),r=wilson(altSuccesses,b.samples)
    differenceCI=[right-left-Math.hypot(right-r[0],l[1]-left),right-left+Math.hypot(r[1]-right,left-l[0])]
  }
  return {...describe(values),n:a.samples,seed:a.seed,convergence,
    mean:baseline.mean,sd:a.samples>1?Math.sqrt(baseline.m2/(a.samples-1)):null,meanCI:interval(baseline),
    probability:successes/a.samples,probabilityCI:wilson(successes,a.samples),
    paired:b?{coupling,quantiles:describe(altValues).quantiles,mean:alternativeMean.mean,probability:altSuccesses/a.samples,meanChange:change.mean,meanCI:coupling==='paired'?interval(change):independentDifference(baseline,alternativeMean),probabilityChange:chanceChange.mean,probabilityChangeCI:differenceCI}:null}
}
