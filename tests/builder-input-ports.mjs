// Generate one notebook covering the full shared registry and per-family draw fixtures.
import {argv} from 'node:process'
import {writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {families,slotKeys,typedSlot} from '../src/engine/inputLaws.js'
import {compile,sample,createExperiment} from '../src/engine/index.js'
import {pythonScript,rScript,notebook} from '../src/engine/export.js'
const dir=argv[2]
const inputs=Object.entries(families).map(([distribution,family],i)=>({
  distribution,name:'v'+i,unit:'',label:family.title,
  ...Object.fromEntries(family.defaults.map((value,k)=>[slotKeys[k],typedSlot(distribution,value)])),
}))
const model={kind:'builder',question:'What is the sum of the independent demonstration inputs?',
  samples:125,seed:19,inputs,expression:inputs.map(v=>v.name).join('+'),threshold:25}
const run=createExperiment(model)
run.advance(model.samples)
const config=compile(model)
const expected=Object.fromEntries(config.inputs.map(v=>[v.name,Array.from({length:model.samples},(_,i)=>sample(v,i,model.seed))]))
writeFileSync(join(dir,'browser.json'),JSON.stringify({expected,mean:run.summary().mean}))
writeFileSync(join(dir,'families.py'),pythonScript(model)+'\nprint("QA", json.dumps({node["name"]:[sample(node,i) for i in range(n)] for node in model["inputs"]}))\n')
writeFileSync(join(dir,'families.R'),rScript(model)+'\nfor (name in names(inputs)) cat("QA",name,paste(sprintf("%.17g",inputs[[name]]),collapse=" "), "\\n")\n')
writeFileSync(join(dir,'families.ipynb'),JSON.stringify(notebook(model)))
