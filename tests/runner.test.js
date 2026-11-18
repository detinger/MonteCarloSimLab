import test from 'node:test'
import assert from 'node:assert/strict'
import {unzipSync,strFromU8} from 'fflate'
import {presets,modelErrors,compatible} from '../src/experiments/library.js'
import {availableFormats,artifact} from '../src/experiments/exports.js'
import {compactResult} from '../src/experiments/snapshots.js'

test('Runner defaults are validated by their native experiment adapters',()=>{
  const rows=presets()
  assert.equal(rows.length,13)
  assert.equal(new Set(rows.map(r=>r.id)).size,13)
  for(const row of rows)assert.deepEqual(modelErrors(row.model),[])
  const integration=rows.find(r=>r.model.kind==='integration').model
  assert.ok(compatible(integration,{...integration,seed:20}))
  assert.ok(!compatible(integration,{...integration,integrand:'cos'}))
})

test('export center keeps models and inferred results separate and preserves exact run provenance',()=>{
  const template=presets()[0]
  assert.ok(!availableFormats(template).includes('csv'))
  const result=compactResult({n:10,mean:3.2,meanCI:[2,3.9],hits:8,points:new Array(5000),convergence:[{n:10,mean:3.2}]})
  assert.ok(!Object.hasOwn(result,'points'))
  const entry={id:'test',source:'Runner history',title:'=sheetFormula',model:{kind:'pi',samples:10,seed:15},engineVersion:'fixture',result,status:'complete'}
  const doc=JSON.parse(artifact(entry,'json').data)
  assert.equal(doc.engineVersion,'fixture')
  assert.equal(doc.model.seed,15)
  assert.equal(doc.summary.mean,3.2)
  assert.ok(artifact(entry,'csv').data.includes('"\'=sheetFormula"'))
  const files=unzipSync(artifact(entry,'zip').data)
  assert.equal(JSON.parse(strFromU8(files['summary.json'])).n,10)
  assert.deepEqual(availableFormats({...entry,status:'cancelled'}),['json','csv','model'])
})
