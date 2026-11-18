import { useEffect, useState } from 'react'
import { ArrowRight, Workflow, Search, BookOpen, FolderOpen, FlaskConical, SlidersHorizontal, Building2, ListChecks, ChartColumn, GitCompareArrows, Download, GraduationCap, Trophy, CircleHelp, Trash2, AlertTriangle } from 'lucide-react'
import {allProgress} from '../learning/progress'
import {curriculum} from '../learning/curriculum'
import { labs } from '../catalog'
import { loadProjects, resetDatabase } from './builder/project'

function DensitySurface() {
  const point=(x,y)=>{
    const density=Math.exp(-(x*x+y*y)/2)
    return [185+31*x-23*y,114+9*x+7*y-81*density]
  }
  const line=(v,alongX)=>Array.from({length:81},(_,i)=>point(...(alongX?[i/16-2.5,v]:[v,i/16-2.5])).join(',')).join(' ')
  const grid=Array.from({length:31},(_,i)=>i/6-2.5)
  return <figure className="density-figure"><svg viewBox="0 0 374 184" role="img" aria-label="Bivariate normal probability density. The peak lies at the center, falling symmetrically in both directions.">
    {grid.map(v=><polyline key={'x'+v} points={line(v,true)} fill="none" stroke="currentColor" strokeWidth=".95"/>)}
    {grid.map(v=><polyline key={'y'+v} points={line(v,false)} fill="none" stroke="currentColor" strokeWidth=".7"/>)}
    <text x="316" y="130">x</text><text x="158" y="169">y</text>
  </svg><figcaption>Bivariate normal density · ρ = 0</figcaption></figure>
}

function LabList({entries,catalog=false}) {
  return <div className="lab-collection">{entries.map((lab,i)=><a className="lab-entry" href={'#/'+lab.id} key={lab.id}>
    <div className={'lab-icon tint-'+i%3}><lab.icon size={22}/></div>
    <div><small>{catalog?lab.code+' · ':''}{lab.field}</small><h3>{lab.name}</h3><p>{lab.description}</p>{catalog&&<small>{lab.level} · {lab.method}</small>}</div><ArrowRight size={16} aria-hidden="true"/>
  </a>)}</div>
}

export function Catalog() {
  const [query,setQuery]=useState('')
  const [level,setLevel]=useState(''),[domain,setDomain]=useState(''),[method,setMethod]=useState(''),[lesson,setLesson]=useState('')
  const filtered=labs.filter(l=>(l.name+' '+l.code+' '+l.field+' '+l.description+' '+l.method).toLowerCase().includes(query.trim().toLowerCase())
    && (!level||l.level===level)&&(!domain||domain===l.field)&&(!method||method===l.method)&&(!lesson||curriculum.find(e=>e.id===lesson)?.labs.includes(l.id)))
  return <div className="overview"><h1>Simulation Lab</h1><p className="intro">Choose an experiment to explore its assumptions, controls and results.</p><label className="lab-search"><Search size={17}/><input type="search" aria-label="Search simulations" placeholder="Search simulations" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="catalog-filters">{[['Level',level,setLevel,[...new Set(labs.map(l=>l.level))]],['Domain',domain,setDomain,[...new Set(labs.map(l=>l.field))]],['Method',method,setMethod,labs.map(l=>l.method)]].map(([label,value,set,values])=><label key={label}>{label}<select value={value} onChange={e=>set(e.target.value)}><option value="">All</option>{values.map(x=><option key={x}>{x}</option>)}</select></label>)}
      <label>Related lesson<select value={lesson} onChange={e=>setLesson(e.target.value)}><option value="">All</option>{curriculum.map(e=><option value={e.id} key={e.id}>{e.title}</option>)}</select></label></div>
    <p className="catalog-count" role="status">{filtered.length} of {labs.length} examples</p><LabList entries={filtered} catalog/>{!filtered.length&&<p role="status">No simulations match "{query}".</p>}</div>
}

