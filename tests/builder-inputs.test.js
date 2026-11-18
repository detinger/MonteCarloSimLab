import assert from 'node:assert/strict'
import test from 'node:test'
import {compile as compileEngine, createExperiment, sample, validate} from '../src/engine/index.js'
import {families,slotKeys,typedSlot,inputLaw} from '../src/engine/inputLaws.js'
import {compile,createProject,checkProject} from '../src/pages/builder/project.js'
import {distributions,lawFor} from '../src/science/distributions.js'

for (const [kind,[,labels,defaults]] of Object.entries(distributions)) {
  test('Builder validates, saves and samples '+kind+' with Studio parameters',()=>{
    assert.deepEqual(families[kind].fields,labels)
    const project={...createProject(),expression:'x',unit:'',inputs:[{
      name:'x',label:kind,unit:'',distribution:kind,
      ...Object.fromEntries(defaults.map((v,i)=>[slotKeys[i],String(v)])),
    }]}
    const model=compile(checkProject(JSON.parse(JSON.stringify(project))))
    assert.deepEqual(validate(model),[])
    const run=createExperiment(model)
    run.advance(model.samples)
    const result=run.summary()
    const law=lawFor(kind,defaults)
    if(law.undefinedMean) {
      // No mean exists (Cauchy): compare the run's median with the theoretical median.
      const median=result.quantiles.find(q=>q.p===.5).value
      assert.ok(Math.abs(median-law.inv(.5))<6/(2*law.pdf(law.inv(.5))*Math.sqrt(model.samples)))
    } else assert.ok(Math.abs(result.mean-law.mean)<6*result.se+1e-12)
    const single=compileEngine(model)
    for(const row of result.trace) assert.equal(sample(single.inputs[0],row.index-1,model.seed),row.output)
  })
}
test('Extended distributions reject invalid parameters at the worker boundary',()=>{
  for (const [distribution,values] of [
    ['empirical',[[]]], ['empirical',[[1,Infinity]]], ['empirical',['1,2']],['categorical',[[0,0.4]]],
    ['truncated',[0,1,4,-1]], ['truncated',[0,1,12,13]], ['weibull',[0,3]],['discrete',[2.5,9]],
    ['gamma',[1,-2]],['poisson',[-1]],['binomial',[3.1,0.3]],['beta',[2,0]],
    ['geometric',[0]],['geometric',[1.2]],['negbinomial',[1.5,0.5]],['negbinomial',[3,0]],['hypergeometric',[10,11,3]],
    ['hypergeometric',[10,4,12]],['hypergeometric',[9.5,4,2]],['logistic',[0,0]],['cauchy',[0,-1]],['minextreme',[1,0]],
  ]){
    assert.throws(()=>inputLaw({distribution,...Object.fromEntries(values.map((v,i)=>[slotKeys[i],v]))}))
  }
  assert.ok(Number.isNaN(typedSlot('empirical','1,,2')[1]))
})
test('Empirical duplicates keep their multiplicity; categorical zero masses and constant endpoints survive',()=>{
  const probability=lawFor('empirical',['3,3,11'])
  assert.equal(probability.pdf(3),2/3)
  const cat=lawFor('categorical',['0,1,0'])
  assert.equal(cat.inv(1e-10),2)
  assert.equal(lawFor('constant',[3]).inv(.99),3)
})
