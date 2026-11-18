import test from 'node:test'
import assert from 'node:assert/strict'
import {gbmStep} from '../src/science/gbm.js'

test('exact GBM matches the deterministic annual benchmark over 252 trading days',()=>{
  let price=100
  for(let day=0;day<252;day++) price=gbmStep(price,0.05,0,1/252,-2)
  assert.ok(Math.abs(price-100*Math.exp(.05))<1e-10)
  assert.equal(gbmStep(100,.05,.4,0,3),100)
  assert.ok(gbmStep(100,.05,2,1,-3)>0)
})
