import {resultNumber} from '../../components/preferences'
import {useCallback,useEffect,useRef,useState} from 'react'
import {Pause,Play,Download,Square} from 'lucide-react'
import {defaults,domainSpecs,integrands,reference} from '../../engine/domains.js'
import {validate,ENGINE_VERSION} from '../../engine/index.js'
import {startRun} from '../../engine/client.js'
import {pythonScript,rScript,notebook} from '../../engine/export.js'
import {Latex} from '../../components/ui/Latex'
import CodeExporter from '../../components/CodeExporter'
import {downloadRunBundle} from '../../components/runBundle.js'
import {csvData,runRecord,readRecord,localRecord,chartPng,chartSvg} from './runFiles.js'
import {downloadPiFile} from '../piSession'
import Activities from './Activities'
import {durationFamilies} from '../../engine/schedule.js'
import DomainScene, {Convergence} from './DomainScene'
import DistributionChart from '../../components/analysis/DistributionChart'
import '../../styles/analysis.css'
import '../../styles/pi.css'
import './domain.css'

const fmt=n=>resultNumber(n,defaultFormat)
const defaultFormat=n=>Number.isFinite(n)?Number(n.toPrecision(5)).toLocaleString(undefined,{maximumSignificantDigits:5}):'Unavailable'
const interval=ci=>ci?ci.map(fmt).join(' – '):'Unavailable'
const percent=p=>fmt(100*p)+'%'
const parse=s=>String(s??'').trim()===''?NaN:Number(s)
function Metric({name,value}){return <div><dt>{name}</dt><dd>{value}</dd></div>}

