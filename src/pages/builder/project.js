import { comparators, ENGINE_VERSION, validate } from '../../engine/index.js'

import {families,slotKeys,typedSlot,isListLaw} from '../../engine/inputLaws.js'
export {families} from '../../engine/inputLaws.js'
import {resolveRelations} from './relations.js'

export function createProject(blank = false) {
  const inputs = blank ? [] : [
    { name: 'design', label: 'Design cost', distribution: 'triangular', a: '30000', b: '40000', c: '55000' },
    { name: 'equipment', label: 'Equipment cost', distribution: 'uniform', a: '65000', b: '95000' },
    { name: 'labor', label: 'Labor cost', distribution: 'triangular', a: '55000', b: '75000', c: '105000' },
  ]
  return {
    version: 1, id: crypto.randomUUID(), title: blank ? 'Untitled model' : 'Project budget',
    question: blank ? '' : 'What is the chance our project costs more than €200,000?',
    kind: 'builder', inputs: inputs.map(i => ({...i,unit:'EUR'})), unit: blank ? '' : 'EUR', expression: blank ? '' : 'design + equipment + labor',
    comparator:'>', threshold: blank ? '0' : '200000', samples: '10000', seed: '42',
    assumptions: blank ? '' : 'Independent cost components. These ranges illustrate a hypothetical project.',
    relations: [], positions: {},
  }
}

export function template(id) {
  const draft=createProject()
  if(id==='budget') return draft
  if(id==='revenue') return {...draft,title:'Product Revenue & Profit',question:'How often will net profit exceed €20,000 after variable and fixed costs?',
    inputs:[{name:'volume',label:'Unit sales',unit:'',distribution:'uniform',a:'800',b:'1400'},
      {name:'price',label:'Revenue per unit',unit:'EUR',distribution:'triangular',a:'75',b:'90',c:'100'},
      {name:'returns',label:'Returned fraction',unit:'',distribution:'uniform',a:'0.01',b:'0.08'},
      {name:'variable_cost',label:'Variable cost per unit',unit:'EUR',distribution:'uniform',a:'25',b:'40'},
      {name:'fixed_cost',label:'Fixed costs',unit:'EUR',distribution:'constant',a:'25000'}],
    expression:'volume * price * (1 - returns) - variable_cost * volume - fixed_cost',threshold:'20000',
    assumptions:'Sales volume is approximated as continuous. Price, unit cost, return fraction and fixed costs are independent illustrative assumptions.'}
  if(id==='stock') return {...draft,title:'Stock price (GBM)',question:'What is the probability the terminal price exceeds the initial price?',
    inputs:[{name:'s0',label:'Initial price',unit:'USD',distribution:'constant',a:'100'},
      {name:'drift',label:'Annual drift',unit:'',distribution:'constant',a:'0.05'},
      {name:'vol',label:'Annual volatility',unit:'',distribution:'constant',a:'0.2'},
      {name:'z',label:'GBM shock',unit:'',distribution:'normal',a:'0',b:'1'}],
    expression:'s0 * exp(drift - vol ^ 2 / 2 + vol * z)',threshold:'100',comparator:'>',unit:'USD',
    assumptions:'One-year geometric Brownian motion. Drift and volatility are annualized. Z is a fresh standard normal shock per replication.'}
  return {...draft,title:'Rare equipment loss',question:'How often will a single equipment loss exceed €50,000?',
    inputs:[{name:'failure',label:'Equipment fails',unit:'',distribution:'bernoulli',a:'0.002'},
      {name:'loss',label:'Loss if failed',unit:'EUR',distribution:'triangular',a:'10000',b:'60000',c:'150000'}],
    expression:'failure * loss',threshold:'50000',
    assumptions:'One mission has at most one failure. Severity and the failure indicator are independent. These parameters are illustrative.'}
}

export function newRelation(draft) {
  let i=1
  const ids=new Set([...draft.inputs,...(draft.relations||[])].map(v=>v.name))
  while(ids.has('derived'+i))i++
  return {name:'derived'+i,label:'Derived value '+i,expression:draft.inputs[0]?.name||'',unit:draft.inputs[0]?.unit||''}
}

const number = value => String(value ?? '').trim() === '' ? NaN : Number(value)

export function compile(draft) {
  return {
    kind: 'builder', question: draft.question, expression: resolveRelations(draft).expression,
    ...(draft.relations?.length ? {relations:draft.relations,outputExpression:draft.expression} : {}),
    ...(draft.comparator !== undefined ? {comparator:draft.comparator} : {}),
    unit: draft.unit, assumptions: draft.assumptions, threshold: number(draft.threshold),
    seed: number(draft.seed), samples: number(draft.samples),
    inputs: draft.inputs.map(input => {
      const {name,label,distribution,unit}=input
      const params=(families[distribution]?.fields??[]).map((_,i)=>{
        const key=slotKeys[i]
        return [key,typedSlot(distribution,input[key])]
      })
      return {name,label,unit:unit??draft.unit,distribution,...Object.fromEntries(params)}
    }),
  }
}

export function issuesFor(draft) {
  const {error}=resolveRelations(draft)
  const errors=validate(compile(draft))
  return error ? [error,...errors.filter(e=>!e.startsWith('Expected an input'))] : errors
}

export function newInput(inputs, unit) {
  let i = 1
  while (inputs.some(input => input.name === 'input' + i)) i++
  return { name: 'input' + i, label: 'Input ' + i, unit, distribution: 'uniform', a: '0', b: '1' }
}

