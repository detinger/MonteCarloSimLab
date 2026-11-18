import {domainSpecs,defaults as domainDefaults,isDomain,reference} from '../engine/domains.js'
import {ENGINE_VERSION,validate} from '../engine/index.js'
import {startRun} from '../engine/client.js'
import {examples,defaults as extraDefaults,issues as extraIssues} from '../domains/newExamples.js'
import {domainVersion,localDomainRun,readDomainRun} from '../domains/newProjects.js'
import {createProject,compile,issuesFor,loadProjects,checkProject,checkRun} from '../pages/builder/project.js'
import {initialPiModel,readPiBundle,savedPiRun} from '../pages/piSession.js'
import {localRecord,readRecord} from '../pages/domain/runFiles.js'
import {sessionRuns,compactResult,runsChanged} from './snapshots.js'

export function modelInfo(m) {
  const family=m.kind??m.id
  if(m.kind==='pi')return {family,title:'Estimating Pi',metric:'Estimated π',method:'Scaled Wilson',unit:'dimensionless',engine:ENGINE_VERSION,reference:Math.PI}
  if(m.kind==='builder')return {family,title:'Simulation Builder',metric:'Mean model output',method:'Student t',unit:m.unit||'model units',engine:ENGINE_VERSION}
  if(isDomain(m.kind)){
    const spec=domainSpecs[m.kind]
    return {family,title:spec.title,metric:spec.metric,method:m.kind==='montyhall'?'Wilson':'Student t',unit:spec.unit,engine:ENGINE_VERSION,reference:reference(m)}
  }
  const spec=examples[m.id]
  return {family,title:spec.title,metric:spec.metric(m),method:spec.probability?'Wilson':'Student t',engine:domainVersion,reference:spec.reference(m)}
}
export function modelErrors(m) {return m?.id&&!m.kind?extraIssues(m):validate(m)}
export function presets(){
  const models=[initialPiModel,...Object.keys(domainSpecs).map(domainDefaults),...Object.keys(examples).map(extraDefaults),compile(createProject())]
  return models.map(model=>({id:'preset-'+(model.kind??model.id),source:'Example defaults',model,title:model.kind==='builder'?'Builder · project budget':modelInfo(model).title}))
}

const memoryJobs=new Map()
function openHistory(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open('monte-carlo-experiment-history',1)
    req.onupgradeneeded=()=>req.result.createObjectStore('jobs',{keyPath:'id'}).createIndex('finishedAt','finishedAt')
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)
    req.onblocked=()=>reject(Error('The run history is in use by another tab.'))
  })
}
export async function storeJob(job){
  memoryJobs.set(job.id,job)
  window.dispatchEvent(new Event(runsChanged))
  const db=await openHistory()
  try{
    await new Promise((resolve,reject)=>{
      const tx=db.transaction('jobs','readwrite')
      tx.objectStore('jobs').put(job)
      tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||Error('Could not store this run.'))
      tx.onerror=()=>reject(tx.error)
    })
    memoryJobs.delete(job.id)
    window.dispatchEvent(new Event(runsChanged))
  }finally{db.close()}
}
async function readJobs(){
  const db=await openHistory()
  try{
    return await new Promise((resolve,reject)=>{
      const request=db.transaction('jobs').objectStore('jobs').getAll()
      request.onsuccess=()=>resolve(request.result)
      request.onerror=()=>reject(request.error)
    })
  }finally{db.close()}
}

async function savedLab(id) {
  let model,result
  if(id==='pi'){
    const record=await savedPiRun('open')
    if(!record)return []
    model=readPiBundle(record).model
    result=compactResult({n:record.result.completed,mean:record.result.estimate,hits:record.result.hits,
      meanCI:record.result.scaledWilson95,probability:record.result.hits/model.samples})
  }else if(isDomain(id)){
    const record=await localRecord(id)
    if(!record)return []
    model=readRecord(record,id).model
    result=compactResult({...record.summary,probability:record.summary.hits/record.summary.n})
  }else{
    const record=await localDomainRun(id)
    if(!record)return []
    model=readDomainRun(record,id).model
    result=compactResult({n:record.replications,mean:record.estimate,interval:record.interval95,
      totals:record.totals,reference:record.reference})
  }
  return [{id:'saved-'+id,model,result,status:'complete',source:'Saved lab runs'}]
}

async function savedBuilder(){
  const rows=await loadProjects(),sources=[]
  for(const row of rows){
    const project=checkProject(row.project)
    const title=project.title||'Untitled Builder project'
    if(!issuesFor(project).length)sources.push({id:'draft-'+row.id,model:compile(project),title,source:'Builder projects'})
    const run=checkRun(row.run)
    if(run?.result?.n)sources.push({id:'saved-builder-'+row.id,model:run.model,result:compactResult(run.result),title,
      status:run.result.status,source:'Saved Builder runs'})
  }
  return sources
}
export async function library(){
  const defaults=presets()
  const ids=defaults.map(row=>row.model.kind??row.model.id).filter(id=>id!=='builder')
  const snapshots=await Promise.allSettled([...ids.map(savedLab),savedBuilder(),readJobs()])
  const jobs=snapshots.pop(),warnings=[]
  const historic=new Map(jobs.status==='fulfilled'?jobs.value.map(r=>[r.id,r]):[])
  if(jobs.status==='rejected')warnings.push('Device run history is unavailable.')
  memoryJobs.forEach((job,id)=>historic.set(id,job))
  if(snapshots.some(r=>r.status==='rejected'))warnings.push('Some local saves could not be read.')
  const history=[...historic.values()].sort((a,b)=>b.finishedAt.localeCompare(a.finishedAt))
  const saved=snapshots.flatMap(r=>r.status==='fulfilled'?r.value:[])
  return {entries:[...history,...sessionRuns().sort((a,b)=>b.finishedAt.localeCompare(a.finishedAt)),...saved,...defaults],warnings}
}

export function executeModel(model,onUpdate,onError) {
  if(model.kind)return startRun(model,onUpdate,onError,{capture:false})
  const worker=new Worker(new URL('../domains/newWorker.js',import.meta.url),{type:'module'})
  let closed=false
  const dispose=()=>{closed=true;worker.terminate()}
  worker.onerror=e=>{dispose();onError(e.message||'The worker stopped.')}
  worker.onmessage=({data})=>{
    if(closed)return
    if(data.status==='failed'){dispose();onError(data.message);return}
    if(['complete','cancelled'].includes(data.status))dispose()
    onUpdate({...data,...data.result,n:data.result?.n??data.n??0})
  }
  const send=type=>{if(!closed)worker.postMessage({type})}
  worker.postMessage({type:'start',config:model})
  return {pause:()=>send('pause'),resume:()=>send('resume'),cancel:()=>send('cancel'),dispose}
}
export function compatible(a,b){
  if(!a||!b)return false
  const infoA=modelInfo(a),infoB=modelInfo(b)
  if(infoA.family!==infoB.family||infoA.metric!==infoB.metric||infoA.unit!==infoB.unit)return false
  if(a.kind==='integration')return a.integrand===b.integrand && a.params.a===b.params.a && a.params.b===b.params.b
  if(a.kind==='builder')return a.expression===b.expression && a.question===b.question
  return true
}
