import {useEffect,useRef,useState} from 'react'
import {compile,createProject,download,families,loadProjects} from './builder/project'
import {slotKeys,typedSlot} from '../engine/inputLaws.js'
import {ENGINE_VERSION,validate} from '../engine/index'
import DistributionChart from '../components/analysis/DistributionChart'
import '../styles/analysis.css'

const f=(value,scale=1)=>Number.isFinite(value)?(value*scale).toLocaleString(undefined,{maximumSignificantDigits:5}):'Unavailable'
const displayParam=v=>Array.isArray(v)?v.join(', '):f(v)
const bounds=(ci,scale=1)=>ci?ci.map(x=>f(x,scale)).join(' to '):'Unavailable for one replication'

export default function ModelAnalysis({mode}) {
  const comparing=mode==='compare'
  const [example]=useState(()=>createProject())
  const [records,setRecords]=useState([]), [selected,setSelected]=useState('example')
  const [field,setField]=useState('threshold'), [value,setValue]=useState('190000')
  const [size,setSize]=useState(example.samples), [seed,setSeed]=useState(example.seed)
  const [run,setRun]=useState(null), [progress,setProgress]=useState(null), [error,setError]=useState('')
  const [coupling,setCoupling]=useState('independent')
  const worker=useRef(null)
  useEffect(()=>{
    let mounted=true
    const refresh=()=>loadProjects().then(list=>{if(mounted)setRecords(list)}).catch(()=>{if(mounted)setError('Saved projects could not be read. The example model is available.')})
    refresh()
    window.addEventListener('mc-project-change',refresh)
    return ()=>{mounted=false;window.removeEventListener('mc-project-change',refresh);worker.current?.terminate()}
  },[])
  const project=records.find(r=>r.id===selected)?.project??example
  const base=compile({...project,samples:size,seed})
  const alt=structuredClone(base)
  const options=[{key:'threshold',label:'Decision threshold',value:base.threshold},...base.inputs.flatMap((v,i)=>families[v.distribution].fields.map((label,k)=>({key:i+'.'+slotKeys[k],label:(v.label||v.name)+' · '+label,value:v[slotKeys[k]]})))]
  let errors=validate(base)
  if(comparing){
    const number=value.trim()?Number(value):NaN
    if(field==='threshold') alt.threshold=number
    else {
      const [i,key]=field.split('.')
      if(alt.inputs[i]) alt.inputs[i][key]=typedSlot(alt.inputs[i].distribution,value)
      else errors.push('Select a parameter in this model.')
    }
    errors=[...new Set([...errors,...validate(alt)])]
  }
  const signature=JSON.stringify([base,comparing?alt:null,coupling])
  function start() {
    const job=new Worker(new URL('../science/analyze.worker.js',import.meta.url),{type:'module'})
    setProgress(0);setError('');worker.current=job
    const done=()=>{job.terminate();worker.current=null;setProgress(null)}
    job.onerror=()=>{setError('The analysis worker stopped unexpectedly.');done()}
    job.onmessage=({data})=>{
      if(data.n!==undefined){setProgress(data.n);return}
      if(data.error) setError(data.error)
      else setRun({signature,base,alt:comparing?alt:null,changeLabel:options.find(o=>o.key===field)?.label,from:options.find(o=>o.key===field)?.value,to:field==='threshold'?alt.threshold:alt.inputs[field.split('.')[0]]?.[field.split('.')[1]],result:data.result})
      done()
    }
    job.postMessage({base,alt:comparing?alt:null,coupling})
  }
  function choose(id) {
    const next=records.find(r=>r.id===id)?.project??example
    setSelected(id);setSeed(next.seed);setSize(next.samples);setField('threshold');setValue(next.threshold)
  }
  const r=run?.result, paired=r?.paired
  return <div className="research-page"><h1 className="sr-only">{comparing?'Compare scenarios':'Experiment analysis'}</h1>
    <div className="research-columns"><section className="research-panel"><h2>{comparing?'Baseline and alternative':'Experiment settings'}</h2><label>Model<select value={selected} onChange={e=>choose(e.target.value)}><option value="example">Project budget example</option>{records.map(r=><option key={r.id} value={r.id}>{r.project.title}</option>)}</select></label>
      <p>{project.question}</p><p><code>{base.expression}</code></p>
      <label>Replications<input value={size} onChange={e=>setSize(e.target.value)}/></label><label>Seed<input value={seed} onChange={e=>setSeed(e.target.value)}/></label>
      {comparing&&<><label>Sampling design<select value={coupling} onChange={e=>setCoupling(e.target.value)}><option value="independent">Independent streams</option><option value="paired">Paired random draws</option></select></label><label>Parameter to change<select value={field} onChange={e=>{setField(e.target.value);setValue(String(options.find(o=>o.key===e.target.value).value))}}>{options.map(o=><option key={o.key} value={o.key}>{o.label}</option>)}</select></label><p>Baseline value · {displayParam(options.find(o=>o.key===field)?.value)}</p><label>Alternative value<input value={value} onChange={e=>setValue(e.target.value)}/></label></>}
      {errors.map(e=><p role="alert" key={e}>{e}</p>)}
      <button className="primary-control" onClick={start} disabled={!!errors.length||progress!==null}>{comparing?'Run comparison':'Run analysis'}</button>
      {progress!==null&&<button onClick={()=>{worker.current?.terminate();worker.current=null;setProgress(null);setError('Run cancelled.')}}>Cancel ({f(progress)} completed)</button>}
      {error&&<p role="status">{error}</p>}</section>
    <section className="research-panel"><h2>{comparing?'Scenario comparison':'Outcome distribution'}</h2>{!r?<p>Run the experiment to see results for the selected settings.</p>:<><p role="status">{run.signature!==signature?'From earlier settings · ':''}{r.n.toLocaleString()} replications · seed {r.seed} · {ENGINE_VERSION}</p>
      {paired?<><p>{run.changeLabel} · {displayParam(run.from)} → {displayParam(run.to)}</p><div className="scroll-table"><table><thead><tr><th>Metric</th><th>Baseline</th><th>Alternative</th><th>Change</th><th>95% interval for change</th></tr></thead><tbody>
        <tr><th>Mean ({run.base.unit||'output units'})</th><td>{f(r.mean)}</td><td>{f(paired.mean)}</td><td>{f(paired.meanChange)}</td><td>{bounds(paired.meanCI)}</td></tr>
        <tr><th>Threshold event</th><td>{f(r.probability,100)}%</td><td>{f(paired.probability,100)}%</td><td>{f(paired.probabilityChange,100)} pp</td><td>{bounds(paired.probabilityChangeCI,100)} pp</td></tr>
        {['P5','P25','Median','P75','P95'].map((q,i)=><tr key={q}><th>{q} ({run.base.unit||'units'})</th><td>{f(r.quantiles[i])}</td><td>{f(paired.quantiles[i])}</td><td>{f(paired.quantiles[i]-r.quantiles[i])}</td><td>Descriptive</td></tr>)}</tbody></table></div>
        <p>{paired.coupling==='paired'?'The two scenarios share random draws. Paired t intervals use within-pair differences and can be unreliable with few discordant events.':'Scenarios use disjoint random streams. The mean difference uses a Welch t interval. The probability difference uses a Newcombe interval from the two Wilson bounds.'}</p></>:<><div className="stat-strip"><div><small>Mean ({run.base.unit||'units'})</small><strong>{f(r.mean)}</strong></div><div><small>Sample SD</small><strong>{f(r.sd)}</strong></div><div><small>Output {run.base.comparator||'>'} {f(run.base.threshold)}</small><strong>{f(r.probability,100)}%</strong></div></div>
          <p>95% t interval for the mean · {bounds(r.meanCI)}<br/>95% Wilson interval for the event probability · {bounds(r.probabilityCI,100)}%</p>
          <DistributionChart rows={r.rows} unit={run.base.unit||'Output'} n={r.n}/>
          <details><summary>Outcome quantiles</summary><table><tbody>{['P5','P25','Median','P75','P95'].map((q,i)=><tr key={q}><th>{q}</th><td>{f(r.quantiles[i])} {run.base.unit}</td></tr>)}</tbody></table><p>Linear interpolation between ordered outcomes at position (n − 1)p.</p></details>
          <details><summary>Convergence of the mean</summary><div className="scroll-table"><table><thead><tr><th>Replications</th><th>Running mean</th></tr></thead><tbody>{r.convergence.map(v=><tr key={v.n}><td>{v.n}</td><td>{f(v.mean)}</td></tr>)}</tbody></table></div></details></>}
      <button onClick={()=>download(mode+'.json',JSON.stringify({version:1,engine:ENGINE_VERSION,baseline:run.base,alternative:run.alt,result:r},null,2))}>Download results (JSON)</button></>}</section></div></div>
}
