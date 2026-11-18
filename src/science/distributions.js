import jStat from 'jstat'
import {philox, streamId} from '../engine/rng.js'

export const distributions = {
  constant: ['Constant', ['Fixed value'], [1]],
  weibull: ['Weibull', ['Shape','Scale'], [2,3]],
  normal: ['Normal', ['Mean','Standard deviation'], [0,1]],
  uniform: ['Uniform', ['Minimum','Maximum'], [0,1]],
  discrete: ['Discrete uniform', ['Minimum integer','Maximum integer'], [1,6]],
  bernoulli: ['Bernoulli', ['Success probability'], [.5]],
  binomial: ['Binomial', ['Trials (0–100)','Success probability'], [10,.5]],
  categorical: ['Categorical', ['Probabilities for categories 1, 2, … (sum to 1)'], ['0.2, 0.3, 0.5']],
  truncated: ['Truncated normal', ['Parent mean','Parent standard deviation','Lower bound','Upper bound'], [0,1,-1,2]],
  lognormal: ['Lognormal', ['Log-space mean','Log-space standard deviation'], [0,.5]],
  triangular: ['Triangular', ['Minimum','Mode','Maximum'], [1,3,8]],
  beta: ['Beta', ['Shape α','Shape β'], [2,5]],
  gamma: ['Gamma', ['Shape','Scale'], [2,3]],
  exponential: ['Exponential', ['Rate per unit'], [1]],
  poisson: ['Poisson', ['Mean count (0–100)'], [4]],
  empirical: ['Empirical', ['Equally weighted observations'], ['2, 3, 3, 5, 8']],
}
const sorted = values => [...values].sort((a,b)=>a-b)
const oneOf = p => p>=0 && p<=1
function invalid(message) { throw Error(message) }
function numeric(x) {
  if(x===null || String(x).trim()==='' || !Number.isFinite(Number(x))) invalid('Enter a finite number in every parameter field.')
  return Number(x)
}
function discreteLaw(values,masses) {
  const total=masses.reduce((s,x)=>s+x,0)
  let sum=0
  const cuts=masses.map(x=>(sum+=x)/total)
  return {
    discrete:true,
    pdf:x=>values.reduce((s,v,i)=>v===x?s+masses[i]/total:s,0),
    inv:p=>values[Math.max(0,cuts.findIndex(x=>x>=p))],
    cdf:x=>values.reduce((s,v,i)=>v<=x?s+masses[i]/total:s,0),
    mean:values.reduce((s,x,i)=>s+x*masses[i]/total,0),
  }
}
export function lawFor(kind, fields) {
  if (!Object.hasOwn(distributions,kind) || fields.length!==distributions[kind][1].length) invalid('Choose a distribution and its parameters.')
  if(kind==='categorical' || kind==='empirical') {
    const values=String(fields[0]).split(',').map(numeric)
    if(values.length>256) invalid('Enter up to 256 comma-separated values.')
    if(kind==='empirical') return discreteLaw(sorted(values),values.map(()=>1))
    if(values.some(v=>!oneOf(v)) || Math.abs(values.reduce((s,x)=>s+x,0)-1)>1e-12) invalid('Enter nonnegative category probabilities that sum to 1.')
    return discreteLaw(values.map((_,i)=>i+1),values)
  }
  const params=fields.map(numeric)
  const [a,b,c,d]=params
  if(kind==='constant') return discreteLaw([a],[1])
  if(kind==='weibull'){
    if(a<=0||b<=0) invalid('Weibull shape and scale must both be positive.')
    // jStat expects scale, shape, while the editor uses shape, scale.
    params.splice(0,2,b,a)
  }
  if(kind==='discrete') {
    if(![a,b].every(Number.isSafeInteger)||a>b||b-a>9999) invalid('Use ordered integer bounds with at most 10,000 possible values.')
    return {discrete:true,pdf:x=>Number.isInteger(x)&&x>=a&&x<=b?1/(b-a+1):0,mean:a+(b-a)/2,inv:p=>Math.min(b,a+Math.floor(p*(b-a+1))),cdf:x=>Math.max(0,Math.min(1,(Math.floor(x)-a+1)/(b-a+1)))}
  }
  if(kind==='bernoulli') {
    if(!oneOf(a)) invalid('Probability must be between 0 and 1.')
    return discreteLaw([0,1],[1-a,a])
  }
  if(kind==='binomial' || kind==='poisson') {
    const binomial=kind==='binomial'
    if(a<0 || a>100 || (binomial && (!Number.isInteger(a)||!oneOf(b)))) invalid('Use a count parameter from 0 to 100 and a valid probability. Binomial trials must be integers.')
    if(a===0 || (binomial && b===0)) return discreteLaw([0],[1])
    if(binomial && b===1) return discreteLaw([a],[1])
    const cdf=x=>x<0?0:binomial?jStat.binomial.cdf(Math.floor(x),a,b):1-jStat.lowRegGamma(Math.floor(x)+1,a)
    return {discrete:true,mean:binomial?a*b:a,pdf:x=>Number.isInteger(x)&&x>=0?cdf(x)-cdf(x-1):0,cdf,inv:p=>{
      let low=0,high=binomial?a:Math.ceil(a+12*Math.sqrt(a)+30)
      while(low<high) {
        const mid=Math.floor((low+high)/2)
        if(cdf(mid)>=p) high=mid
        else low=mid+1
      }
      return low
    }}
  }
  if(['normal','lognormal','truncated'].includes(kind) && b<=0) invalid('Standard deviation must be positive.')
  if(['gamma','beta'].includes(kind) && !(a>0&&b>0)) invalid('Both shape or scale parameters must be positive.')
  if(kind==='exponential' && a<=0) invalid('Rate must be positive.')
  if(kind==='uniform' && a>=b) invalid('Maximum must exceed minimum.')
  if(kind==='triangular') {
    if(!(a<c && a<=b && b<=c)) invalid('Set minimum ≤ mode ≤ maximum with a positive range.')
    params.splice(1,2,c,b)
  }
  if(kind==='truncated') {
    if(c>=d) invalid('Upper bound must exceed lower bound.')
    const lower=jStat.normal.cdf(c,a,b), mass=jStat.normal.cdf(d,a,b)-lower
    if(mass<1e-10) invalid('The selected interval is too far into the tail for this preview.')
    return {pdf:x=>x<c||x>d?0:jStat.normal.pdf(x,a,b)/mass,mean:a+b*b*(jStat.normal.pdf(c,a,b)-jStat.normal.pdf(d,a,b))/mass,
      inv:p=>jStat.normal.inv(lower+p*mass,a,b),cdf:x=>Math.max(0,Math.min(1,(jStat.normal.cdf(x,a,b)-lower)/mass))}
  }
  const law=jStat[kind]
  return {mean:law.mean(...params),pdf:x=>law.pdf(x,...params),inv:p=>law.inv(p,...params),cdf:x=>law.cdf(x,...params)}
}
export function previewDistribution(kind,fields,seed,n) {
  if(!Number.isInteger(seed)||seed<0||seed>4294967295) invalid('Enter an integer seed between 0 and 4294967295.')
  if(!Number.isInteger(n)||n<1||n>10000) invalid('Choose from 1 through 10,000 preview draws.')
  const law=lawFor(kind,fields)
  const stream=streamId('studio/'+kind)
  const draws=Array.from({length:n},(_,i)=>law.inv((philox(i,stream,seed)[0]+.5)/4294967296))
  if(!Number.isFinite(law.mean)||draws.some(x=>!Number.isFinite(x))) invalid('These parameters exceed the numerical range. Adjust the scale.')
  const values=sorted(draws)
  const min=values[0],max=values[n-1]
  const integer=law.discrete && draws.every(Number.isSafeInteger)
  const bins=max===min?1:integer?Math.min(30,max-min+1):30
  const width=max===min?1:integer?Math.ceil((max-min+1)/bins):(max-min)/bins
  if(!Number.isFinite(width)||width<=0) invalid('These parameters exceed the preview resolution.')
  const counts=Array(bins).fill(0)
  for(const x of draws) counts[Math.min(bins-1,Math.floor((x-min)/width))]++
  const rows=counts.map((count,i)=>{
    const lo=min+i*width, hi=lo+width
    const cdfBelow=x=>law.cdf(x)-(law.discrete?law.pdf(x):0)
    const lower=cdfBelow(lo)
    const upper=i===bins-1?law.cdf(integer?hi-1:hi):cdfBelow(hi)
    return {lo,hi:integer?hi-1:hi,count,observed:count/n,expected:Math.max(0,upper-lower)}

  })
  const mean=draws.reduce((s,x)=>s+x/n,0)
  return {kind,fields,seed,n,rows,mean,reference:law.mean,draws,median:n%2?values[(n-1)/2]:(values[n/2-1]+values[n/2])/2}
}
