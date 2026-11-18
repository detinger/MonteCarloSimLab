import test from 'node:test'
import assert from 'node:assert/strict'
import {createExperiment,validate} from '../src/engine/index.js'
import {defaults,domainSpecs,playGame,reference} from '../src/engine/domains.js'
import {notebook,pythonScript,rScript} from '../src/engine/export.js'

function simulate(kind,params={},settings={}) {
  const m=defaults(kind)
  const config={...m,...settings,params:{...m.params,...params}}
  const run=createExperiment(config)
  run.advance(config.samples)
  return run.summary()
}

test('signed integration supports constants, reversed bounds, sine and rejects equal endpoints',()=>{
  for(const [id,a,b,expected] of [['one',0,1,1],['negative',0,1,-1],['one',3,1,-2]]){
    assert.equal(simulate('integration',{a,b},{integrand:id,samples:1}).mean,expected)
  }
  assert.ok(Math.abs(simulate('integration',{}, {samples:10000}).mean-2)<.05)
  const m=defaults('integration')
  assert.ok(validate({...m,params:{a:2,b:2}}).length)
})

test('host opens an eligible goat door; switch wins exactly six of nine prize/choice combinations',()=>{
  let wins=0
  for(let p=0;p<3;p++) for(let c=0;c<3;c++){
    const g=playGame(p,c,.3)
    assert.notEqual(g.opened,g.prize)
    assert.notEqual(g.opened,g.pick)
    if(g.switched===g.prize) wins++
    if(p===c)assert.notEqual(g.opened,playGame(p,c,.8).opened)
  }
  assert.equal(wins,6)
})

test('walk and GBM path invariants and analytical reference',()=>{
  assert.equal(simulate('randomwalk',{steps:0}).mean,0)
  assert.equal(simulate('randomwalk',{steps:1,length:2}).mean,4)
  assert.ok(Math.abs(simulate('randomwalk',{steps:50},{samples:10000}).mean-50)<2)
  const gbm=defaults('stock');gbm.params.volatility=0
  const result=simulate('stock',{volatility:0})
  assert.ok(Math.abs(result.mean-reference(gbm))<1e-8)
  assert.equal(result.sd,0)
  assert.equal(result.bands.at(-1).quantiles[0],result.bands.at(-1).quantiles[4])
  assert.equal(simulate('stock',{steps:0}).mean,100)
})

test('schedule and capacity deterministic bounds and inclusive threshold',()=>{
  const s=simulate('projectmgmt',{procurement:10,construction:20,inspection:5,cv:0,threshold:35})
  assert.equal(s.mean,35)
  assert.equal(s.probability,1)
  const production=simulate('manufacturing',{breakdown:100,threshold:0})
  assert.equal(production.mean,0)
  assert.equal(production.probability,1)
  assert.equal(production.histogram[0].count,production.n)
  const m=simulate('manufacturing')
  assert.ok(m.histogram.every(b=>b.low>=0&&b.high<=3000))
})

test('all six adapters replay across batch sizes and export the compiled parameters',()=>{
  for(const kind of Object.keys(domainSpecs)){
    const model={...defaults(kind),samples:64}
    const a=createExperiment(model),b=createExperiment(model)
    a.advance(64)
    while(b.advance(3)<64){ /* different batch size */ }
    assert.deepEqual(a.summary(),b.summary())
    assert.equal(a.summary().histogram.reduce((sum,b)=>sum+b.count,0),64)
    assert.match(pythonScript(model),/def domain_row\(i\)/)
    assert.match(rScript(model),/pair <- function/)
    assert.equal(notebook(model).nbformat,4)
  }
})

test('saved run round trips and CSV exports contain the declared rows and revision',async()=>{
  const {runRecord,readRecord,csvData}=await import('../src/pages/domain/runFiles.js')
  for(const kind of Object.keys(domainSpecs)){
    const m={...defaults(kind),samples:3},r=simulate(kind,{}, {samples:3})
    const record=runRecord(m,r)
    assert.deepEqual(readRecord(record,kind).model,m)
    assert.throws(()=>readRecord({...record,engineVersion:'future'},kind))
    assert.equal(csvData(m,r,'replications.csv').trim().split('\n').length,4)
    if(kind==='stock'||kind==='randomwalk')assert.ok(csvData(m,r,'path.csv').split('\n').length>3)
  }
})

const fixed=(id,a,dependsOn=[])=>({id,label:id,distribution:'constant',a,dependsOn})

test('schedule validates predecessor graph and parallel/serial durations and critical paths',()=>{
  const tasks=[fixed('end',5,['a','b']),fixed('a',10),fixed('b',20)]
  const r=simulate('projectmgmt',{threshold:25},{activities:tasks,samples:3})
  assert.equal(r.mean,25)
  assert.equal(r.hits,3)
  assert.deepEqual({...r.criticalCounts},{b:3,end:3})
  const cycle=tasks.map(t=>t.id==='a'?{...t,dependsOn:['end']}:t)
  assert.ok(validate({...defaults('projectmgmt'),activities:cycle}).some(s=>s.includes('cycle')))
  assert.ok(validate({...defaults('projectmgmt'),activities:[fixed('a',2,['missing'])]}).some(s=>s.includes('missing')))
  assert.ok(validate({...defaults('projectmgmt'),activities:[fixed('a',2),fixed('a',3)]}).length)
  const attack={...fixed('a',2),b:'system("echo unsafe")',c:'arbitrary()'}
  assert.ok(!rScript({...defaults('projectmgmt'),activities:[attack]}).includes('system('))
})

test('duration families respect their supports and replay legacy sequential runs',async()=>{
  const {sequentialActivities}=await import('../src/engine/schedule.js')
  const m=defaults('projectmgmt')
  assert.equal(simulate('projectmgmt',{}, {samples:30}).mean,
    simulate('projectmgmt',{}, {activities:sequentialActivities(m.params),samples:30}).mean)
  for(const [distribution,a,b,c] of [['truncated',0,2],['triangular',5,7,11],['pert',5,7,11]]){
    const result=simulate('projectmgmt',{}, {samples:1000,activities:[{id:'mixed',label:'Mixed',distribution,a,b,c,dependsOn:[]}]})
    assert.ok(result.outcomes.every(x=>x>=a&&(c===undefined||x<=c)))
    assert.ok(result.outcomes.every(x=>x!==0))
  }
})
test('walker heatmap counts all endpoints and final ensemble MSD matches reported estimate',()=>{
  const r=simulate('randomwalk',{steps:40},{samples:3000})
  assert.equal(r.walk.cells.reduce((s,c)=>s+c.count,0),r.n)
  assert.equal(r.walk.endpoints.length,2048)
  assert.ok(Math.abs(r.walk.msd.at(-1)[1]-r.mean)<1e-10)
})
