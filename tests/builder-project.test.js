import test from 'node:test'
import assert from 'node:assert/strict'
import {createProject,compile,issuesFor,template,checkProject,checkRun} from '../src/pages/builder/project.js'
import {ENGINE_VERSION,createExperiment} from '../src/engine/index.js'
import {traceCsv,convergenceSvg} from '../src/pages/builder/chart.js'

test('three separate Builder starters validate and replay',()=>{
  for(const id of ['budget','revenue','rare']){
    const project=template(id)
    assert.deepEqual(issuesFor(project),[])
    const job=createExperiment(compile(project))
    job.advance(25)
    assert.equal(job.summary().n,25)
  }
})
test('derived formulas preserve a single draw per variable across repeated references',()=>{
  const draft=createProject()
  draft.relations=[{name:'subtotal',label:'Equipment and design',expression:'design + equipment',unit:'EUR'}]
  draft.expression='subtotal + subtotal + labor'
  assert.deepEqual(issuesFor(draft),[])
  const model=compile(draft)
  const job=createExperiment(model);job.advance(1)
  const {trace}=job.summary()
  const {design,equipment,labor}=trace[0].inputs
  assert.equal(trace[0].output,2*(design+equipment)+labor)
  draft.relations[0].expression='subtotal + equipment'
  assert.match(issuesFor(draft).join(' '),/Cycle/)
  draft.relations[0].expression='missing + equipment'
  assert.ok(issuesFor(draft).length)
})
test('validate dimensional mismatches, duplicate identifiers and future schemas',()=>{
  const draft=createProject()
  draft.inputs[0].unit='days'
  assert.match(issuesFor(draft).join(' '),/unit/i)
  draft.inputs[0].unit='EUR'
  draft.expression='design * equipment'
  assert.match(issuesFor(draft).join(' '),/unit/i)
  assert.throws(()=>checkProject({...draft,version:89}))
  assert.throws(()=>checkProject({...draft,relations:[{name:'equipment',label:'E',expression:'1',unit:'EUR'}]}))
})
test('bounded run records, chart and sample download retain provenance',()=>{
  const p=createProject();p.samples='100'
  const model=compile(p),job=createExperiment(model)
  job.advance(100)
  const run={engineVersion:ENGINE_VERSION,model,result:{...job.summary(),status:'complete'}}
  const serialized=JSON.parse(JSON.stringify(run))
  assert.deepEqual(checkRun(serialized),serialized)
  // Up to 500 replications are captured, so a 100-run trace has 100 rows plus the header.
  assert.equal(traceCsv(run).trim().split('\r\n').length,101)
  assert.match(convergenceSvg(run),/Completed replications/)
  assert.throws(()=>checkRun({...run,engineVersion:'unknown'}))
})

test('all four Builder comparisons count equality according to the selected condition',()=>{
  const draft=createProject(true)
  Object.assign(draft,{question:'Does an output of 2 meet the boundary?',threshold:'2',samples:'4',
    inputs:[{name:'fixed',label:'Fixed output',distribution:'constant',a:'2',unit:''}],expression:'fixed'})
  for(const [comparator,want] of [['>',0],['>=',4],['<',0],['<=',4],[undefined,0]]){
    draft.comparator=comparator
    const model=compile(draft)
    assert.deepEqual(issuesFor(draft),[])
    const job=createExperiment(model);job.advance(4)
    const r=job.summary()
    assert.equal(r.hits,want)
    assert.equal(r.probability,want/4)
    assert.ok(r.trace.every(t=>t.event===(want===4)))
    const serial=JSON.parse(JSON.stringify(draft))
    assert.equal(compile(checkProject(serial)).comparator,comparator)
  }
  draft.comparator='=='
  assert.match(issuesFor(draft).join(' '),/threshold event/)
  assert.throws(()=>checkProject(draft))
})

test('threshold direction is preserved on either side of the boundary',()=>{
  const p=createProject(true)
  Object.assign(p,{question:'How does 2 compare to 1?',threshold:'1',samples:'3',
    inputs:[{name:'two',label:'Two',distribution:'constant',a:'2'}],expression:'two'})
  for(const op of ['>','>=','<','<=']){
    const job=createExperiment(compile({...p,comparator:op}))
    job.advance(3)
    assert.equal(job.summary().hits,op.startsWith('>')?3:0)
  }
})