const workspaceTools = [
  { id:'builder', label:'Simulation Builder', desc:'Define uncertain inputs, connect them with a formula and estimate probabilities.', icon:Workflow },
  { id:'industry', label:'IT Industry Models', desc:'10 ready-to-run Monte Carlo models for cloud, delivery, security and IT operations.', icon:Building2 },
  { id:'distributions', label:'Distribution Studio', desc:'Visualise and compare probability distributions with live parameter controls.', icon:SlidersHorizontal },
]

const learningLinks = [
  { id:'theory', label:'Theory & Concepts', desc:'In-depth reference covering distributions, convergence, estimation and mathematical foundations.', icon:BookOpen },
  { id:'lessons', label:'Lessons', desc:'12 guided lessons from basic probability to advanced simulation methods.', icon:GraduationCap },
  { id:'labs', label:'Examples', desc:'12 ready-made experiments across probability, finance, engineering and operations.', icon:FlaskConical },
  { id:'challenges', label:'Challenges', desc:'12 hands-on challenges to test and reinforce your understanding.', icon:Trophy },
]

async function clearAllData() {
  try { localStorage.removeItem('mc-theme') } catch { /* storage unavailable */ }
  try {
    const keys=Object.keys(localStorage).filter(k=>k.startsWith('mc-'))
    keys.forEach(k=>{ try { localStorage.removeItem(k) } catch { /* ignore */ } })
  } catch { /* ignore */ }
  try { sessionStorage.clear() } catch { /* ignore */ }
  await new Promise(resolve=>{
    const req=indexedDB.deleteDatabase('mc-builder-projects')
    req.onsuccess=resolve; req.onerror=resolve; req.onblocked=resolve
  })
  await new Promise(resolve=>{
    const req=indexedDB.deleteDatabase('mc-learning')
    req.onsuccess=resolve; req.onerror=resolve; req.onblocked=resolve
  })
  resetDatabase()
  window.dispatchEvent(new CustomEvent('mc-project-change'))
  window.dispatchEvent(new CustomEvent('mc-learning-change'))
}

