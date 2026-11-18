import {useEffect,useState} from 'react'
import {Download} from 'lucide-react'
import {artifact,availableFormats,formats} from '../experiments/exports.js'
import {modelInfo} from '../experiments/library.js'
import {useLibrary} from '../experiments/useLibrary.js'
import {SourcePicker,Snapshot,Results} from '../experiments/controls.jsx'
import {downloadPiFile} from './piSession.js'
import '../styles/analysis.css'
import '../styles/experiments.css'

const requested=()=>location.hash.match(/^#\/exports\/([^/?#]+)$/)?.[1]??''
export default function ExportCenter(){
  const {entries,loading,warnings}=useLibrary()
  const [selected,select]=useState(requested),[choice,setChoice]=useState('ipynb'),[message,setMessage]=useState('')
  useEffect(()=>{
    function navigate(){if(location.hash.startsWith('#/exports')){select(requested());setMessage('')}}
    window.addEventListener('hashchange',navigate)
    return ()=>window.removeEventListener('hashchange',navigate)
  },[])
  const entry=selected?entries.find(e=>e.id===selected):entries.find(e=>e.result?.n)??entries.find(e=>e.id==='preset-pi')
  const valid=entry?availableFormats(entry):[]
  const format=valid.includes(choice)?choice:valid[0]
  let file=null
  if(entry && format){
    try{file=artifact(entry,format)}catch(error){file={error:error.message}}
  }
  function download(){
    if(!file||file.error)return
    try{downloadPiFile(file.name,file.data,file.mime);setMessage('Downloaded '+file.name+'.')}
    catch(e){setMessage(e.message)}
  }
  return <article className="research-page runner-page"><header><h1>Export Center</h1><p className="intro">Download the model, code or results for a selected experiment.</p></header>
    {warnings.map(w=><p role="status" key={w}>{w}</p>)}
    <div className="research-columns"><section className="research-panel"><h2>Export settings</h2>
      <SourcePicker label="Export source" entries={entries} value={entry?.id??''} onChange={id=>{select(id);setMessage('')}}/>
      {!entry?<p role="status">{loading?'Opening local runs…':'This run is unavailable on this device. Choose another source.'}</p>:<>
        <label>File format<select value={format} onChange={e=>{setChoice(e.target.value);setMessage('')}}>{valid.map(id=><option value={id} key={id}>{formats[id]}</option>)}</select></label>
        <p>{entry.result?'Uses the selected run’s recorded parameters and seed.':'This source contains model settings. Run it in Experiment Runner to export numerical results.'}</p>
        <button className="primary-control" disabled={!!file?.error||!file} onClick={download}><Download size={16}/> Download file</button>
        {message&&<p role="status">{message}</p>}{file?.error&&<p role="alert">{file.error}</p>}
        <Snapshot model={entry.model}/></>}
    </section><section className="research-panel"><h2>File preview</h2>{entry&&file&&!file.error&&<>
      <b>{file.name}</b><p>{entry.title??modelInfo(entry.model).title} · seed {entry.model.seed} · {entry.model.samples.toLocaleString()} requested replications</p>
      {format==='ipynb'&&<p>Upload this file in Google Colab using File → Upload notebook, or open it in Jupyter.</p>}
      <pre className="run-preview" tabIndex={0} role="region" aria-label="Scrollable file preview">{file.preview.length>6800?file.preview.slice(0,6800)+'\n…':file.preview}</pre>
      {entry.result&&<><h2>Selected run</h2><Results entry={entry}/></>}
    </>}</section></div></article>
}
