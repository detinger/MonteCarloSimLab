import { examples, issues } from './newExamples.js'

export const domainVersion = 'domain/philox2x32-10/v1'
export function domainManifest(p, r) {
  return {
    schemaVersion: 1, engineVersion: domainVersion, model: {...p},
    metric: examples[p.id].metric(p), replications:r.n, estimate:r.mean,
    interval95:r.interval, reference:r.reference, totals:r.totals,
  }
}
export function readDomainRun(data, id) {
  if (data?.schemaVersion !== 1 || data.engineVersion !== domainVersion || data.model?.id !== id) {
    throw new Error('Choose a compatible run JSON for this experiment.')
  }
  const p=defaultsFromImport(data.model)
  const errors=issues(p)
  if (errors.length) throw new Error(errors.join(' '))
  if (p.samples !== data.replications || !Number.isFinite(data.estimate)) throw new Error('Choose a completed run with a finite estimate.')
  return {model:p, expected:data.estimate}
}
function defaultsFromImport(p){
  const keys=['id','seed','samples',...examples[p.id].fields.map(f=>f.key)]
  return Object.fromEntries(keys.map(key=>[key,p[key]]))
}
export async function localDomainRun(id, value){
  const db=await new Promise((resolve,reject)=>{
    const req=indexedDB.open('monte-carlo-domain-runs',1)
    req.onupgradeneeded=()=>req.result.createObjectStore('examples')
    req.onsuccess=()=>resolve(req.result)
    req.onerror=()=>reject(req.error)
    req.onblocked=()=>reject(new Error('Close other lab tabs and retry.'))
  })
  try {
    return await new Promise((resolve,reject)=>{
      const transaction=db.transaction('examples',value?'readwrite':'readonly')
      const store=transaction.objectStore('examples')
      const req=value?store.put(value,id):store.get(id)
      transaction.oncomplete=()=>resolve(req.result)
      transaction.onabort=()=>reject(transaction.error||new Error('Storage unavailable.'))
      transaction.onerror=()=>reject(transaction.error)
    })
  }finally{db.close()}
}

// The only strings in this SVG come from the built-in catalog and validated numeric engine output.
export function convergenceSvg(p,r) {
  const lo=Math.min(...r.convergence.map(v=>v.mean),r.reference??Infinity)
  const hi=Math.max(...r.convergence.map(v=>v.mean),r.reference??-Infinity)
  const span=hi-lo||1, fmt=v=>Number(v.toPrecision(5)).toString()
  const y=v=>220-(v-lo)/span*140
  const points=r.convergence.map(v=>(64+550*v.n/r.n)+','+y(v.mean)).join(' ')
  const title=examples[p.id].title.replaceAll('&','&amp;')
  const metric=examples[p.id].metric(p)
  const benchmark=r.reference===null?'':`<path d="M64 ${y(r.reference)} H614" stroke="#616d7e" stroke-dasharray="5 4"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 660 300" role="img"><title>${title} convergence</title>
<rect width="660" height="300" fill="white"/><g fill="#17202c" font-family="system-ui,sans-serif"><text x="24" y="32" font-size="20">${title}</text>
<text x="24" y="55" font-size="13">${metric} · seed ${p.seed}</text>
<path d="M64 76 V220 H614" stroke="#9aa6b3" fill="none"/>${benchmark}
<polyline points="${points}" fill="none" stroke="#1f5f8b" stroke-width="2"/>
<g font-size="11"><text x="58" y="83" text-anchor="end">${fmt(hi)}</text><text x="58" y="220" text-anchor="end">${fmt(lo)}</text>
<text x="64" y="238">0</text><text x="614" y="238" text-anchor="end">${r.n}</text>
<text x="330" y="258" text-anchor="middle">Completed replications</text>
<text x="24" y="284">Solid curve · running estimate${benchmark?'    Dashed line · reference '+fmt(r.reference):''}</text></g></g></svg>`
}
