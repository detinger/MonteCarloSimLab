import {ENGINE_VERSION,validate} from '../../engine/index.js'
import {domainSpecs,defaults} from '../../engine/domains.js'

export function runRecord(model,result) {
  return {schemaVersion:1,engineVersion:ENGINE_VERSION,model,
    summary:{n:result.n,hits:result.hits,mean:result.mean,meanCI:result.meanCI,probabilityCI:result.probabilityCI}}
}

export function readRecord(record,kind) {
  if(record?.schemaVersion!==1 || record.engineVersion!==ENGINE_VERSION || record.model?.kind!==kind)
    throw Error('Choose a version 1 run for this example and engine.')
  const saved=record.model
  const model={...defaults(kind),samples:saved.samples,seed:saved.seed,
    params:Object.fromEntries(domainSpecs[kind].fields.map(f=>[f.key,saved.params?.[f.key]]))}
  if(kind==='projectmgmt'&&saved.activities!==undefined)model.activities=saved.activities
  if(kind==='integration') model.integrand=saved.integrand
  const errors=validate(model)
  if(errors.length)throw Error(errors.join(' '))
  const s=record.summary
  if(s?.n!==model.samples || !Number.isInteger(s.hits) || s.hits<0 || s.hits>s.n || !Number.isFinite(s.mean))
    throw Error('This file needs a completed run summary.')
  return {model,summary:s}
}

export async function localRecord(kind,record) {
  const db=await new Promise((resolve,reject)=>{
    const request=indexedDB.open('monte-carlo-examples',1)
    request.onupgradeneeded=()=>request.result.createObjectStore('runs')
    request.onsuccess=()=>resolve(request.result)
    request.onerror=()=>reject(request.error)
    request.onblocked=()=>reject(Error('Close other lab tabs, then reopen the saved run.'))
  })
  try {
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction('runs',record?'readwrite':'readonly'),store=tx.objectStore('runs')
      const request=record?store.put(record,kind):store.get(kind)
      tx.oncomplete=()=>resolve(request.result)
      tx.onabort=()=>reject(tx.error||Error('Local storage is unavailable.'))
      tx.onerror=()=>reject(tx.error)
    })
  } finally {db.close()}
}

export function csvData(model,result,format) {
  if(format==='path.csv'){
    const header=model.kind==='stock'?'path,displayed_day,price':'walker,step,x,y'
    const lines=result.paths.flatMap((path,i)=>path.map(([x,y],step)=>model.kind==='stock'?[i+1,x,y]:[i+1,step,x,y]))
    return [header,...lines.map(row=>row.join(','))].join('\n')+'\n'
  }
  if(format==='replications.csv'){
    return ['replication,output',...result.outcomes.map((y,i)=>(i+1)+','+y)].join('\n')+'\n'
  }
  return ['example,engine,unit,seed,n,mean,sd,se,mean_interval_method,mean95_low,mean95_high,event_probability,wilson95_low,wilson95_high',
    [model.kind,ENGINE_VERSION,domainSpecs[model.kind].unit,model.seed,result.n,result.mean,result.sd,result.se,
      model.kind==='montyhall'?'Wilson':'Student-t',...(result.meanCI||['','']),result.probability,...result.probabilityCI].join(',')].join('\n')+'\n'
}

// Resolve CSS theme variables and append figure annotations before serializing.
export function chartSvg(figure,title) {
  const original=figure.querySelector('svg')
  const clone=original.cloneNode(true)
  const originalNodes=[original,...original.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')]
  for(let i=0;i<copies.length;i++){
    const styles=getComputedStyle(originalNodes[i])
    for(const attr of ['fill','stroke','stroke-width','stroke-dasharray','font-size','font-family','opacity'])
      copies[i].setAttribute(attr,styles.getPropertyValue(attr))
  }
  const ns='http://www.w3.org/2000/svg'
  const {width,height}=original.viewBox.baseVal
  const note=figure.querySelector('figcaption')?.textContent||''
  const rows = (title+'\n'+note).split('\n').flatMap(line=>{
    const wrapped=['']
    for(const word of line.split(/\s+/)){
      if(wrapped.at(-1).length+word.length>Math.floor(width/7))wrapped.push('')
      wrapped[wrapped.length-1]+=(wrapped.at(-1)?' ':'')+word
    }
    return wrapped
  })
  const total=height+rows.length*18+12
  clone.removeAttribute('style')
  clone.setAttribute('viewBox','0 0 '+width+' '+total)
  clone.setAttribute('width',width)
  clone.setAttribute('height',total)
  const theme=getComputedStyle(figure)
  const bg=document.createElementNS(ns,'rect')
  bg.setAttribute('width','100%');bg.setAttribute('height','100%');bg.setAttribute('fill',theme.getPropertyValue('--bg-elevated').trim())
  clone.prepend(bg)
  rows.forEach((line,i)=>{
    const t=document.createElementNS(ns,'text')
    t.setAttribute('x','12');t.setAttribute('y',String(height+17+i*18))
    t.setAttribute('font-family','sans-serif');t.setAttribute('font-size','12');t.setAttribute('fill',theme.color)
    t.textContent=line;clone.append(t)
  })
  return new XMLSerializer().serializeToString(clone)
}

export async function chartPng(source) {
  const blob=new Blob([source],{type:'image/svg+xml'})
  const image=new Image(),url=URL.createObjectURL(blob)
  try {
    image.src=url
    await image.decode()
    const canvas=document.createElement('canvas')
    canvas.width=image.width*2;canvas.height=image.height*2
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height)
    return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not encode this chart.')),'image/png'))
  } finally {URL.revokeObjectURL(url)}
}
