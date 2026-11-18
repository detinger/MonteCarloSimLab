import test from 'node:test'
import assert from 'node:assert/strict'
import {strFromU8,unzipSync} from 'fflate'
import {runBundle} from '../src/components/runBundle.js'

test('run archive carries the model, provenance, results and notebook with safe fixed member names',()=>{
  const model={question:'What is Pr(cost > €500)?',seed:24}
  const entries=unzipSync(runBundle({model,manifest:{seed:24},summary:{n:100},notebook:{nbformat:4}}))
  assert.deepEqual(Object.keys(entries).sort(),['analysis.ipynb','model.json','run-manifest.json','summary.json'])
  assert.deepEqual(JSON.parse(strFromU8(entries['model.json'])),model)
})