export default function DomainLab({kind}) {
  const spec=domainSpecs[kind]
  const [draft,setDraft]=useState(()=>defaults(kind))
  const [run,setRun]=useState(null)
  const [error,setError]=useState('')
  const [format,setFormat]=useState('ipynb')
  const [showCode,setShowCode]=useState(false)
  const job=useRef(null),file=useRef(null),scene=useRef(null)
  const [notice,setNotice]=useState('')
  const model={...draft,seed:parse(draft.seed),samples:parse(draft.samples),params:Object.fromEntries(Object.entries(draft.params).map(([k,v])=>[k,parse(v)]))}
  if(draft.activities){
    model.activities=draft.activities.map(task=>{
      const activity={...task}
      for(const key of 'abc'.slice(0,durationFamilies[task.distribution][1].length))activity[key]=parse(task[key])
      return activity
    })
  }
  const issues=validate(model),active=['running','paused'].includes(run?.result?.status)
  const begin=useCallback((config,expected)=>{
    job.current?.dispose()
    setError('');setNotice('')
    setRun({model:config,result:{status:'running',n:0}})
    try{
      job.current=startRun(config,result=>{
        if(expected && result.status==='complete'){
          if(result.hits!==expected.hits || Math.abs(result.mean-expected.mean)>1e-12*Math.max(1,Math.abs(expected.mean))){
            setError('Replay differs from the stored run summary.');setRun({model:config,result:{...result,status:'failed'}});return
          }
          setNotice('Reopened run and reproduced its saved summary.')
        }
        setRun({model:config,result})
      },message=>{
        setError(message);setRun(current=>({...current,result:{...current.result,status:'failed'}}))
      })
    }catch(e){setError(e.message);setRun(null)}
  },[])
  useEffect(()=>{
    const timer=setTimeout(()=>begin(defaults(kind)),0)
    return ()=>{clearTimeout(timer);job.current?.dispose()}
  },[kind,begin])
  const m=run?.model, r=run?.result
  const ready=r?.status==='complete',stale=m&&JSON.stringify(m)!==JSON.stringify(model)
  const patch=(key,value)=>setDraft(d=>({...d,[key]:value}))
  const patchParam=(key,value)=>setDraft(d=>({...d,params:{...d.params,[key]:value}}))
  async function reopen(upload){
    try{
      if(upload?.size>512000)throw Error('Choose a run JSON file smaller than 500 KiB.')
      const data=upload?JSON.parse(await upload.text()):await localRecord(kind)
      if(!data)throw Error('Save a completed run on this device first.')
      const saved=readRecord(data,kind)
      setDraft(saved.model);begin(saved.model,saved.summary)
    }catch(e){setError(e.message)}
  }
  async function save(){
    try{await localRecord(kind,runRecord(m,r));setNotice('Saved this run on this device.');setError('')}
    catch(e){setError(e.message)}
  }
  async function download(){
    try{
    let data
    if(format==='ipynb') data=JSON.stringify(notebook(m),null,2)
    if(format==='py') data=pythonScript(m)
    if(format==='R') data=rScript(m)
    if(format==='json') data=JSON.stringify(runRecord(m,r),null,2)
    if(format.endsWith('csv')) data=csvData(m,r,format)
    if(format==='zip'){
      const record=runRecord(m,r)
      await downloadRunBundle({name:kind+'-'+m.seed,model:m,manifest:{schemaVersion:1,engineVersion:ENGINE_VERSION,seed:m.seed,samples:m.samples},summary:record.summary,notebook:notebook(m)})
      return
    }
    if(format==='svg'||format==='png'){
      const svg=chartSvg(scene.current.querySelector('figure'),spec.scene+' · Seed '+m.seed+' · n = '+r.n)
      data=format==='svg'?svg:await chartPng(svg)
    }
    const mime={ipynb:'application/json',json:'application/json',svg:'image/svg+xml',png:'image/png'}
    downloadPiFile(kind+'-'+m.seed+'.'+format,data,mime[format]||(format.endsWith('csv')?'text/csv':'text/plain'))
    }catch(e){setError(e.message)}
  }
  const q=p=>r?.quantiles?.find(q=>q.p===p)?.value
  return <article className="pi-page domain-page">
    <header className="pi-header"><h1>{spec.title}</h1><p>{kind==='projectmgmt'?'How often does the project finish by its deadline?':spec.question}</p></header>
    <div className="pi-workspace">
      <section className="pi-card"><h2>Experiment setup</h2>
        <fieldset disabled={active}>
          {kind==='integration'&&<label>Integrand <select value={draft.integrand} onChange={e=>patch('integrand',e.target.value)}>{Object.entries(integrands).map(([key,s])=><option key={key} value={key}>{s}</option>)}</select></label>}
          {spec.fields.filter(f=>!draft.activities || f.key==='threshold').map(f=><label key={f.key}>{f.label}<input inputMode="decimal" value={draft.params[f.key]} onChange={e=>patchParam(f.key,e.target.value)}/></label>)}
          {kind==='projectmgmt'&&<Activities draft={draft} patch={patch}/>}
          <label>{kind==='stock'?'Number of paths':kind==='randomwalk'?'Number of walkers':'Replications'}<input inputMode="numeric" value={draft.samples} onChange={e=>patch('samples',e.target.value)}/></label>
          <input type="range" className="pi-slider" aria-label="Adjust number of replications" min="1" max={kind==='stock'||kind==='randomwalk'?500:20000} step="1" value={Number.isFinite(model.samples)?model.samples:1} onChange={e=>patch('samples',e.target.value)}/>
          <label>Random seed<input inputMode="numeric" value={draft.seed} onChange={e=>patch('seed',e.target.value)}/></label>
        </fieldset>
        {issues.length>0&&<p className="pi-validation" role="status">{issues.join(' ')}</p>}
        <div className="pi-actions">{active?<><button onClick={()=>r.status==='paused'?job.current.resume():job.current.pause()}>{r.status==='paused'?<Play/>:<Pause/>}{r.status==='paused'?'Resume':'Pause'}</button><button onClick={()=>job.current.cancel()}><Square/> Cancel</button></>:<button className="pi-primary" onClick={()=>begin(model)} disabled={!!issues.length}><Play/> Run simulation</button>}</div>
        <div className="pi-progress">{r&&<><div><strong role="status">{r.status}</strong><span>{r.n.toLocaleString()} / {m.samples.toLocaleString()}</span></div><progress value={r.n} max={m.samples} aria-label="Completed replications"/></>}</div>
        <div className="pi-reopen"><button disabled={active} onClick={()=>reopen()}>Reopen saved run</button><button disabled={active} onClick={()=>file.current.click()}>Import run JSON</button><input ref={file} hidden type="file" accept=".json" onChange={e=>{const selected=e.target.files?.[0];e.target.value='';if(selected)reopen(selected)}}/></div>
      </section>
      <section className="pi-card" ref={scene}><h2>{spec.scene}</h2>{r?.n>0?<DomainScene model={m} result={r}/>:<p>Preparing the experiment.</p>}
        <h3>Model assumptions</h3><p>{m?.activities?'Activities use independent durations in abstract days. Each activity starts after all predecessors finish. The project completes at the latest finish. Beta-PERT uses λ = 4.':spec.assumptions}</p><Latex math={m?.activities?'T=\\max_j F_j,\\quad F_j=D_j+\\max_{k\\in pred(j)}F_k':spec.formula} block/></section>
    </div>
    {notice&&<p role="status">{notice}</p>}
    {error&&<p role="alert" className="pi-validation">{error}</p>}
    {r?.n>0&&<section className="pi-card"><header><h2>Run results</h2>{stale&&<span className="pi-stale">From earlier settings</span>}</header>
      <p className="pi-caption">Seed {m.seed} · {r.n.toLocaleString()} independent replications · {ENGINE_VERSION}</p>
      <dl className="pi-metrics"><Metric name={spec.metric} value={fmt(r.mean)}/><Metric name={kind==='montyhall'?'95% Wilson interval':'95% t interval for mean'} value={interval(r.meanCI)}/>
        {reference(m)!==null&&<Metric name="Analytical reference" value={fmt(reference(m))}/>}
        <Metric name={spec.event} value={percent(r.probability)}/><Metric name="95% Wilson interval for event" value={r.probabilityCI.map(percent).join(' – ')}/>
        {kind==='montyhall'&&<><Metric name="Stay wins (reference ⅓)" value={percent(1-r.probability)}/><Metric name="Stay 95% Wilson interval" value={r.probabilityCI.map(p=>1-p).reverse().map(percent).join(' – ')}/><Metric name="Switch advantage (percentage points)" value={fmt(100*(2*r.probability-1))}/></>}
        {kind==='randomwalk'&&<Metric name="Root-mean-square displacement" value={fmt(Math.sqrt(r.mean))}/>}
        {kind==='integration'&&<><Metric name="Standard error" value={fmt(r.se)}/>{reference(m)!==null&&<Metric name="Signed estimation error" value={fmt(r.mean-reference(m))}/>}</>}
        {ready&&kind==='projectmgmt'&&<><Metric name="Finishes within 120 days" value={percent(r.under120/r.n)}/><Metric name="P80 / P90 (days)" value={[q(.8),q(.9)].map(fmt).join(' / ')}/></>}
        {ready&&kind!=='montyhall'&&<><Metric name={'Median ('+spec.unit+')'} value={fmt(q(.5))}/><Metric name="Sampled P5 – P95" value={[q(.05),q(.95)].map(fmt).join(' – ')}/></>}
      </dl>
      <p className="pi-caption">Confidence intervals measure sampling uncertainty under these assumptions. Outcome percentiles summarize the spread across replications.</p>
      {ready&&kind==='projectmgmt'&&<details><summary>Critical activity frequencies</summary><p>A critical activity lies on a longest path. Tied longest paths share credit.</p><table><thead><tr><th>Activity</th><th>Fraction of replications</th></tr></thead><tbody>{(m.activities??['procurement','construction','inspection'].map(id=>({id,label:id}))).map(t=><tr key={t.id}><td>{t.label}</td><td>{percent((r.criticalCounts[t.id]??0)/r.n)}</td></tr>)}</tbody></table></details>}
      {ready&&<details><summary>Analyze distribution and convergence</summary>
        <DistributionChart rows={r.histogram.map(b=>({lo:b.low,hi:b.high,count:b.count,observed:b.count/r.n}))} unit={spec.unit} n={r.n}/>
        <Convergence result={r} model={m}/>
      </details>}
      <details><summary>Inspect replication trace</summary><div className="domain-table"><table><thead><tr><th>Replication</th>{Object.keys(r.trace[0].inputs).map(k=><th key={k}>{k}</th>)}<th>Output</th><th>Event</th></tr></thead>
        <tbody>{r.trace.map(row=><tr key={row.index}><td>{row.index}</td>{Object.entries(row.inputs).map(([k,v])=><td key={k}>{fmt(v)}</td>)}<td>{fmt(row.output)}</td><td>{row.event?'Yes':'No'}</td></tr>)}</tbody></table></div></details>
    </section>}
    {ready&&<section className="pi-card"><h2>Export experiment</h2><p className="pi-caption">Exports use the completed run’s parameters and seed.</p>
      <div className="pi-actions"><label>File format <select value={format} onChange={e=>setFormat(e.target.value)}>
        {[['ipynb','Colab notebook (.ipynb)'],['py','Python script'],['R','R script'],['json','Run JSON'],['csv','Summary CSV'],['replications.csv','All replication outputs (CSV)'],...(['randomwalk','stock'].includes(kind)?[['path.csv','Displayed paths (CSV)']]:[]),['svg','Chart SVG'],['png','Chart PNG'],['zip','Reproducibility bundle (ZIP)']].map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
        <button onClick={download}><Download/> Download</button><button onClick={save}>Save run on device</button><button onClick={()=>setShowCode(!showCode)}>{showCode?'Hide':'View'} Python and R</button></div>
      {showCode&&<><CodeExporter language="Python" code={pythonScript(m)}/><CodeExporter language="R" code={rScript(m)}/></>}
    </section>}
  </article>
}
