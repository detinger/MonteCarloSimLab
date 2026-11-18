import test from 'node:test'
import assert from 'node:assert/strict'
import {distributions, lawFor, previewDistribution} from '../src/science/distributions.js'

for(const [kind,[,,params]] of Object.entries(distributions)) {
  test(kind+' preview is reproducible and consistent with its model',()=>{
    const a=previewDistribution(kind,params,42,2000)
    const b=previewDistribution(kind,params,42,100)
    assert.deepEqual(a.draws.slice(0,100),b.draws)
    assert.equal(a.rows.reduce((sum,row)=>sum+row.count,0),2000)
    assert.ok(a.rows.every(row=>Number.isFinite(row.expected) && row.expected>=0 && row.expected<=1.0000001))
    const sd=Math.sqrt(a.draws.reduce((s,x)=>s+(x-a.mean)**2,0)/1999)
    assert.ok(Math.abs(a.mean-a.reference)<5*sd/Math.sqrt(2000)+1e-10)
  })
}
test('invalid supports and malformed or unnormalized inputs are rejected',()=>{
  for(const [family,params] of [['uniform',[3,2]],['normal',[0,-1]],['categorical',['2,3']],['empirical',['2,,3']],['truncated',[0,1,3,3]]]) assert.throws(()=>lawFor(family,params))
  assert.deepEqual(previewDistribution('poisson',[0],1,3).draws,[0,0,0])
})
