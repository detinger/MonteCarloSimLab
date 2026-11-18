import {inputLaw,slotKeys,typedSlot} from '../engine/inputLaws.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCheck, Cloud, Download, FolderOpen, Pause, Play, Plus, Redo2, Square, Undo2, Upload } from 'lucide-react'
import { ENGINE_VERSION } from '../engine/index.js'
import { startRun } from '../engine/client.js'
import { notebook, pythonScript, rScript } from '../engine/export.js'
import { checkProject, checkRun, compile, createProject, download, families, issuesFor, loadProjects, newInput, newRelation, saveProject } from './builder/project.js'
import {downloadRunBundle} from '../components/runBundle.js'
import {convergenceSvg,traceCsv} from './builder/chart.js'
import ModelGraph from './builder/ModelGraph.jsx'
import { Dialog, ExportPanel, Issues, NodeEditor, nodeTitle, ResultsPanel, Settings, Wizard } from './builder/Editor.jsx'
import '../styles/builder.css'

function visibleStamp(record) {
  return JSON.stringify({project:record.project,run:record.run})
}
function readIntent() {
  try {
    const id = sessionStorage.getItem('mc-builder-open')
    sessionStorage.removeItem('mc-builder-open')
    return id
  } catch { return null }
}

export default function Builder() {
  const [project,setProject] = useState(createProject)
  const [run,setRun] = useState(null)
  const [selected,select] = useState('formula')
  const [ready,setReady] = useState(false)
  const [dialog,setDialog] = useState('')
  const [catalog,setCatalog] = useState([])
  const [message,setMessage] = useState('')
  const [savedAt,setSavedAt] = useState('')
  const [saveState,setSaveState] = useState('Opening')
  const [status,setStatus] = useState('ready')
  const [history,setHistory] = useState({past:[],future:[]})
  const [resultsOpen,setResultsOpen] = useState(true)
  const [resultsHeight,setResultsHeight] = useState(280)
  const resultsResize = useRef(null)
  const revision = useRef(new Map())
  const queue = useRef(Promise.resolve())
  const stored = useRef(new Map())
  const waiting = useRef(false)
  const currentId = useRef(project.id)
  const job = useRef(null)
  const fileInput = useRef(null)
  const load = useCallback((record) => {
    const p = checkProject(record.project)
    const savedRun=checkRun(record.run)
    job.current?.dispose(); job.current = null
    currentId.current = p.id
    setProject(p);setRun(savedRun); setStatus('ready')
    setHistory({past:[],future:[]});select('formula');setDialog('');setMessage('')
    setSavedAt(record.updatedAt || ''); setSaveState(record.updatedAt ? 'Saved' : 'Draft')
    if (record.updatedAt) {
      revision.current.set(p.id,record.updatedAt)
      stored.current.set(p.id,visibleStamp(record))
    }
  },[])
  useEffect(() => {
    let active = true
    loadProjects().then(records => {
      if (!active) return
      const intent = readIntent()
      const first = records.find(r => r.id === intent) || records[0]
      if (first) load(first)
    }).catch(e => {if(active) setMessage(e.message)}).finally(() => {if(active) setReady(true)})
    return () => {active=false; job.current?.dispose(); job.current=null}
  },[load])
  const save = useCallback((p,r) => {
    const record={id:p.id,project:p,run:r}
    const stamp=visibleStamp(record)
    const pending = queue.current.then(async () => {
      if (stored.current.get(p.id) === stamp) return
      if (p.id === currentId.current) setSaveState('Saving')
      const previous = revision.current.get(p.id) ?? null
      record.updatedAt = new Date(Math.max(Date.now(),(Date.parse(previous) || 0)+1)).toISOString()
      await saveProject(record,previous)
      revision.current.set(p.id,record.updatedAt)
      stored.current.set(p.id,stamp)
      if (p.id === currentId.current) {setSaveState('Saved');setSavedAt(record.updatedAt)}
      window.dispatchEvent(new Event('mc-project-change'))
    })
    queue.current=pending.catch(e => {
      if(p.id===currentId.current) {setSaveState('Unsaved');setMessage(e.message)}
    })
    return pending
  },[])
  const working = ['running','paused'].includes(status)
  useEffect(() => {
    if (!ready || working || stored.current.get(project.id) === visibleStamp({project,run})) return
    const timer = setTimeout(() => {save(project,run).catch(() => {})},350)
    return () => clearTimeout(timer)
  },[project,run,ready,working,save])
  useEffect(() => {
    let active=true
    const open=async e=>{
      readIntent()
      if(!ready || e.detail===project.id) return
      if(working) {setMessage('Finish or cancel the active run before opening another project.');return}
      try {
        await save(project,run)
        const record=(await loadProjects()).find(r=>r.id===e.detail)
        if(active && record) load(record)
      } catch(error) {if(active)setMessage(error.message)}
    }
    window.addEventListener('mc-builder-open',open)
    return ()=>{active=false;window.removeEventListener('mc-builder-open',open)}
  },[ready,working,project,run,save,load])
  const edit=useCallback(patch=>{
    setHistory(h => ({past:[...h.past.slice(-69),project],future:[]}))
    setProject({...project,...patch});setSaveState('Edited')
  },[project])
  function undo(redo) {
    const source = redo ? history.future : history.past
    if (!source.length) return
    setHistory(redo ? {past:[...history.past,project],future:source.slice(0,-1)} : {past:source.slice(0,-1),future:[...history.future,project]})
    setProject(source.at(-1));setSaveState('Edited')
  }
  useEffect(()=>{
    if(!ready)return
    function receive(event) {
      let payload=event?.detail
      try {
        const raw=sessionStorage.getItem('mc-studio-input')
        if(raw){sessionStorage.removeItem('mc-studio-input');payload=JSON.parse(raw)}
        if(!payload)return
        const {distribution}=payload
        if(!Object.hasOwn(families,distribution)) throw Error('The selected distribution is unavailable in this Builder.')
        if(project.inputs.length>=32) throw Error('This model already has 32 inputs.')
        const input={...newInput([...project.inputs,...(project.relations||[])],project.unit),distribution}
        for(const [i] of families[distribution].fields.entries()){
          const key=slotKeys[i]
          const raw=payload.fields?.[i]??payload[key]
          if(typeof raw!=='string'&&!Number.isFinite(raw))throw Error('The Studio input has an invalid parameter.')
          input[key]=String(raw)
        }
        inputLaw({...input,...Object.fromEntries(families[distribution].fields.map((_,i)=>[slotKeys[i],typedSlot(distribution,input[slotKeys[i]])]))})
        input.label=families[distribution].title+' input'
        edit({inputs:[...project.inputs,input]});select(input.name);setMessage('Added '+input.label+' from Distribution Studio.')
      }catch(error){setMessage(error.message)}
    }
    receive()
    window.addEventListener('mc-studio-input',receive)
    return ()=>window.removeEventListener('mc-studio-input',receive)
  },[ready,project,edit])
  const issues = issuesFor(project)
  const model = compile(project)
  async function replace(p,r=null,recoverCopy=false) {
    try {
      if (working) throw Error('Finish or cancel the active run first.')
      if (!(recoverCopy && saveState==='Unsaved')) await save(project,run)
      load({project:p,run:r});return true
    } catch(e) {setMessage(e.message);return false}
  }
  function start() {
    if (issues.length || working || waiting.current) return
    setMessage(''); setStatus('running'); setSaveState('Running')
    const previousRun=run
    waiting.current=true
    try {
      const handle = startRun(model, result => {
        if(job.current !== handle) return
        setStatus(result.status);setRun({engineVersion:ENGINE_VERSION,model,result})
        if(result.status === 'complete' || result.status === 'cancelled') {job.current=null;setSaveState('Edited')}
      }, e => {if(job.current===handle) {setRun(value=>value?.model===model && value.result.n ? {...value,result:{...value.result,status:'failed'}} : previousRun);setStatus('failed');setMessage(String(e));job.current=null}})
      job.current=handle
    } catch(e){setStatus('failed');setMessage(e.message)}
    finally{waiting.current=false}
  }
  async function openProjects() {
    try {await save(project,run);setCatalog(await loadProjects());setDialog('open')} catch(e){setMessage(e.message)}
  }
  async function importFile(e) {
    const file=e.target.files[0]; e.target.value=''
    if(!file) return
    try {
      if(file.size>2000000) throw new Error('Project files must be smaller than 2 MB.')
      const bundle=JSON.parse(await file.text())
      if(bundle.schemaVersion!==1) throw new Error('Choose a version 1 Builder project file.')
      const imported=checkProject(bundle.project)
      const snapshot=checkRun(bundle.run)
      if (!await replace({...imported,id:crypto.randomUUID()},snapshot)) return
      setMessage(snapshot ? 'Project and recorded run imported. Run again to reproduce the experiment.' : 'Project imported.')
    } catch(err){setMessage(err.message)}
  }
  function exportFile(type) {
    try {
      if(type==='csv') download('captured-replications.csv',traceCsv(run),'text/csv')
      if(type==='chart') download('convergence.svg',convergenceSvg(run),'image/svg+xml')
      if(type==='zip') downloadRunBundle({name:'builder-run',model:run.model,summary:run.result,notebook:notebook(run.model),manifest:{schemaVersion:1,engineVersion:run.engineVersion,seed:run.model.seed,completed:run.result.n,status:run.result.status,question:run.model.question,assumptions:run.model.assumptions}})
      if(type==='project') download('simulation-project.json', JSON.stringify({schemaVersion:1,project,run},null,2))
      if(type==='notebook') download('simulation.ipynb',JSON.stringify(notebook(model),null,2))
      if(type==='python') download('simulation.py',pythonScript(model),'text/plain')
      if(type==='r') download('simulation.R',rScript(model),'text/plain')
      setDialog('')
    } catch(e){setMessage(e.message)}
  }
  const stale = run && JSON.stringify(run.model)!==JSON.stringify(model)
  function startResultsResize(e) {
    if (e.button !== 0) return
    resultsResize.current = {startY:e.clientY, startH:resultsHeight}
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }
  function doResultsResize(e) {
    if (!resultsResize.current) return
    const next = resultsResize.current.startH + (resultsResize.current.startY - e.clientY)
    setResultsHeight(Math.max(120, Math.min(window.innerHeight * 0.7, next)))
  }
  function endResultsResize() { resultsResize.current = null }
  return <article className="builder">
    <section className="bd-toolbar bd-panel">
      <div className="bd-toolbar-id">
        <strong>{project.title || 'Untitled model'}</strong>
        <small role="status"><Cloud size={12}/> {saveState==='Saved' ? 'Saved on this device' : saveState}</small>
      </div>
      <div className="bd-tools">
        <button disabled={!ready || working} onClick={openProjects}><FolderOpen size={15}/> Open</button>
        <button disabled={!ready || working} onClick={() => setDialog('new')}><Plus size={15}/> New</button>
        <button disabled={!ready || working} onClick={() => fileInput.current.click()}><Upload size={15}/> Import</button>
        <button disabled={!ready || working} onClick={() => setDialog('export')}><Download size={15}/> Export</button>
      </div>
      <div className="bd-toolbar-sep"/>
      <div className="bd-tools">
        <button disabled={!history.past.length} aria-label="Undo" title="Undo" onClick={() => undo(false)}><Undo2 size={15}/></button>
        <button disabled={!history.future.length} aria-label="Redo" title="Redo" onClick={() => undo(true)}><Redo2 size={15}/></button>
      </div>
      <div className="bd-toolbar-sep"/>
      <Settings draft={project} change={edit}/>
      <div className="bd-tools bd-toolbar-run">
        <button onClick={() => setDialog('validate')}><CheckCheck size={15}/> Validate{issues.length ? ' ('+issues.length+')' : ''}</button>
        {working ? <><button onClick={() => status==='paused' ? job.current?.resume() : job.current?.pause()}>{status==='paused' ? <Play size={15}/> : <Pause size={15}/>} {status==='paused' ? 'Resume' : 'Pause'}</button><button onClick={() => job.current?.cancel()}><Square size={14}/> Cancel</button></> :
        <button className="bd-primary" disabled={!ready || !!issues.length} onClick={start}><Play size={14}/> Run simulation</button>}
      </div>
    </section>
    {working && <div className="bd-progress-strip"><label>{status==='paused'?'Paused':'Running'} · {run?.result.n ?? 0} / {run?.model.samples ?? model.samples}</label><progress value={run?.result.n ?? 0} max={run?.model.samples ?? model.samples}/></div>}
    {issues.length>0 && !working && <p className="bd-alert bd-alert-strip">{issues[0]}</p>}
    {message && <p className="bd-alert bd-alert-strip" role="status">{message} <button onClick={() => setMessage('')}>Dismiss</button></p>}
    <div className="bd-workspace"><ModelGraph project={project} selected={selected} select={select} move={(id,p) => edit({positions:{...project.positions,[id]:p}})} arrange={positions=>edit({positions})} duplicate={source=>{
      if(source.distribution && project.inputs.length<32) {
        const copy={...source,name:newInput([...project.inputs,...(project.relations||[])]).name,label:source.label+' copy'}
        edit({inputs:[...project.inputs,copy]});select(copy.name)
      } else if(!source.distribution && (project.relations||[]).length<24){
        const copy={...source,name:newRelation(project).name,label:source.label+' copy'}
        edit({relations:[...(project.relations||[]),copy]});select(copy.name)
      }
    }} remove={node=>{
      if(node.distribution) edit({inputs:project.inputs.filter(v=>v!==node)})
      else edit({relations:(project.relations||[]).filter(v=>v!==node)})
      select('formula')
    }} edit={edit} editNode={id=>{select(id);setDialog('node')}} issues={issues} tidy={()=>edit({positions:{}})} addFormula={()=>{const v=newRelation(project);edit({relations:[...(project.relations||[]),v]});select(v.name)}} add={() => {
      const v=newInput([...project.inputs,...(project.relations||[])],project.unit);edit({inputs:[...project.inputs,v]});select(v.name)
    }}/></div>
    <ResultsPanel run={run} stale={stale} open={resultsOpen} onToggle={() => setResultsOpen(v => !v)} height={resultsHeight} onResizeStart={startResultsResize} onResizeMove={doResultsResize} onResizeEnd={endResultsResize}/>
    <input type="file" accept=".json,application/json" ref={fileInput} hidden onChange={importFile}/>
    {dialog==='new' && <Wizard close={() => setDialog('')} finish={replace}/>}
    {dialog==='node' && <Dialog title={nodeTitle(project, selected)} close={() => setDialog('')}><NodeEditor draft={project} selected={selected} change={edit} select={select} close={() => setDialog('')}/></Dialog>}
    {dialog==='export' && <Dialog title="Export" close={() => setDialog('')}><ExportPanel run={run} issues={issues} exportFile={exportFile} working={working}/></Dialog>}
    {dialog==='validate' && <Dialog title="Model validation" close={() => setDialog('')}><Issues issues={issues}/></Dialog>}
    {dialog==='open' && <Dialog title="Open project" close={() => setDialog('')}><div className="bd-project-list">{catalog.map(r => <button key={r.id} onClick={() => {try{load(r)}catch(e){setMessage(e.message);setDialog('')}}}><strong>{r.project.title || 'Untitled model'}</strong><small>{r.project.question}</small></button>)}</div></Dialog>}
  </article>
}
