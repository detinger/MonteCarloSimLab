import {useEffect,useState} from 'react'
import {FolderOpen,ArrowRight} from 'lucide-react'
import {loadProjects,download} from './builder/project.js'
import '../styles/analysis.css'

export default function Projects(){
  const [projects,setProjects]=useState(null),[error,setError]=useState('')
  useEffect(()=>{
    let mounted=true
    const refresh=()=>loadProjects().then(rows=>{if(mounted)setProjects(rows)}).catch(()=>{if(mounted)setError('Local project storage is unavailable.')})
    refresh()
    window.addEventListener('mc-project-change',refresh)
    window.addEventListener('focus',refresh)
    return ()=>{mounted=false;window.removeEventListener('mc-project-change',refresh);window.removeEventListener('focus',refresh)}
  },[])
  function open(id){
    try{sessionStorage.setItem('mc-builder-open',id)}catch{/* The mounted Builder also handles the event. */}
    window.dispatchEvent(new CustomEvent('mc-builder-open',{detail:id}))
    window.location.assign('#/builder')
  }
  return <div className="research-page"><h1>Saved projects</h1><p className="intro">Open a local Builder model or download its project file to move it to another browser.</p><section className="research-panel">
    {error?<p role="alert">{error}</p>:projects===null?<p>Opening local projects…</p>:projects.length?<div className="scroll-table"><table><thead><tr><th>Project</th><th>Last saved</th><th>Run</th><th>Actions</th></tr></thead><tbody>{projects.map(p=><tr key={p.id}><td><b>{p.project.title}</b><br/>{p.project.question}</td><td>{new Date(p.updatedAt).toLocaleString()}</td><td>{p.run?p.run.result.n.toLocaleString()+' replications · seed '+p.run.model.seed:'Draft'}</td><td><button onClick={()=>open(p.id)}>Open</button> <button onClick={()=>download('simulation-project.json',JSON.stringify({schemaVersion:1,project:p.project,run:p.run},null,2))}>Download</button></td></tr>)}</tbody></table></div>:<><FolderOpen/><h2>No saved projects yet</h2><p>Create a Builder model to save a question and its experiment settings here.</p></>}
    <a className="action-primary" href="#/builder">Open Builder <ArrowRight size={16}/></a></section></div>
}
