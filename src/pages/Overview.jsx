import { useEffect, useState } from 'react'
import { ArrowRight, Workflow, Search, BookOpen, FolderOpen, FlaskConical } from 'lucide-react'
import {allProgress} from '../learning/progress'
import {curriculum} from '../learning/curriculum'
import { labs } from '../catalog'
import { loadProjects } from './builder/project'

// Project a standard bivariate normal density onto an isometric grid.
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
    <p className="catalog-count" role="status">{filtered.length} of {labs.length} examples</p><LabList entries={filtered} catalog/>{!filtered.length&&<p role="status">No simulations match “{query}”.</p>}</div>
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
  const next=curriculum.find(l=>!progress[l.id]?.completed)
  const completed=curriculum.filter(l=>progress[l.id]?.completed).length
  function openProject(id) {
    try {sessionStorage.setItem('mc-builder-open',id)} catch { /* Mounted editor also listens for the event. */ }
    window.dispatchEvent(new CustomEvent('mc-builder-open',{detail:id}))
    window.location.assign('#/builder')
  }
  return <div className="overview">
    <h1>Workspace overview</h1><p className="intro">Build stochastic models, run experiments and explore uncertainty.</p>
    <section className="builder-feature"><div className="feature-copy"><div className="feature-label"><Workflow size={17}/>Simulation Builder</div><h2>Build a model from a question</h2><p>Define uncertain inputs, connect them with a formula and estimate the probability of crossing a threshold.</p><a className="action-primary" href="#/builder">Open Builder <ArrowRight size={16}/></a></div><DensitySurface/></section>
    <div className="overview-columns"><section><div className="section-heading"><h2>Simulation Lab</h2><a href="#/labs">Explore all {labs.length} <ArrowRight size={14}/></a></div><LabList entries={labs}/></section>
    <aside className="overview-extra"><h2>Recent projects</h2><div className="side-card">{projects===null?<p>Local project storage is unavailable in this browser.</p>:projects.length?projects.slice(0,4).map(p=><button className="recent-project" key={p.id} onClick={()=>openProject(p.id)}><FolderOpen size={18}/><span><strong>{p.project.title || p.project.question || 'Untitled model'}</strong><small>{p.project.question}</small><small>{new Date(p.updatedAt).toLocaleDateString()} · {p.run?'Saved run':'Draft'}</small></span></button>):<><FolderOpen size={23}/><h3>No saved projects yet</h3><p>Projects you save in the Builder will appear here.</p></>}</div><h2>Learning progress</h2><a className="side-card resource" href={next?'#/lessons/'+next.id:'#/lessons'}><BookOpen size={21}/><strong>{next?next.title:'Lessons completed'}</strong><p>{completed} of {curriculum.length} lessons completed</p><progress value={completed} max={curriculum.length} aria-label="Completed lessons"/><span>{next?'Continue learning':'Review lessons'} <ArrowRight size={14}/></span></a><a className="side-card resource" href="#/pi"><FlaskConical size={21}/><strong>Estimating Pi</strong><p>Run a seeded experiment and inspect its confidence interval.</p><span>Open experiment <ArrowRight size={14}/></span></a></aside></div>
  </div>
}
