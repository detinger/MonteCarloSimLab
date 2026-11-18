import jStat from 'jstat'
import {philox,streamId} from './rng.js'

export const durationFamilies={
  constant:['Fixed duration',['Duration (days)']],
  lognormal:['Lognormal',['Mean (days)','Coefficient of variation']],
  triangular:['Triangular',['Minimum (days)','Mode (days)','Maximum (days)']],
  pert:['Beta-PERT (λ = 4)',['Minimum (days)','Mode (days)','Maximum (days)']],
  truncated:['Normal truncated at zero',['Parent mean (days)','Parent SD (days)']],
}
const legacy=['procurement','construction','inspection']
export function sequentialActivities(params) {
  return legacy.map((id,i)=>({id,label:id[0].toUpperCase()+id.slice(1),distribution:'lognormal',
    a:params[id],b:params.cv,dependsOn:i?[legacy[i-1]]:[]}))
}

export function schedulePlan(activities) {
  if(!Array.isArray(activities)||activities.length<1||activities.length>32)throw Error('Use between one and 32 activities.')
  const seen=new Set(),streams=new Set()
  const tasks=activities.map(task=>{
    if(!task||typeof task.id!=='string'||!/^[A-Za-z][A-Za-z0-9_]{0,31}$/.test(task.id)||seen.has(task.id))
      throw Error('Each activity needs a unique identifier beginning with a letter.')
    seen.add(task.id)
    if(typeof task.label!=='string'||!task.label.trim()||task.label.length>100)throw Error(task.id+' needs a name of at most 100 characters.')
    const {distribution,a,b,c,dependsOn}=task
    if(!Object.hasOwn(durationFamilies,distribution))throw Error(task.id+' has an unsupported duration family.')
    const fields=[a,b,c].slice(0,durationFamilies[distribution][1].length)
    if(fields.some(x=>!Number.isFinite(x)||x<0||x>1e6))throw Error(task.id+' needs finite parameters from zero to one million.')
    if(['triangular','pert'].includes(distribution) && !(a<=b&&b<=c&&a<c))throw Error(task.id+' requires minimum ≤ mode ≤ maximum, with positive range.')
    if(distribution==='truncated'&&b<=0)throw Error(task.id+' needs positive parent SD. Use Fixed duration for a deterministic activity.')
    if(distribution==='lognormal'&&b>10)throw Error(task.id+' needs a coefficient of variation of at most 10.')
    if(!Array.isArray(dependsOn)||dependsOn.some(id=>typeof id!=='string')||new Set(dependsOn).size!==dependsOn.length)
      throw Error(task.id+' needs a list of distinct predecessor identifiers.')
    const old=legacy.indexOf(task.id)
    const stream=old<0?streamId('schedule/'+task.id):(streamId('domain/projectmgmt')+old*8192)>>>0
    if(streams.has(stream))throw Error('Choose a different identifier for '+task.id+' to use a unique random stream.')
    streams.add(stream)
    return {id:task.id,label:task.label,distribution,dependsOn:[...dependsOn],stream,
      ...Object.fromEntries(fields.map((value,i)=>['abc'[i],value]))}
  })
  for(const task of tasks)for(const id of task.dependsOn)if(!seen.has(id))throw Error(task.id+' references missing predecessor '+id+'.')
  const ordered=[],complete=new Set()
  while(ordered.length<tasks.length) {
    const next=tasks.find(t=>!complete.has(t.id)&&t.dependsOn.every(id=>complete.has(id)))
    if(!next)throw Error('Dependency cycle among '+tasks.filter(t=>!complete.has(t.id)).map(t=>t.id).join(', ')+'.')
    complete.add(next.id)
    ordered.push(next)
  }
  return ordered
}

function duration(task,index,seed) {
  const {distribution,a,b,c,stream}=task
  if(distribution==='constant')return a
  const [word,angle]=philox(index,stream,seed)
  const u=word/4294967296
  if(distribution==='triangular'){
    const mode=(b-a)/(c-a)
    return u<mode?a+(c-a)*Math.sqrt(u*mode):c-(c-a)*Math.sqrt((1-u)*(1-mode))
  }
  if(distribution==='pert'){
    const mode=(b-a)/(c-a)
    return a+(c-a)*jStat.beta.inv((word+.5)/4294967296,1+4*mode,1+4*(1-mode))
  }
  const normal=(w,v)=>Math.sqrt(-2*Math.log1p(-w/4294967296))*Math.cos(2*Math.PI*v/4294967296)
  let z=normal(word,angle)
  if(distribution==='lognormal'){
    const variance=Math.log1p(b*b)
    return a*Math.exp(-variance/2+Math.sqrt(variance)*z)
  }
  for(let k=0;k<128;k++){
    const d=a+b*z
    if(d>=0)return d
    z=normal(...philox(index,stream,(seed+k+1)>>>0))
  }
  throw Error('Truncated normal exceeded its draw limit at activity '+task.id+'.')
}

export function scheduleReplication(model,index) {
  const starts=Object.create(null),durations=Object.create(null),finish=Object.create(null)
  let total=0
  for(const task of model.plan){
    const start=task.dependsOn.reduce((max,id)=>Math.max(max,finish[id]),0)
    const d=duration(task,index,model.seed)
    starts[task.id]=start
    durations[task.id]=d
    finish[task.id]=start+d
    total=Math.max(total,finish[task.id])
  }
  // Trace all paths tied for latest finish back to the process origin.
  const critical=new Set()
  const tol=Number.EPSILON*Math.max(1,total)*model.plan.length*4
  for(let i=model.plan.length-1;i>=0;i--){
    const t=model.plan[i]
    if(Math.abs(finish[t.id]-total)<=tol)critical.add(t.id)
    if(critical.has(t.id))for(const pred of t.dependsOn)if(Math.abs(starts[t.id]-finish[pred])<=tol)critical.add(pred)
  }
  return {inputs:durations,output:total,event:total<=model.params.threshold,critical:[...critical]}
}
