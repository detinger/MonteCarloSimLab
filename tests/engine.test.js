import test from 'node:test'
import assert from 'node:assert/strict'
import {createExperiment, validate, criticalT, wilson} from '../src/engine/index.js'
import {philox} from '../src/engine/rng.js'
import {notebook, pythonScript, rScript} from '../src/engine/export.js'

const pi = {kind:'pi',samples:1000,seed:0}
const budget = {kind:'builder',seed:4294967295,samples:100,question:'Will the project exceed budget?',
  inputs:[{name:'x',distribution:'uniform',a:1,b:4},{name:'y',distribution:'normal',a:1,b:3},
    {name:'z',distribution:'triangular',a:2,b:3,c:4}],expression:'x+y*z',threshold:2}

function run(model, step = model.samples) {
  const experiment = createExperiment(model)
  while (experiment.advance(step) < model.samples) { /* advance the same run */ }
  return experiment.summary()
}

test('Philox2x32-10 matches three upstream Random123 known-answer vectors',() => {
  // https://github.com/DEShawResearch/random123/blob/main/tests/kat_vectors
  assert.deepEqual(philox(0,0,0),[0xff1dae59,0x6cd10df2])
  assert.deepEqual(philox(0xffffffff,0xffffffff,0xffffffff),[0x2c3f628b,0xab4fd7ad])
  assert.deepEqual(philox(0x243f6a88,0x85a308d3,0x13198a2e),[0xdd7ce038,0xf62a4c12])
})

test('pi replays independently of execution batch size and plot limits',() => {
  const result = run(pi)
  assert.equal(result.hits,797)
  assert.equal(result.mean,3.188)
  assert.deepEqual(result,run(pi,7))
  assert.ok(result.meanCI[0] < Math.PI && result.meanCI[1] > Math.PI)
  assert.ok(result.points.every(({x,y,inside}) => inside === (x*x+y*y <= 1)))
  const big = run({...pi,samples:100000})
  assert.equal(big.points.length,2048)
  assert.equal(big.trace.length,500)
  assert.ok(big.convergence.length <= 130)
  assert.ok(Math.abs(big.mean-Math.PI) < 0.03)
})

test('builder has independent named streams, single draws for repeated references, portable fixture',() => {
  const result = run(budget)
  assert.equal(result.hits,68)
  assert.ok(Math.abs(result.mean-5.843585132043093) < 1e-12)
  assert.deepEqual(result,run({...budget,inputs:[...budget.inputs].reverse()},3))
  const constant = run({...budget,expression:'(x-x) * y + 2',threshold:2})
  assert.equal(constant.mean,2)
  assert.deepEqual(constant.meanCI,[2,2])
  assert.equal(constant.probability,0)
  assert.ok(constant.probabilityCI[1] > 0)
  assert.equal(run({...budget,samples:1}).meanCI,null)
})

test('reports invalid expressions, dimensions, names and numerical parameters before sampling',() => {
  for (const delta of [{expression:'x.constructor'}, {expression:'x**2'}, {expression:'foo(y)'},
    {expression:'x / (2-2)'},{samples:NaN},{samples:0},{seed:-1},{inputs:[]},{threshold:Infinity},
    {inputs:[budget.inputs[0],budget.inputs[0]]}, {inputs:[{...budget.inputs[1],b:0}]},
    {inputs:[{...budget.inputs[0],unit:'EUR'},{...budget.inputs[1],unit:'days'}],expression:'x+y'}]) {
    assert.ok(validate({...budget,...delta}).length > 0)
  }
  const badDenominator = {...budget,inputs:[{name:'x',a:0,distribution:'bernoulli'}],expression:'1/x'}
  assert.throws(() => run(badDenominator),/replication 1/)
})

test('intervals at boundaries and critical values agree with reference quantities',() => {
  assert.equal(wilson(0,1)[0],0)
  assert.equal(wilson(1,1)[1],1)
  assert.ok(Math.abs(wilson(2,10)[0]-0.05668215145)<1e-9)
  assert.equal(criticalT(1),12.706205)
  assert.ok(Math.abs(criticalT(31)-2.039513446)<2e-6)
})

test('exports are built from validated formulas and untrusted text stays data',() => {
  const model = {...budget,question:'Quotes " and backticks `\nprint("bad")'}
  const nb = notebook(model)
  assert.equal(nb.nbformat,4)
  assert.equal(nb.metadata.kernelspec.name,'python3')
  assert.equal(new Set(nb.cells.map(c=>c.id)).size,nb.cells.length)
  assert.ok(nb.cells.filter(c=>c.cell_type==='code').every(c=>c.execution_count===null && !c.outputs.length))
  assert.ok(!nb.cells.filter(c=>c.cell_type==='markdown').some(c=>c.source.includes(model.question)))
  assert.ok(pythonScript(model).includes('json.loads('))
  assert.ok(rScript(model).includes('inputs[["z"]]'))
  assert.throws(()=>pythonScript({...model,expression:'alert(1)'}))
})

test('allowlisted functions, powers and unary signs have explicit precedence and domains',()=>{
  const inputs=[{name:'x',distribution:'constant',a:3}]
  const expression='max(-2^2, -8) + sqrt(x^2) + min(8,2^3^2) + abs(-2) + log(exp(1)) + 2^-1'
  assert.equal(run({...budget,inputs,expression}).mean,10.5)
  for (const expression of ['sqrt(-1)','log(0)','exp(1000)','(-1)^0.5','min(1)','constructor(1)'])
    assert.ok(validate({...budget,inputs,expression}).length>0,expression)
})

test('invalid intermediate values fail even when an outer operator could mask them',()=>{
  const inputs=[{name:'x',a:0,distribution:'bernoulli'}]
  const expression='min(1/x,1)'
  assert.throws(()=>run({...budget,inputs,expression}),/replication 1/)
})
