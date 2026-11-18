import test from 'node:test'
import assert from 'node:assert/strict'
import { defaults, examples, experiment, issues, replicate } from '../src/domains/newExamples.js'
import { portable } from '../src/domains/newExports.js'
function run(p,batch=p.samples){
  const job=experiment(p)
  while(job.step(batch)<p.samples) continue
  return job.result()
}
test('Coin endpoints, fair die expectation and frequencies',()=>{
  assert.equal(run({...defaults('coins'),p:0}).mean,0)
  assert.equal(run({...defaults('coins'),p:1}).mean,5)
  const dice=run({...defaults('coins'),mode:'die',samples:12000})
  assert.equal(dice.reference,3.5)
  assert.ok(Math.abs(dice.mean-3.5)<0.06)
  assert.equal(Object.values(dice.frequencies).reduce((a,b)=>a+b),12000)
})
test('Birthday collision benchmark, bounds and trace',()=>{
  const p=defaults('birthday')
  assert.ok(Math.abs(examples.birthday.reference(p)-0.5072972343)<1e-9)
  assert.ok(Math.abs(run({...p,samples:10000}).mean-0.5073)<0.025)
  assert.equal(replicate({...p,people:366},0,true).value,1)
  assert.equal(replicate({...p,people:1},0).value,0)
})
test('Independent components, parallel and series',()=>{
  const p={...defaults('reliability'),a:1,b:0,c:0.4}
  assert.equal(run(p).mean,0)
  assert.equal(run({...p,layout:'parallel'}).mean,1)
  assert.ok(Math.abs(examples.reliability.reference(defaults('reliability'))-0.729)<1e-12)
})
test('FCFS ordering, consistent cohort window and unstable mode',()=>{
  const p={...defaults('queue'),warmup:0,customers:12}
  const {scene,value,window,wait}=replicate(p,2,true)
  assert.equal(scene[0].arrival,scene[0].start)
  scene.forEach((c,i)=>{
    assert.ok(c.start>=c.arrival && c.end>=c.start)
    if(i) assert.ok(c.start>=scene[i-1].end)
  })
  assert.ok(Math.abs(wait/window-p.customers/window*value)<1e-12)
  assert.equal(examples.queue.reference({...p,arrival:p.service}),null)
  assert.equal(examples.queue.reference(p),20)
})
test('Inventory lead time, zero demand, conservation, paired policies and costs',()=>{
  const p={...defaults('inventory'),initial:0,point:0,alternate:0,days:7}
  const a=replicate(p,0,true)
  assert.deepEqual(a.base,a.alt)
  assert.equal(a.scene[0].ordered,p.order)
  assert.deepEqual(a.scene.slice(0,p.lead).map(d=>d.received),[0,0,0])
  assert.equal(a.scene[p.lead].received,p.order)
  assert.equal(a.base.served+a.base.unfilled,a.scene.reduce((s,d)=>s+d.demand,0))
  assert.equal(a.base.cost,a.base.holdingCost+p.lost*a.base.unfilled)
  assert.equal(replicate({...p,demand:0},2,true).base.unfilled,0)
})
test('All five experiments validate, replay across batches and export populated notebooks',()=>{
  for(const id of Object.keys(examples)){
    const p={...defaults(id),samples:40,seed:200}
    assert.deepEqual(issues(p),[])
    assert.deepEqual(run(p),run(p,3))
    assert.ok(issues({...p,samples:1.5}).length)
    const notebook=JSON.parse(portable(p).ipynb)
    assert.equal(notebook.nbformat,4)
    assert.ok(notebook.cells.some(c=>c.source.includes('seed = 200')))
  }
})

test('Portable domain JSON and bundles restore every model and replay its recorded estimate', async()=>{
  const {domainManifest,readDomainRun,convergenceSvg}=await import('../src/domains/newProjects.js')
  const {runBundle}=await import('../src/components/runBundle.js')
  const {unzipSync,strFromU8}=await import('fflate')
  for(const id of Object.keys(examples)){
    const model={...defaults(id),samples:53,seed:900}
    const result=run(model),manifest=domainManifest(model,result)
    const zip=runBundle({model,manifest,summary:{estimate:result.mean},notebook:JSON.parse(portable(model).ipynb)})
    const files=unzipSync(zip)
    const saved=readDomainRun(JSON.parse(strFromU8(files['run-manifest.json'])),id)
    assert.deepEqual(saved.model,model)
    assert.equal(run(saved.model).mean,saved.expected)
    assert.equal(JSON.parse(strFromU8(files['analysis.ipynb'])).nbformat,4)
    for(const broken of [null,{...manifest,engineVersion:'future'},{...manifest,replications:0},
      {...manifest,model:{...model,seed:-1}},{...manifest,estimate:Infinity}]) assert.throws(()=>readDomainRun(broken,id))
    assert.ok(convergenceSvg(model,result).includes('Completed replications'))
  }
})
