import {resultNumber} from '../components/preferences'
import {captureCompleted} from '../experiments/snapshots.js'
import { useEffect, useRef, useState } from 'react'
import { Download, Play, Pause, Square, Save, FolderOpen, Upload } from 'lucide-react'
import { downloadRunBundle } from '../components/runBundle'
import { domainManifest, readDomainRun, localDomainRun, convergenceSvg } from '../domains/newProjects'
import { defaults, examples, issues } from '../domains/newExamples'
import { portable } from '../domains/newExports'
import { downloadPiFile as downloadText } from './piSession'
import CodeExporter from '../components/CodeExporter'
import '../styles/additional.css'

const fmt=n=>resultNumber(n,defaultFormat)
const defaultFormat=n=>Number.isFinite(n)?Number(n.toPrecision(5)).toLocaleString(undefined,{maximumFractionDigits:6}):'Unavailable'
function PointsPlot({points,label,step=false}){
  const xmax=Math.max(1,...points.map(p=>p.x)),ymin=Math.min(0,...points.map(p=>p.y)),ymax=Math.max(ymin+0.001,...points.map(p=>p.y))
  const x=v=>48+400*v/xmax,y=v=>113-91*(v-ymin)/(ymax-ymin)
  const path=points.map((p,i)=>i===0?`M${x(p.x)},${y(p.y)}`:step?`H${x(p.x)}V${y(p.y)}`:`L${x(p.x)},${y(p.y)}`).join(' ')
  return <figure className="extra-plot"><figcaption>{label}</figcaption>
    <svg viewBox="0 0 480 140" role="img" aria-label={label}>
      <path d="M48 16V113H448" fill="none" stroke="var(--border-strong)"/><path d={path} fill="none" stroke="var(--chart-1)" strokeWidth="2"/>
      <g fill="var(--text-muted)" fontSize="10" textAnchor="end"><text x="42" y="24">{fmt(ymax)}</text><text x="42" y="113">{fmt(ymin)}</text><text x="448" y="129">{fmt(xmax)}</text></g>
      <text x="47" y="129" fill="var(--text-muted)" fontSize="10">0</text>
    </svg>
  </figure>
}
function Table({columns,rows}){
  return <div className="extra-table"><table><thead><tr>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead>
    <tbody>{rows.map((row,i)=><tr key={i}>{row.map((v,j)=><td key={j}>{typeof v==='number'?fmt(v):v}</td>)}</tr>)}</tbody>
  </table></div>
}
function Scene({p,r}){
  if(p.id==='coins'){
    const min=p.mode==='coin'?0:1,max=p.mode==='coin'?p.tosses:6
    return <><h3>{p.mode==='coin'?'Heads in each group of tosses':'Die face frequency'}</h3><div className="extra-frequencies">
      {Array.from({length:max-min+1},(_,i)=>i+min).map(value=><div key={value}><b>{value}</b><progress max={r.n} value={r.frequencies[value]??0}/><span>{fmt(100*(r.frequencies[value]??0)/r.n)}%</span></div>)}
    </div></>
  }
  if(p.id==='birthday'){
    const counts=new Map()
    r.scene.forEach(d=>counts.set(d,(counts.get(d)??0)+1))
    const curve=Array.from({length:p.people},(_,i)=>({x:i+1,y:examples.birthday.reference({people:i+1})}))
    return <><h3>Birthday days in the first group</h3><p>Repeated day numbers carry an asterisk.</p><div className="extra-days">{r.scene.map((day,i)=><span key={i} className={counts.get(day)>1?'extra-hit':''}>{day}{counts.get(day)>1?' *':''}</span>)}</div>
      <PointsPlot points={curve} label="Exact collision probability by group size"/></>
  }
  if(p.id==='reliability') return <><h3>First mission · {p.layout} system</h3><div className={'extra-system '+p.layout}>{r.scene.map((survived,i)=><div key={i}>Component {i+1}<strong>{survived?'Survived':'Failed'}</strong></div>)}</div><p>{p.layout==='series'?'Mission success requires all three components to survive.':'Mission success requires one or more surviving components.'}</p></>
  if(p.id==='queue'){
    const events=r.scene.flatMap(c=>c.start>c.arrival?[{x:c.arrival,delta:1},{x:c.start,delta:-1}]:[]).sort((a,b)=>a.x-b.x||a.delta-b.delta)
    const points=[{x:r.scene[0].arrival,y:0}]
    for(const e of events) points.push({x:e.x,y:points.at(-1).y+e.delta})
    points.push({x:r.scene.at(-1).end,y:0})
    const t=r.totals
    return <><h3>First queue · measured cohort</h3><PointsPlot points={points} step label={`Waiting customers among the first ${r.scene.length} measured arrivals, by minute`}/>
      <details><summary>Customer arrival and service timeline</summary><Table columns={['Customer','Arrival (min)','Start (min)','Finish (min)']} rows={r.scene.map(c=>[c.customer,c.arrival,c.start,c.end])}/></details>
      <Table columns={['Queue diagnostic','Value']} rows={[
        ['Offered load ρ',p.arrival/p.service],['Measured cohort throughput (customers/hour)',60*p.customers*r.n/t.window],
        ['Fraction of cohort window spent serving measured customers',t.serviceSum/t.window],['Average measured cohort queue length',t.wait/t.window],['Cohort throughput × mean wait (customers)',p.customers*r.n/t.window*r.mean],
      ]}/><p>The cohort window runs from its first arrival through its last departure. Little’s accounting identity uses only customers in that cohort. The stable M/M/1 reference assumes equilibrium; this finite experiment starts empty.</p></>
  }
  const t=r.totals
  return <><h3>Inventory by day · first demand path</h3><PointsPlot points={r.scene.map(d=>({x:d.day,y:d.stock}))} step label="Baseline ending stock (units) by day"/>
    <details><summary>Daily orders and receipts</summary><Table columns={['Day','Demand','Received','Ordered','Ending stock','Alternative ending stock']} rows={r.scene.map((d,i)=>[d.day,d.demand,d.received,d.ordered,d.stock,r.altScene[i].stock])}/></details>
    <Table columns={['Policy','Mean total cost','Mean holding cost','Mean lost-sale cost','Unit fill rate','Stockout days','Fill target']} rows={['base','alt'].map(key=>{
      const requests=t[key+'served']+t[key+'unfilled']
      return [key==='base'?'Baseline':'Alternative',t[key+'cost']/r.n,t[key+'holdingCost']/r.n,p.lost*t[key+'unfilled']/r.n,requests?fmt(100*t[key+'served']/requests)+'%':'No demand',fmt(100*t[key+'stockouts']/(r.n*p.days))+'%',requests?(t[key+'served']/requests>=p.target?'Met':'Below target'):'No demand']
    })}/><p>Target fill rate {fmt(100*p.target)}%. Unit fill rate divides total units served by total units requested. Stockout days count days with any lost demand.</p></>
}
export default function AdditionalLab({id}){
  const meta=examples[id]
  const [draft,setDraft]=useState(()=>defaults(id))
  const [run,setRun]=useState(null)
  const [state,setState]=useState('ready')
  const [n,setN]=useState(0)
  const [message,setMessage]=useState('')
  const [exportType,setExportType]=useState('ipynb')
  const [code,setCode]=useState(false)
  const worker=useRef(null)
  const file=useRef(null)
  const [opening,setOpening]=useState(false)
  const p={id}
  for(const [k,v] of Object.entries(draft)){
    if(k==='id') continue
    p[k]=meta.fields.some(f=>f.key===k&&f.options)?v:String(v).trim()===''?NaN:Number(v)
  }
  const errors=issues(p), active=state==='running'||state==='paused'
  useEffect(()=>()=>worker.current?.terminate(),[])
  function runNow(snapshot=p,expected){
    if(issues(snapshot).length||active) return
    setMessage('')
    setState('running')
    setN(0)
    try {
      const job=new Worker(new URL('../domains/newWorker.js',import.meta.url),{type:'module'})
      worker.current=job
      const finish=()=>{job.terminate();worker.current=null}
      job.onmessage=({data})=>{
        if(job!==worker.current)return
        setState(data.status)
        if(data.status==='running'||data.status==='paused') setN(data.n)
        if(data.status==='cancelled'){
          setN(data.n)
          if(data.result) setRun({p:snapshot,r:data.result,partial:true})
          finish()
        }
        if(data.status==='complete'){
          setN(data.result.n)
          if(expected!==undefined && Math.abs(expected-data.result.mean)>1e-12*Math.max(1,Math.abs(expected))){
            setState('failed');setMessage('Replay differs from the stored estimate. Check the engine and source file.')
          }else{
            captureCompleted(snapshot,data.result)
            setRun({p:snapshot,r:data.result})
            if(expected!==undefined) setMessage('Reopened run reproduced the recorded estimate.')
          }
          finish()
        }
        if(data.status==='failed'){setMessage(data.message);finish()}
      }
      job.onerror=e=>{setMessage(e.message);setState('failed');finish()}
      job.postMessage({type:'start',config:snapshot})
    }catch(error){setState('failed');setMessage(error.message)}
  }
  async function reopen(selected){
    setOpening(true)
    try{
      if(selected && selected.size>131072) throw new Error('Choose a run JSON smaller than 128 KiB.')
      const data=selected?JSON.parse(await selected.text()):await localDomainRun(id)
      if(!data) throw new Error('Save a completed run on this device first.')
      const {model,expected}=readDomainRun(data,id)
      setDraft(model)
      runNow(model,expected)
    }catch(error){setMessage(error.message)}finally{setOpening(false)}
  }
  async function saveRun(){
    try{await localDomainRun(id,domainManifest(run.p,run.r));setMessage('Saved as the latest run for this experiment on this device.')}
    catch(error){setMessage('Local save failed. Download run JSON to keep a copy. '+error.message)}
  }
  function exportRun(){
    const {p,r}=run
    const summary=domainManifest(p,r)
    if(exportType==='zip') return downloadRunBundle({name:'mc-'+id,model:p,manifest:summary,summary:{...summary,convergence:r.convergence},notebook:JSON.parse(portable(p).ipynb)})
    if(exportType==='svg') return downloadText('mc-'+id+'-convergence.svg',convergenceSvg(p,r),'image/svg+xml')
    if(exportType==='json') downloadText(id+'-run.json',JSON.stringify(summary,null,2),'application/json')
    else if(exportType==='csv') downloadText(id+'-summary.csv','metric,seed,replications,estimate,lower95,upper95,reference\n'+[meta.metric(p),p.seed,r.n,r.mean,...(r.interval??['','']),r.reference].join(',')+'\n','text/csv')
    else downloadText('mc-'+id+'.'+exportType,portable(p)[exportType],exportType==='ipynb'?'application/x-ipynb+json':'text/plain')
  }
  const fields=[...meta.fields,{key:'samples',label:'Independent replications',step:1},{key:'seed',label:'Random seed',step:1}]
  const update=(key,value)=>setDraft(prev=>({...prev,[key]:value}))
  return <article className="extra-lab">
    <h1 className="sr-only">{meta.title}</h1>
    <div className="extra-grid"><section className="extra-card"><h2>Experiment setup</h2>
      <fieldset disabled={active||opening}>{fields.filter(f=>id!=='coins'||p.mode!=='die'||!['tosses','p'].includes(f.key)).map(f=><label key={f.key}>{f.label}
        {f.options?<select value={draft[f.key]} onChange={e=>update(f.key,e.target.value)}>{f.options.map(v=><option key={v}>{v}</option>)}</select>:
        <input type="text" inputMode={f.step===1?'numeric':'decimal'} value={draft[f.key]} onChange={e=>update(f.key,e.target.value)}/>}
      </label>)}</fieldset>
      {errors.length>0&&<p role="alert">{errors.join(' ')}</p>}
      <div className="extra-actions">
        {active?<><button onClick={()=>worker.current?.postMessage({type:state==='paused'?'resume':'pause'})}>{state==='paused'?<Play/>:<Pause/>}{state==='paused'?'Resume':'Pause'}</button>
          <button onClick={()=>worker.current?.postMessage({type:'cancel'})}><Square/> Cancel</button></>:
        <button className="extra-primary" onClick={()=>runNow()} disabled={errors.length>0||opening}><Play/> Run simulation</button>}
      </div>
      <div className="extra-actions"><button disabled={active||opening} onClick={()=>reopen()}><FolderOpen/> Reopen saved run</button>
        <button disabled={active||opening} onClick={()=>file.current.click()}><Upload/> Import run JSON</button></div>
      <input ref={file} type="file" accept=".json,application/json" hidden onChange={e=>{const selected=e.target.files?.[0];e.target.value='';if(selected) reopen(selected)}}/>
      <p role="status">{state==='ready'?'Ready to run':state+' · '+fmt(n)+' replications'}</p>{message&&<p role="alert">{message}</p>}
    </section><div className="extra-stack"><section className="extra-card"><h2>Model assumptions</h2><p>{meta.assumptions}</p>
      {id==='inventory'&&<p>Total cost adds ending-stock holding charges and lost-sale charges.</p>}
      {id==='queue'&&p.arrival>=p.service&&<p>Offered load is at least one. A stationary mean waiting time is unavailable.</p>}
    </section>
    {run&&<section className="extra-card"><h2>Run results</h2><small>{run.partial?'Partial run · ':''}Seed {run.p.seed} · {fmt(run.r.n)} replications{JSON.stringify(run.p)!==JSON.stringify(p)?' · From earlier settings':''}</small>
      <dl><dt>{meta.metric(run.p)}</dt><dd>{fmt(run.r.mean)}</dd><dt>95% {meta.probability?'Wilson':'Student t'} interval</dt><dd>{run.r.interval?run.r.interval.map(fmt).join(' – '):'Unavailable with one replication'}</dd>
      {run.r.reference!==null&&<><dt>{id==='queue'?'Stable equilibrium benchmark (minutes)':'Analytical reference'}</dt><dd>{fmt(run.r.reference)}</dd></>}</dl>
      <p>The interval measures sampling uncertainty across independent replications with fixed model settings.</p><Scene p={run.p} r={run.r}/>
    </section>}</div></div>
    {run&&<section className="extra-card"><h2>{run.partial?'Partial run analysis':'Analysis and export'}</h2>
      <PointsPlot points={run.r.convergence.map(pt=>({x:pt.n,y:pt.mean}))} label="Running estimate by completed replication"/>
      <details><summary>Distribution of replication outcomes</summary>
        <p>Counts group the {fmt(run.r.n)} replication outputs into equal-width bins or individual discrete outcomes.</p>
        <div className="extra-histogram">{run.r.histogram.map(bin=><div key={bin.low}><span>{fmt(bin.low)}{bin.high!==bin.low?' – '+fmt(bin.high):''}</span>
          <progress aria-label={'Count from '+fmt(bin.low)+' through '+fmt(bin.high)} value={bin.count} max={Math.max(...run.r.histogram.map(b=>b.count))}/><span>{fmt(bin.count)}</span></div>)}</div>
        <PointsPlot points={run.r.cdf.map(pt=>({x:pt.value,y:pt.q}))} step label="Cumulative probability by outcome value (percentile grid)"/>
      </details>
      <details><summary>Outcome quantiles and convergence data</summary><p>Quantiles use linear interpolation between adjacent ordered replication outcomes.</p>
        <Table columns={['Percentile','Replication output']} rows={[5,25,50,75,95].map(q=>[q,run.r.cdf[q].value])}/>
        <Table columns={['Completed','Estimate']} rows={run.r.convergence.map(v=>[v.n,v.mean])}/></details>
      {!run.partial&&<><div className="extra-actions"><button onClick={saveRun}><Save/> Save run</button><select aria-label="Export format" value={exportType} onChange={e=>setExportType(e.target.value)}>
        <option value="ipynb">Colab notebook (.ipynb)</option><option value="py">Python (.py)</option><option value="R">R (.R)</option><option value="csv">Summary (.csv)</option><option value="json">Reproducible run (.json)</option><option value="zip">Run bundle (.zip)</option><option value="svg">Convergence chart (.svg)</option>
      </select><button onClick={exportRun}><Download/> Download</button></div>
      <details onToggle={e=>setCode(e.currentTarget.open)}><summary>Python and R code</summary>
        {code&&<><CodeExporter language="Python" code={portable(run.p).py}/><CodeExporter language="R" code={portable(run.p).R}/></>}
      </details></>}
    </section>}
  </article>
}