export default function Overview() {
  const [projects,setProjects]=useState([])
  useEffect(()=>{
    let current=true
    const sync=()=>loadProjects().then(records=>{if(current) setProjects(records)}).catch(()=>{if(current) setProjects(null)})
    sync()
    window.addEventListener('mc-project-change',sync)
    window.addEventListener('storage',sync)
    return ()=>{current=false;window.removeEventListener('mc-project-change',sync);window.removeEventListener('storage',sync)}
  },[])
  const [progress,setProgress]=useState({})
  useEffect(()=>{
    let mounted=true
    const refresh=()=>allProgress().then(rows=>{if(mounted)setProgress(rows)}).catch(()=>{})
    refresh()
    window.addEventListener('mc-learning-change',refresh)
    return ()=>{mounted=false;window.removeEventListener('mc-learning-change',refresh)}
  },[])
  const [clearing,setClearing]=useState(false)
  const [cleared,setCleared]=useState(false)
  const [confirmClear,setConfirmClear]=useState(false)
  const next=curriculum.find(l=>!progress[l.id]?.completed)
  const completed=curriculum.filter(l=>progress[l.id]?.completed).length

  function openProject(id) {
    try {sessionStorage.setItem('mc-builder-open',id)} catch { /* Mounted editor also listens for the event. */ }
    window.dispatchEvent(new CustomEvent('mc-builder-open',{detail:id}))
    window.location.assign('#/builder')
  }

  async function handleClearAll() {
    setClearing(true)
    await clearAllData()
    setProjects([])
    setProgress({})
    setClearing(false)
    setCleared(true)
    setConfirmClear(false)
    setTimeout(()=>setCleared(false),4000)
  }

  return <div className="overview">
    <section className="builder-feature">
      <div className="feature-copy">
        <div className="feature-label"><Workflow size={17}/>Monte Carlo Simulation Lab</div>
        <h1>Build models, run experiments, explore uncertainty.</h1>
        <p>Define uncertain inputs, connect them with a formula and estimate the probability of crossing a threshold. Explore ready-made experiments or build your own from a question.</p>
        <div className="hero-actions">
          <a className="action-primary" href="#/builder">Open Builder <ArrowRight size={16}/></a>
          <a className="action-secondary" href="#/labs">Explore {labs.length} examples <ArrowRight size={16}/></a>
        </div>
      </div>
      <DensitySurface/>
    </section>

    <section className="home-section">
      <h2 className="home-section-heading">Learning</h2>
      <div className="home-learn-grid">
        {learningLinks.map(l=><a key={l.id} className="home-learn-card" href={'#/'+l.id}>
          <div className="home-learn-card-icon"><l.icon size={18}/></div>
          <div>
            <strong>{l.label}</strong>
            <p>{l.desc}</p>
          </div>
          <ArrowRight size={14} className="learn-arrow"/>
        </a>)}
      </div>
      <div className="learn-progress-bar-wrap">
        <span className="learn-progress-label">{completed} / {curriculum.length} lessons completed</span>
        <progress value={completed} max={curriculum.length} aria-label="Completed lessons" className="learn-progress"/>
        <a href={next?'#/lessons/'+next.id:'#/lessons'} className="learn-continue">{next?'Continue: '+next.title:'Review all lessons'} <ArrowRight size={13}/></a>
      </div>
    </section>

    <section className="home-section">
      <h2 className="home-section-heading">Workspace</h2>
      <div className="tool-grid">
        {workspaceTools.map(t=><a key={t.id} className="tool-card" href={'#/'+t.id}>
          <div className="tool-card-icon"><t.icon size={20}/></div>
          <strong>{t.label}</strong>
          <p>{t.desc}</p>
          <span className="tool-card-link">Open <ArrowRight size={13}/></span>
        </a>)}
      </div>
    </section>

    <section className="home-section">
      <h2 className="home-section-heading">Recent Projects</h2>
      <div className="side-card recent-projects-card">
        {projects===null
          ? <p className="empty-note">Local project storage is unavailable in this browser.</p>
          : projects.length
            ? projects.slice(0,4).map(p=><button className="recent-project" key={p.id} onClick={()=>openProject(p.id)}>
                <FolderOpen size={18}/><span>
                  <strong>{p.project.title||p.project.question||'Untitled model'}</strong>
                  <small>{p.project.question}</small>
                  <small>{new Date(p.updatedAt).toLocaleDateString()} · {p.run?'Saved run':'Draft'}</small>
                </span>
              </button>)
            : <div className="empty-state"><FolderOpen size={24}/><p>No saved projects yet. Projects you save in the Builder will appear here.</p><a className="action-primary" href="#/builder">Open Builder <ArrowRight size={14}/></a></div>
        }
      </div>
    </section>

    <section className="home-section danger-section">
      <h2 className="home-section-heading">Manage Data</h2>
      <div className="data-mgmt-card">
        <div className="data-mgmt-info">
          <Trash2 size={18}/>
          <div>
            <strong>Clear all stored data</strong>
            <p>Permanently removes all saved projects, learning progress and preferences stored in this browser. This cannot be undone.</p>
          </div>
        </div>
        {cleared
          ? <span className="data-cleared-msg">All data cleared.</span>
          : confirmClear
            ? <div className="data-confirm-row">
                <span className="data-confirm-label"><AlertTriangle size={14}/> Are you sure? This is permanent.</span>
                <button className="btn-danger" onClick={handleClearAll} disabled={clearing}>{clearing?'Clearing…':'Yes, clear everything'}</button>
                <button className="btn-secondary" onClick={()=>setConfirmClear(false)}>Cancel</button>
              </div>
            : <button className="btn-danger-outline" onClick={()=>setConfirmClear(true)}>Clear all data</button>
        }
      </div>
    </section>
  </div>
}
