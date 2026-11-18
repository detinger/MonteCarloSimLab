import assert from 'node:assert/strict'
import test from 'node:test'
import {analyze} from '../src/science/analyze.js'
import {createExperiment} from '../src/engine/index.js'
const model={kind:'builder',seed:35,samples:1300,question:'Cost?',inputs:[{name:'cost',distribution:'uniform',a:0,b:10},{name:'fixed',distribution:'constant',a:30}],expression:'cost+fixed',threshold:40}
test('analysis reproduces the Builder engine and bins the entire workload',()=>{
  const result=analyze(model)
  const job=createExperiment(model)
  job.advance(model.samples)
  assert.equal(result.mean,job.summary().mean)
  assert.equal(result.rows.reduce((s,r)=>s+r.count,0),model.samples)
  assert.deepEqual(result.meanCI,job.summary().meanCI)
})
test('shared random inputs cancel from a paired fixed-cost change',()=>{
  const alt=structuredClone(model)
  alt.inputs[1].a=40
  const r=analyze(model,alt)
  assert.ok(Math.abs(r.paired.meanChange-10)<1e-12)
  assert.deepEqual(r.paired.probabilityChangeCI,[1,1])
  assert.throws(()=>analyze(model,{...model,seed:10}))
})
test('independent scenarios draw from disjoint streams with finite difference intervals',()=>{
  const r=analyze({...model,threshold:35},{...model,threshold:35},()=>{},'independent')
  assert.notEqual(r.paired.mean,r.mean)
  assert.ok(r.paired.meanCI[0]<r.paired.meanChange&&r.paired.meanCI[1]>r.paired.meanChange)
  assert.ok(r.paired.probabilityChangeCI[0]<r.paired.probabilityChange&&r.paired.probabilityChangeCI[1]>r.paired.probabilityChange)
})
test('analysis respects an inclusive lower-tail Builder question',()=>{
  const m={...model,expression:'fixed',threshold:30,comparator:'<='}
  assert.equal(analyze(m).probability,1)
  assert.equal(analyze({...m,comparator:'<'}).probability,0)
})
