import {useEffect,useRef,useState} from 'react'
import {distributions, lawFor} from '../science/distributions'
import DistributionChart from '../components/analysis/DistributionChart'
import {download} from './builder/project'
import '../styles/analysis.css'

export default function DistributionStudio() {
  const [kind,setKind]=useState('normal'), [fields,setFields]=useState(['0','1'])
  const [seed,setSeed]=useState('42'), [n,setN]=useState('2000')
  const [result,setResult]=useState(null), [busy,setBusy]=useState(false), [error,setError]=useState('')
  const [query,setQuery]=useState('0'),[percentile,setPercentile]=useState('0.5')
  const [transferMessage,setTransferMessage]=useState('')
  const worker=useRef(null)
  useEffect(()=>()=>worker.current?.terminate(),[])
  let invalid=''
  try {
    lawFor(kind,fields)
    if(!seed.trim()||!Number.isInteger(+seed)||+seed<0||+seed>4294967295) throw Error('Seed must be a 32-bit unsigned integer.')
    if(!Number.isInteger(+n)||+n<1||+n>10000) throw Error('Preview size must be an integer between 1 and 10,000.')
  } catch(e) {invalid=e.message}
  function preview() {
    worker.current?.terminate()
    const w=new Worker(new URL('../science/preview.worker.js',import.meta.url),{type:'module'})
    worker.current=w
    const end=()=>{w.terminate();setBusy(false)}
    w.onmessage=({data})=>{if(data.error)setError(data.error);else setResult(data.result);end()}
    w.onerror=()=>{setError('The preview worker could not complete.');end()}
    setBusy(true);setError('')
    w.postMessage({kind,fields,seed:+seed,n:+n})
  }
  const selected=result?lawFor(result.kind,result.fields):null
  const format=v=>Number.isFinite(v)?Number(v.toPrecision(6)).toString():'Unavailable'
  function apply() {
    const input={distribution:kind,fields:[...fields]}
    try {
      sessionStorage.setItem('mc-studio-input',JSON.stringify(input))
      window.dispatchEvent(new CustomEvent('mc-studio-input',{detail:input}))
      window.location.assign('#/builder')
    } catch {setTransferMessage('Browser session storage is unavailable. Download the definition to keep these parameters.')}
  }
  const stale=result&&(result.kind!==kind||JSON.stringify(fields)!==JSON.stringify(result.fields)||result.seed!==+seed||result.n!==+n)
  return <div className="research-page"><div className="research-columns"><section className="research-panel"><h2>Distribution parameters</h2>
    <label>Distribution<select value={kind} onChange={e=>{setKind(e.target.value);setFields(distributions[e.target.value][2].map(String));setError('')}}>{Object.entries(distributions).map(([k,[title]])=><option key={k} value={k}>{title}</option>)}</select></label>
    {fields.map((v,i)=><label key={i}>{distributions[kind][1][i]}<input value={v} onChange={e=>setFields(fields.map((old,j)=>j===i?e.target.value:old))}/></label>)}
    <label>Preview draws<input value={n} onChange={e=>setN(e.target.value)}/></label><label>Seed<input value={seed} onChange={e=>setSeed(e.target.value)}/></label>
    {invalid&&<p role="alert">{invalid}</p>}<button className="primary-control" disabled={busy||!!invalid} onClick={preview}>{busy?'Drawing samples…':'Draw samples'}</button>
    <div className="studio-transfer"><button disabled={!!invalid} onClick={()=>download('distribution.json',JSON.stringify({version:1,family:kind,parameters:Object.fromEntries(distributions[kind][1].map((label,i)=>[label,fields[i]]))},null,2))}>Download input definition</button>
      <button disabled={!!invalid} onClick={apply}>Add input to Builder</button></div>
    {transferMessage&&<p role="status">{transferMessage}</p>}{error&&<p role="alert">{error}</p>}</section>
    <section className="research-panel"><h2>Sample distribution</h2>{result?<><p className="chart-note">{stale?'From earlier parameters · ':''}{distributions[result.kind][0]} · {result.n.toLocaleString()} draws · seed {result.seed}</p>
      <div className="stat-strip">{[['Sample mean',result.mean],['Theoretical mean',result.reference],['Sample median',result.median]].map(([key,v])=><div key={key}><small>{key}</small><strong>{Number(v.toPrecision(5))}</strong></div>)}</div>
      <DistributionChart rows={result.rows} n={result.n} unit="Sample value"/>
      <details><summary>Inspect theoretical probabilities</summary><label>Value x<input value={query} onChange={e=>setQuery(e.target.value)}/></label>
        {query.trim()&&Number.isFinite(+query)&&<p>{selected.discrete?'Probability mass at x':'Density at x'} · {format(selected.pdf(+query))}<br/>Cumulative probability P(X ≤ x) · {format(selected.cdf(+query))}</p>}
        <label>Quantile probability (0 &lt; p &lt; 1)<input value={percentile} onChange={e=>setPercentile(e.target.value)}/></label>
        <p>{+percentile>0&&+percentile<1?'Model quantile · '+format(selected.inv(+percentile)):'Enter a probability strictly between 0 and 1.'}</p></details><button onClick={()=>download('distribution-draws.csv','replication,value\n'+result.draws.map((v,i)=>[i+1,v].join(',')).join('\n'),'text/csv')}>Download draws (CSV)</button></>:<p>Draw a sample to compare its frequencies with the model probabilities.</p>}</section></div></div>
}
