// Run with node tests/engine-ports.mjs OUTPUT_DIRECTORY (see engine-notebooks.py).
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {argv} from 'node:process'
import {createExperiment} from '../src/engine/index.js'
import {domainSpecs,defaults} from '../src/engine/domains.js'
import {pythonScript,rScript,notebook} from '../src/engine/export.js'

const directory=argv[2]
if(!directory) throw Error('Supply an output directory for the export fixtures.')
mkdirSync(directory,{recursive:true})
const models=[{kind:'pi',seed:0,samples:1000},
  {kind:'builder',question:'Does “quoted” equipment + labor exceed €200k?\n\\n ` "</script>',seed:4294967295,samples:10000,
    inputs:[{name:'x',distribution:'uniform',a:1,b:4},{name:'y',distribution:'normal',a:1,b:3},{name:'z',distribution:'triangular',a:2,b:3,c:4}],
    expression:'x+y*z + abs(-1) + sqrt(4) + min(2^3,max(4,5)) + log(exp(1))',threshold:2},
  ...Object.keys(domainSpecs).map(kind=>({...defaults(kind),samples:123}))]
models.push({...defaults('projectmgmt'),samples:400, params:{...defaults('projectmgmt').params,threshold:9}, fixture:'schedule-network',activities:[
  {id:'a',label:'Design',distribution:'pert',a:1,b:2,c:6,dependsOn:[]},
  {id:'b',label:'Truncated inspection',distribution:'truncated',a:0,b:4,dependsOn:[]},
  {id:'c',label:'Assembly',distribution:'triangular',a:2,b:3,c:4,dependsOn:['a','b']},
  {id:'d',label:'Finish',distribution:'constant',a:2,dependsOn:['c']},
]})
for(const [fixture,comparator] of [['greater','>'],['inclusive-greater','>='],['less','<'],['inclusive-less','<=']]){
  models.push({kind:'builder',fixture:'event-'+fixture,question:'Does the fixed output meet its boundary?',
    seed:42,samples:4,inputs:[{name:'two',distribution:'constant',a:2}],expression:'two',threshold:2,comparator})
}
for(const m of models){
  const run=createExperiment(m)
  run.advance(m.samples)
  const {mean,hits,meanCI,probabilityCI}=run.summary()
  const root=join(directory,m.fixture??m.kind)
  writeFileSync(root+'.json',JSON.stringify({mean,hits,meanCI,probabilityCI}))
  writeFileSync(root+'.ipynb',JSON.stringify(notebook(m)))
  writeFileSync(root+'.py',pythonScript(m)+'\nprint("QA",repr(mean),hits)\n')
  writeFileSync(root+'.R',rScript(m)+'\ncat(sprintf("QA %.17g %d\\n",mean(output),sum(event)))\n')
}
