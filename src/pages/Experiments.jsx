import {useEffect,useRef,useState} from 'react'
import {Play,Pause,Square,History,Download} from 'lucide-react'
import {compatible,executeModel,modelErrors,modelInfo,storeJob} from '../experiments/library.js'
import {compactResult} from '../experiments/snapshots.js'
import {SourcePicker,Snapshot,Results} from '../experiments/controls.jsx'
import {entryLabel,fmt} from '../experiments/format.js'
import {useLibrary} from '../experiments/useLibrary.js'
import '../styles/analysis.css'
import '../styles/experiments.css'

const integer=s=>/^\d+$/.test(String(s).trim())?Number(s):NaN
export default function Experiments(){
  const {entries,warnings}=useLibrary()
  const [selected,select]=useState('preset-pi'),[fields,setFields]=useState({})
  const [live,setLive]=useState(null),[baseline,setBaseline]=useState(''),[message,setMessage]=useState('')
  const [showAll,setShowAll]=useState(false)
  const worker=useRef(null)
  useEffect(()=>()=>worker.current?.dispose(),[])
  const source=entries.find(e=>e.id===selected)??entries.find(e=>e.id==='preset-pi')
  const m=source.model,seed=fields.seed??m.seed,samples=fields.samples??m.samples
  const model={...m,samples:integer(samples),seed:integer(seed)},errors=modelErrors(model)
  const active=['running','paused'].includes(live?.status)
  const record=live??(source.result?source:null)
  const history=entries.filter(e=>e.source==='Runner history')
  const peers=record?.result?.n?entries.filter(e=>e.result?.n&&e.id!==record.id&&e.status==='complete'&&compatible(record.model,e.model)):[]
  const other=peers.find(e=>e.id===baseline)
  function choose(id){select(id);setFields({});setLive(null);setBaseline('');setMessage('')}
  function begin(){
    if(active||errors.length)return
    worker.current?.dispose()
    setMessage('');setBaseline('')
    const job={schemaVersion:1,engineVersion:modelInfo(m).engine,id:crypto.randomUUID(),title:source.title??modelInfo(m).title,source:'Runner history',sourceId:source.id,
      startedAt:new Date().toISOString(),model:structuredClone(model)}
    let progress={n:0}
    const finish=(status,error)=>{
      const done={...job,result:progress,status,finishedAt:new Date().toISOString(),error:error??null}
      setLive(done)
      storeJob(done).catch(()=>setMessage('Device storage is unavailable. This job is available in the current session.'))
    }
    setLive({...job,status:'running',result:progress})
    try{
      worker.current=executeModel(job.model,data=>{
        progress=compactResult(data)
        if(['complete','cancelled'].includes(data.status))finish(data.status)
        else setLive({...job,status:data.status,result:progress})
      },e=>finish('failed',e))
    }catch(error){finish('failed',error.message)}
  }
  return <article className="research-page runner-page">
    {warnings.map(w=><p role="status" key={w}>{w}</p>)}
    <div className="research-columns"><section className="research-panel"><h2>Run configuration</h2>
      <SourcePicker entries={entries} value={source.id} disabled={active} onChange={choose}/>
      <label>Replications<input inputMode="numeric" disabled={active} value={samples} onChange={e=>setFields(f=>({...f,samples:e.target.value}))}/></label>
      <label>Random seed<input inputMode="numeric" disabled={active} value={seed} onChange={e=>setFields(f=>({...f,seed:e.target.value}))}/></label>
      {errors.length>0&&<p role="alert">{errors.join(' ')}</p>}
      <div className="run-actions">{active?<><button onClick={()=>live.status==='paused'?worker.current.resume():worker.current.pause()}>{live.status==='paused'?<Play/>:<Pause/>}{live.status==='paused'?'Resume':'Pause'}</button><button onClick={()=>worker.current.cancel()}><Square/> Cancel</button></>:<button className="primary-control" disabled={!!errors.length} onClick={begin}><Play/> Run experiment</button>}
        <a href={'#/'+modelInfo(m).family}>Open model</a></div>
      <Snapshot model={model}/>
    </section><section className="research-panel"><h2>{record?'Run results':'Experiment'}</h2>
      {record?<><p><b>{record.title??modelInfo(record.model).title}</b></p><p role="status">{record.status} · {record.result?.n?.toLocaleString()??0} of {record.model.samples.toLocaleString()} replications</p>
        {active&&<progress aria-label="Job progress" value={live.result.n} max={live.model.samples}/>}
        {record.error&&<p role="alert">{record.error}</p>}
        {!active&&JSON.stringify(record.model)!==JSON.stringify(model)&&<p>From earlier settings</p>}
        <Results entry={record}/>
        {record.status==='complete'&&<a className="run-export" href={'#/exports/'+encodeURIComponent(record.id)}><Download size={16}/> Export this run</a>}
        {!!peers.length&&!active&&<div className="run-compare"><label>Compare with a saved result<select value={other?.id??''} onChange={e=>setBaseline(e.target.value)}><option value="">Choose a comparable run</option>{peers.map(e=><option key={e.id} value={e.id}>{entryLabel(e)}</option>)}</select></label>
          {other&&<><p>Difference in estimates · <b>{fmt(record.result.mean-other.result.mean)}</b></p><p>Selected estimate {fmt(record.result.mean)} minus comparison estimate {fmt(other.result.mean)}. The comparison used seed {other.model.seed} and {other.result.n.toLocaleString()} replications.</p><Snapshot model={other.model}/></>}
        </div>}
      </>:<><p><b>{source.title??modelInfo(m).title}</b></p><p>{m.question||'The results will appear here as the worker completes replications.'}</p>
      <div className="stat-strip"><div><small>Estimator</small><strong>{modelInfo(m).metric}</strong></div><div><small>Interval method</small><strong>{modelInfo(m).method}</strong></div></div></>}
      {message&&<p role="status">{message}</p>}
    </section></div>
    <section className="research-panel"><h2><History size={18}/> Run history</h2>{!history.length?<p>Completed and cancelled jobs appear here after their first run.</p>:<div className="scroll-table"><table><thead><tr><th>Model</th><th>Finished</th><th>Seed</th><th>Completed</th><th>Estimate</th><th>Status</th><th>Action</th></tr></thead><tbody>{(showAll?history:history.slice(0,15)).map(e=><tr key={e.id}><td>{e.title}</td><td>{new Date(e.finishedAt).toLocaleString()}</td><td>{e.model.seed}</td><td>{e.result.n.toLocaleString()}</td><td>{fmt(e.result.mean)}</td><td>{e.status}</td><td><button disabled={active} onClick={()=>choose(e.id)}>Reopen</button></td></tr>)}</tbody></table></div>}
    {history.length>15&&<button onClick={()=>setShowAll(!showAll)}>{showAll?'Show recent jobs':'Show all '+history.length+' jobs'}</button>}</section>
  </article>
}
