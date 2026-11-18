import {inputLaw,slotKeys,typedSlot} from '../engine/inputLaws.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCheck, Copy, Download, FolderOpen, Pause, Play, Plus, Redo2, Save, Square, Undo2, Upload } from 'lucide-react'
import { ENGINE_VERSION } from '../engine/index.js'
import { startRun } from '../engine/client.js'
import { notebook, pythonScript, rScript } from '../engine/export.js'
import { checkProject, checkRun, compile, createProject, download, families, issuesFor, loadProjects, newInput, newRelation, parseBuilderLink, saveProject, template } from './builder/project.js'
import {downloadRunBundle} from '../components/runBundle.js'
import {convergenceSvg,traceCsv} from './builder/chart.js'
import ModelGraph from './builder/ModelGraph.jsx'
import { Dialog, Inspector, Issues, Settings, Wizard } from './builder/Editor.jsx'
import Results from './builder/Results.jsx'
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
  const [history,setHistory] = useState({past:[],future:[]})
  const [status,setStatus] = useState('ready')
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
  useEffect(() => {
    if (!ready) return
    let active=true
    const follow=async()=>{
      const link=parseBuilderLink(location.hash.slice(1)||location.pathname)
      if(!link) return
      // Collapse the link so a reload does not open another template copy.
      window.history.replaceState(window.history.state,'',location.pathname+location.search+'#/builder')
      if(link.template) {
        if(working) {setMessage('Finish or cancel the active run before opening another project.');return}
        try {
          await save(project,run)
          if(!active) return
          const draft=template(link.template)
          load({project:draft,run:null})
          setMessage('Opened a new copy of the '+draft.title+' template.')
        } catch(error) {if(active)setMessage(error.message);return}
      }
      const known=['formula','event','metric','question',...project.inputs.map(v=>v.name),...(project.relations||[]).map(v=>v.name)]
      if(link.node && (link.template || known.includes(link.node))) select(link.node)
    }
    follow()
    window.addEventListener('hashchange',follow)
    return ()=>{active=false;window.removeEventListener('hashchange',follow)}
  },[ready,working,project,run,save,load])
  const edit=useCallback(patch=>{
    setHistory(h => ({past:[...h.past.slice(-69),project],future:[]}))
    setProject({...project,...patch});setSaveState('Edited')
  },[project])
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
  function undo(redo) {
    const source = redo ? history.future : history.past
    if (!source.length) return
    setHistory(redo ? {past:[...history.past,project],future:source.slice(0,-1)} : {past:source.slice(0,-1),future:[...history.future,project]})
    setProject(source.at(-1));setSaveState('Edited')
  }
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
  return <article className="builder">
    <header className="bd-title"><div><h1>Simulation Builder</h1><p>Model a question, test your assumptions and measure uncertainty.</p></div>
      <div className="bd-tools"><button disabled={!ready || working} onClick={openProjects}><FolderOpen size={15}/> Open</button><button disabled={!ready || working} onClick={() => setDialog('new')}><Plus size={15}/> New model</button></div></header>
    <section className="bd-project bd-panel"><div><h2>{project.title || 'Untitled model'}</h2><p>{project.question || 'Add a decision question in Project settings.'}</p>
      <small role="status">{saveState}{saveState==='Saved' && savedAt ? ' locally · '+new Date(savedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : ''}</small></div>
      <div className="bd-tools"><button disabled={!ready || working} aria-label="Save project" title="Save project" onClick={() => save(project,run).catch(() => {})}><Save size={15}/></button>
        <button disabled={!history.past.length} aria-label="Undo" onClick={() => undo(false)}><Undo2 size={15}/></button>
        <button disabled={!history.future.length} aria-label="Redo" onClick={() => undo(true)}><Redo2 size={15}/></button>
        <button disabled={!ready || working} aria-label="Duplicate model" onClick={() => replace({...project,id:crypto.randomUUID(),title:project.title+' copy'},run,true)}><Copy size={15}/></button>
        <button onClick={() => setDialog('export')}><Download size={15}/> Export</button></div></section>
    {message && <p className="bd-alert" role="status">{message} <button onClick={() => setMessage('')}>Dismiss</button></p>}
    <div className="bd-workspace"><ModelGraph project={project} selected={selected} select={select} move={(id,p) => edit({positions:{...project.positions,[id]:p}})} arrange={positions=>edit({positions})} duplicate={source=>{
      if(source.distribution && project.inputs.length<32) {
        const copy={...source,name:newInput([...project.inputs,...(project.relations||[])]).name,label:source.label+' copy'}
        edit({inputs:[...project.inputs,copy]});select(copy.name)
      } else if(!source.distribution && (project.relations||[]).length<24){
        const copy={...source,name:newRelation(project).name,label:source.label+' copy'}
        edit({relations:[...(project.relations||[]),copy]});select(copy.name)
      }
    }} tidy={()=>edit({positions:{}})} addFormula={()=>{const v=newRelation(project);edit({relations:[...(project.relations||[]),v]});select(v.name)}} add={() => {
      const v=newInput([...project.inputs,...(project.relations||[])],project.unit);edit({inputs:[...project.inputs,v]});select(v.name)
    }}/>
      <Inspector key={selected} draft={project} selected={selected} select={select} change={edit} issues={issues} run={run}/></div>
    <section className="bd-run bd-panel"><Settings draft={project} change={edit}/><div className="bd-tools">
      <button onClick={() => setDialog('validate')}><CheckCheck size={15}/> Validate{issues.length ? ' ('+issues.length+')' : ''}</button>
      {working ? <><button onClick={() => status==='paused' ? job.current?.resume() : job.current?.pause()}>{status==='paused' ? <Play size={15}/> : <Pause size={15}/>} {status==='paused' ? 'Resume' : 'Pause'}</button><button onClick={() => job.current?.cancel()}><Square size={14}/> Cancel</button></> :
      <button className="bd-primary" disabled={!ready || !!issues.length} onClick={start}><Play size={14}/> Run simulation</button>}</div>
      {issues.length>0 && <p className="bd-alert">{issues[0]}</p>}
      {working && <div className="bd-progress"><label>{status==='paused'?'Paused':'Running'} · {run?.result.n ?? 0} / {run?.model.samples ?? model.samples}<progress value={run?.result.n ?? 0} max={run?.model.samples ?? model.samples}/></label></div>}</section>
    <Results run={run} stale={stale}/>
    <input type="file" accept=".json,application/json" ref={fileInput} hidden onChange={importFile}/>
    {dialog==='new' && <Wizard close={() => setDialog('')} finish={replace}/>}
    {dialog==='validate' && <Dialog title="Model validation" close={() => setDialog('')}><Issues issues={issues}/></Dialog>}
    {dialog==='open' && <Dialog title="Open project" close={() => setDialog('')}><div className="bd-project-list">{catalog.map(r => <button key={r.id} onClick={() => {try{load(r)}catch(e){setMessage(e.message);setDialog('')}}}><strong>{r.project.title || 'Untitled model'}</strong><small>{r.project.question}</small></button>)}</div>
      <button onClick={() => fileInput.current.click()}><Upload size={14}/> Import project JSON</button></Dialog>}
    {dialog==='export' && <Dialog title="Export model" close={() => setDialog('')}><p>Download the current settings and assumptions. Open the notebook in Jupyter or upload it using Colab’s File menu.</p>
      <div className="bd-project-list">{[['notebook','Google Colab notebook (.ipynb)'],['python','Python script (.py)'],['r','R script (.R)'],['project','Project and run (.json)'],['csv','Captured replications (.csv)'],['chart','Convergence plot (.svg)'],['zip','Reproducible run bundle (.zip)']].map(([id,title]) =>
        <button key={id} disabled={['csv','chart','zip'].includes(id) ? !run?.result.n || working : id==='project' ? working : !!issues.length} onClick={() => exportFile(id)}><Download size={15}/>{title}</button>)}</div>
      {run && <p className="bd-hint">CSV, chart and ZIP use the recorded run at seed {run.model.seed}, with {run.result.n} completed replications.</p>}
      {!!issues.length && <Issues issues={issues}/>}</Dialog>}
  </article>
}
