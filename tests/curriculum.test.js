import assert from 'node:assert/strict'
import test from 'node:test'
import {curriculum} from '../src/learning/curriculum.js'
import {assessFields,checkedNotebook,checkModelRecord,coinTrace,demonstration,tasks} from '../src/learning/activities.js'
import {createExperiment} from '../src/engine/index.js'
import {defaults,experiment} from '../src/domains/newExamples.js'
import {portable} from '../src/domains/newExports.js'
import {labs} from '../src/catalog.js'

test('curriculum has 12 lessons, 12 challenges, reachable references and working demonstrations',()=>{
  for(const key of ['id','challengeId']) assert.equal(new Set(curriculum.map(v=>v[key])).size,12)
  assert.equal(tasks.length,12)
  for(const [i,v] of curriculum.entries()){
    assert.ok(v.prerequisites.every(id=>curriculum.slice(0,i).some(l=>l.id===id)))
    for(const id of v.labs) assert.ok(id==='builder'||labs.some(l=>l.id===id),id)
    for(const prop of ['theory','worked','mistake','reflection','outcome']) assert.ok(v[prop].length>20)
    assert.equal(tasks[i].hints.length,3)
    for(const n of [v.control.min,v.control.initial,v.control.max]) assert.ok(demonstration(v.id,n))
  }
})
test('objective fields reject blank and accept fixture answers',()=>{
  for(const {fields} of tasks){
    assert.ok(assessFields(fields,{}).every(r=>!r.ok))
    assert.ok(assessFields(fields,Object.fromEntries(fields.map(f=>[f.key,String(f.answer)]))).every(r=>r.ok))
  }
  assert.equal(coinTrace(42),coinTrace(42))
  assert.notEqual(coinTrace(42),coinTrace(43))
})
test('builder assessment requires a replayable three-variable sum',()=>{
  const model={kind:'builder',question:'How often do costs cross €200,000?',unit:'EUR',seed:42,samples:10000,threshold:200000,
    inputs:['a','b','c'].map(name=>({name,unit:'EUR',distribution:'uniform',a:0,b:100000})),expression:'a + (b + c)'}
  const job=createExperiment(model);job.advance(model.samples)
  const record={run:{model,result:{...job.summary(),status:'complete'}}}
  assert.ok(checkModelRecord(record))
  model.comparator='>='
  assert.equal(checkModelRecord(record),false)
  delete model.comparator
  record.run.result.hits++
  assert.equal(checkModelRecord(record),false)
  record.run.model.expression='a + a + b'
  assert.equal(checkModelRecord(record),false)
})
test('inventory assessment checks source identity and execution evidence',()=>{
  const config={...defaults('inventory'),samples:100}
  const original=portable(config).ipynb
  const doc=JSON.parse(original)
  assert.equal(checkedNotebook(doc,original,config),false)
  doc.cells.filter(c=>c.cell_type==='code').forEach((c,i)=>{c.execution_count=i+1})
  const exp=experiment(config);exp.step(100)
  const {totals}=exp.result()
  const demand=totals.baseserved+totals.baseunfilled
  doc.cells.find(c=>c.cell_type==='code').outputs.push({output_type:'stream',name:'stdout',text:[
    'baseline fill rate '+totals.baseserved/demand,'alternative fill rate '+totals.altserved/demand,'Mean alternative cost '+totals.altcost/100,
  ].join('\n')})
  assert.ok(checkedNotebook(doc,original,config))
  doc.cells.find(c=>c.cell_type==='code').source+='\n# changed'
  assert.equal(checkedNotebook(doc,original,config),false)
})