export function checkProject(value) {
  if (value?.version !== 1 || value.kind !== 'builder' || !Array.isArray(value.inputs) ||
      value.inputs.length > 32 || ['title', 'question', 'expression', 'unit', 'assumptions'].some(k => typeof value[k] !== 'string' || value[k].length > 4000)) {
    throw new Error('Choose a version 1 Builder project with at most 32 inputs.')
  }
  const scalar = v => typeof v === 'string' || Number.isFinite(v)
  if (value.comparator !== undefined && !comparators.includes(value.comparator)) throw Error('Choose a supported threshold comparison.')
  if (['threshold', 'seed', 'samples'].some(k => !scalar(value[k]))) throw new Error('The run settings are malformed.')
  const seen = new Set()
  for (const input of value.inputs) {
    if (!input || typeof input.name !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(input.name) ||
        ['formula', 'event', 'metric', 'constructor', 'prototype'].includes(input.name) ||
        seen.has(input.name) || typeof input.label !== 'string' || (input.unit != null && typeof input.unit !== 'string') || !Object.hasOwn(families, input.distribution) ||
        families[input.distribution].fields.some((_, i) => {
          const v=input[slotKeys[i]]
          return !scalar(v) || (typeof v==='string' && v.length>(isListLaw(input.distribution)?8192:128))
        })) throw new Error('An input has an invalid or duplicate identifier, family or parameter.')
    seen.add(input.name)
  }
  if(value.relations!=null && (!Array.isArray(value.relations)||value.relations.length>24)) throw Error('Choose a project with up to 24 derived formulas.')
  for(const node of value.relations||[]) {
    if(!node || typeof node.name!=='string' || !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(node.name)||seen.has(node.name)||
       ['formula','event','metric','constructor','prototype','abs','sqrt','exp','log','min','max'].includes(node.name)||
       ['label','unit','expression'].some(k=>typeof node[k]!=='string'||node[k].length>4000)) throw Error('A formula has duplicate or invalid identifiers or fields.')
    seen.add(node.name)
  }
  const positions = {}
  for (const id of [...seen, 'formula', 'event', 'metric']) {
    const p = value.positions?.[id]
    if (p && [p.x,p.y].every(v => Number.isFinite(v) && Math.abs(v) < 16000)) positions[id] = p
  }
  return { ...value, positions, relations:value.relations||[] }
}

export function checkRun(run) {
  if (run == null) return null
  const {model,result:r} = run
  const bounded = (v,max) => Number.isSafeInteger(v) && v >= 0 && v <= max
  const finite = v => v === null || Number.isFinite(v)
  const interval = v => v === null || (Array.isArray(v) && v.length === 2 && v.every(Number.isFinite))
  if (run.engineVersion !== ENGINE_VERSION || model?.kind !== 'builder' || validate(model).length ||
      !r || !['complete','cancelled','failed'].includes(r.status) || !bounded(r.n,model.samples) ||
      (r.status === 'complete' && r.n !== model.samples) || !bounded(r.hits,r.n) ||
      ![r.mean,r.probability,r.sd,r.se].every(finite) || ![r.meanCI,r.probabilityCI].every(interval) ||
      !Array.isArray(r.trace) || r.trace.length > 500 || !Array.isArray(r.convergence) || r.convergence.length > 132 ||
      model.inputs.some(v => typeof v.label !== 'string') ||
      r.trace.some(t => !t || !bounded(t.index,r.n) || !Number.isFinite(t.output) || typeof t.event !== 'boolean' ||
        !t.inputs || model.inputs.some(i => !Number.isFinite(t.inputs[i.name]))) ||
      r.convergence.some(c => !c || !bounded(c.n,r.n) || !Number.isFinite(c.mean)) ||
      (r.histogram !== undefined && (!Array.isArray(r.histogram) || r.histogram.length > 30 ||
        r.histogram.some(b => !b || !Number.isFinite(b.low) || !Number.isFinite(b.high) || !bounded(b.count,r.n)))) ||
      (r.quantiles !== undefined && (!Array.isArray(r.quantiles) || r.quantiles.some(q => !q || !Number.isFinite(q.p) || !Number.isFinite(q.value)))) ||
      (model.unit != null && typeof model.unit !== 'string')) throw new Error('The saved run has unsupported or malformed results.')
  return run
}

let opening
export function resetDatabase() { opening = null }
function database() {
  if (!opening) opening = new Promise((resolve, reject) => {
    const request = indexedDB.open('mc-builder-projects', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('projects', { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return opening
}

export async function loadProjects() {
  const db = await database()
  return new Promise((resolve,reject) => {
    const request = db.transaction('projects').objectStore('projects').getAll()
    request.onsuccess = () => resolve(request.result.sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)))
    request.onerror = () => reject(request.error)
  })
}

export async function saveProject(record, expected) {
  const db = await database()
  return new Promise((resolve,reject) => {
    const tx = db.transaction('projects', 'readwrite')
    const store = tx.objectStore('projects')
    const read = store.get(record.id)
    let conflict = false
    read.onsuccess = () => {
      if ((read.result?.updatedAt ?? null) !== expected) {
        conflict = true
        tx.abort()
      } else store.put(record)
    }
    tx.oncomplete = resolve
    tx.onabort = () => reject(new Error(conflict ? 'This project changed in another tab. Duplicate your model to save a separate copy.' : 'Local storage is unavailable. Download your project to keep a copy.'))
    tx.onerror = () => reject(tx.error)
  })
}

export function download(name, content, mime = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
