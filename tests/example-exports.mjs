// Run every Simulation Examples model through all seven Builder exports: execute the
// Python script, R script and notebook, compare their results with the browser engine
// and check that every analysis figure is produced. Usage: PYTHON=python3 node tests/example-exports.mjs [replications]
import {mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createServer} from 'vite'
import {writeFileSync,mkdirSync,readFileSync,existsSync,rmSync} from 'node:fs'
const PNG=['input-distributions.png','output-distribution.png','convergence.png','sensitivity.png']
import {execFileSync} from 'node:child_process'
import {unzipSync,strFromU8} from 'fflate'
const root=new URL('..',import.meta.url).pathname, out=mkdtempSync(join(tmpdir(),'mc-exports-')), N=+process.argv[2]||2000
const s=await createServer({root,server:{middlewareMode:true,hmr:false,watch:null},appType:'custom',logLevel:'error'})
const L=p=>s.ssrLoadModule(p)
const {itModels,buildModel}=await L('/src/itModels.js')
const {compile,issuesFor}=await L('/src/pages/builder/project.js')
const {createExperiment,ENGINE_VERSION}=await L('/src/engine/index.js')
const {pythonScript,rScript,notebook}=await L('/src/engine/export.js')
const {convergenceSvg,traceCsv}=await L('/src/pages/builder/chart.js')
const {runBundle}=await L('/src/components/runBundle.js')
const {checkProject}=await L('/src/pages/builder/project.js')
const py=process.env.PYTHON||'python3'
let bad=0
for(const m of itModels){
  const fails=[]; const d=out+'/'+m.code; mkdirSync(d,{recursive:true})
  const step=(name,f)=>{try{f()}catch(e){fails.push(name+': '+String(e.message||e).split('\n').slice(-3).join(' ').slice(0,300))}}
  const project={...buildModel(m),samples:String(N)}
  const issues=issuesFor(project); if(issues.length) fails.push('validation: '+issues.join('; '))
  const model=compile(project)
  let run
  step('js-run',()=>{const e=createExperiment(model);e.advance(model.samples);run={engineVersion:ENGINE_VERSION,model,result:e.summary()}})
  const js=run?.result
  step('project.json',()=>{const t=JSON.stringify({schemaVersion:1,project,run});checkProject(JSON.parse(t).project)})
  step('csv',()=>{const c=traceCsv(run);if(c.split('\n').length<3)throw Error('empty csv');writeFileSync(d+'/t.csv',c)})
  step('svg',()=>{const v=convergenceSvg(run);if(!v.includes('<svg')||/NaN|undefined/.test(v))throw Error('bad svg');writeFileSync(d+'/c.svg',v)})
  step('zip',()=>{const z=unzipSync(runBundle({model:run.model,summary:run.result,notebook:notebook(run.model),manifest:{seed:model.seed}}));for(const k in z)JSON.parse(strFromU8(z[k]))})
  const close=(a,b,tag)=>{if(!(Math.abs(a-b)<=1e-6*Math.max(1,Math.abs(b))))throw Error(tag+' '+a+' vs JS '+b)}
  step('python',()=>{writeFileSync(d+'/simulation.py',pythonScript(model));const o=execFileSync(py,['simulation.py'],{cwd:d,stdio:'pipe',env:{...process.env,MPLBACKEND:'Agg'}}).toString();const r=JSON.parse(o.slice(o.indexOf('\n{'),o.indexOf('\n}')+2));for(const f of PNG)if(!existsSync(d+'/'+f))throw Error('python missing '+f);close(r.mean,js.mean,'mean');close(r.probability,js.probability,'prob')})
  step('R',()=>{writeFileSync(d+'/simulation.R',rScript(model)+'\ncat("QA",mean(output),prob,"\\n")\n');for(const f of PNG)rmSync(d+'/'+f,{force:true});const o=execFileSync('Rscript',['simulation.R'],{cwd:d,stdio:'pipe'}).toString();for(const f of PNG)if(!existsSync(d+'/'+f))throw Error('R missing '+f);const [,a,b]=o.split('\n').find(l=>l.startsWith('QA')).trim().split(/\s+/).map(Number);close(a,js.mean,'mean');close(b,js.probability,'prob')})
  step('notebook',()=>{writeFileSync(d+'/simulation.ipynb',JSON.stringify(notebook(model)));execFileSync(py,['-c',`import nbformat;from nbclient import NotebookClient;nb=nbformat.read('simulation.ipynb',4);NotebookClient(nb,timeout=300,kernel_name='python3').execute();imgs=sum(1 for c in nb.cells if c.cell_type=='code' for o in c.get('outputs',[]) if 'image/png' in o.get('data',{}));assert imgs>=4,imgs;print(imgs)`],{cwd:d,stdio:'pipe',env:Object.fromEntries(Object.entries(process.env).filter(([k])=>k!=='MPLBACKEND'))})})
  if(fails.length)bad++
  console.log(m.code.padEnd(5),m.name.padEnd(32),fails.length?'FAIL\n    '+fails.join('\n    '):'OK  mean='+js.mean.toFixed(2)+' p='+js.probability.toFixed(4))
}
await s.close()
console.log(bad ? bad+' model(s) failed.' : 'All '+itModels.length+' models passed every export.')
process.exit(bad?1:0)
