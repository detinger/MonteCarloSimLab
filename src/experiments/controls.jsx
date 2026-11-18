import {modelInfo} from './library.js'
import {entryLabel,fmt} from './format.js'
export function SourcePicker({entries,value,onChange,disabled,label='Model source'}) {
  const groups=new Map()
  for(const entry of entries){
    if(!groups.has(entry.source))groups.set(entry.source,[])
    groups.get(entry.source).push(entry)
  }
  return <label>{label}<select value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}>{[...groups].map(([name,rows])=><optgroup key={name} label={name}>{rows.map(row=><option key={row.id} value={row.id}>{entryLabel(row)}</option>)}</optgroup>)}</select></label>
}
export function Snapshot({model}){
  return <details><summary>Inspect model parameters</summary><pre className="run-preview">{JSON.stringify(model,null,2)}</pre></details>
}
export function Results({entry}) {
  const r=entry?.result
  if(!r?.n)return null
  const info=modelInfo(entry.model),ref=r.reference??info.reference
  return <><div className="stat-strip"><div><small>{info.metric}</small><strong>{fmt(r.mean)}</strong></div>
    <div><small>95% {info.method} interval</small><strong>{r.interval?r.interval.map(fmt).join(' – '):'Unavailable'}</strong></div>
    <div><small>Completed replications</small><strong>{r.n.toLocaleString()}</strong></div>
    {Number.isFinite(ref)&&<div><small>{info.family==='queue'?'Stable equilibrium reference':'Analytical reference'}</small><strong>{fmt(ref)}</strong></div>}
    {Number.isFinite(r.probability)&&<div><small>{info.family==='builder'?'Threshold event probability':'Event fraction'}</small><strong>{fmt(100*r.probability)}%</strong></div>}
  </div><p>{info.unit?'Output unit · '+info.unit+' · ':''}Seed {entry.model.seed} · {info.engine}</p></>
}
