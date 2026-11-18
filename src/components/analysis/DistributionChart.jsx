import {useState} from 'react'

const f=n=>Number.isFinite(n)?Number(n.toPrecision(4)).toLocaleString(undefined,{maximumSignificantDigits:4}):'—'
// Pass `view` ('histogram' or 'cdf') to fix the view and hide the built-in switch.
// `marker` takes one {value,label,color,dash} or an array of them.
// Pass a continuous `law` ({pdf,cdf}) to draw its theoretical curve instead of per-bin markers.
export default function DistributionChart({rows,unit='Output',n,marker,view,law}) {
  const [cdfChoice,setCdf]=useState(false)
  const cdf=view ? view==='cdf' : cdfChoice
  let cumulative=0
  const data=[]
  for(const row of rows){
    cumulative+=row.count
    data.push({...row,cumulative,value:cdf?cumulative/n:row.count/n})
  }
  const lo=rows[0].lo, hi=rows.at(-1).hi, binWidth=(hi-lo)/rows.length
  const smooth=law && !law.discrete && hi>lo
  const curve=smooth ? Array.from({length:161},(_,i)=>{
    const v=lo+(hi-lo)*i/160
    return [v, cdf ? law.cdf(v)-law.cdf(lo) : law.pdf(v)*binWidth]
  }).filter(([,p])=>Number.isFinite(p)) : []
  const max=cdf?1:Math.max(...data.map(r=>Math.max(r.value,smooth?0:r.expected||0)),...curve.map(([,p])=>p),.001)
  const x=42, y=12, w=538,h=179
  const col=w/data.length
  const scale=v=>y+h-v/max*h
  const ticks=[0,.25,.5,.75,1]
  return <div className="distribution-chart">
    {!view&&<div className="switcher"><button aria-pressed={!cdf} onClick={()=>setCdf(false)}>Histogram</button><button aria-pressed={cdf} onClick={()=>setCdf(true)}>Cumulative frequency</button></div>}
    <svg viewBox="0 0 604 223" role="img" aria-label={cdf?'Cumulative frequency through each bin. Table below.':'Share of samples by output range. Table below.'}>
      {ticks.map(t=><g key={t}><line x1={x} x2={x+w} y1={scale(t*max)} y2={scale(t*max)} stroke="var(--chart-grid)"/><text x={x-5} y={scale(t*max)+4} textAnchor="end">{f(t*max*100)}%</text></g>)}
      {data.map((r,i)=><g key={i}>{cdf?<path d={`M${x+i*col},${scale(i?data[i-1].value:0)} h${col} V${scale(r.value)}`} stroke="var(--primary)" fill="none" strokeWidth="2"/>:<><rect x={x+i*col} y={scale(r.value)} width={Math.max(.5,col-1)} height={h*r.value/max} fill="var(--primary)"/>{r.expected!==undefined&&!smooth&&<line x1={x+i*col} x2={x+(i+1)*col} y1={scale(r.expected)} y2={scale(r.expected)} stroke="var(--accent)" strokeWidth="2.5"/>}</>}</g>)}
      {[marker].flat().filter(m=>m && Number.isFinite(m.value) && m.value>=lo && m.value<=hi).map((m,i)=>{
        const mx=x+(m.value-lo)/((hi-lo)||1)*w, right=mx>x+w*.8, color=m.color||'var(--mc-event)'
        return <g key={i}><line x1={mx} x2={mx} y1={y} y2={y+h} stroke={color} strokeWidth="2" strokeDasharray={m.dash??'5 3'}/>
          <text x={mx+(right?-4:4)} y={y+10+i*14} textAnchor={right?'end':'start'} style={{fill:color,stroke:'var(--bg-elevated)',strokeWidth:3,paintOrder:'stroke'}}>{m.label}</text></g>
      })}
      {curve.length>1&&<path d={'M'+curve.map(([v,p])=>(x+(v-lo)/(hi-lo)*w).toFixed(1)+','+scale(Math.min(p,max)).toFixed(1)).join(' L')} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round"/>}
      <text x={x} y="210">{f(rows[0].lo)}</text><text x={x+w/2} y="214" textAnchor="middle">{unit}</text><text x={x+w} y="210" textAnchor="end">{f(rows.at(-1).hi)}</text>
    </svg>
    <p className="chart-note">{smooth?(cdf?'Steps show the sampled cumulative share. The curve shows the theoretical cumulative probability.':'Bars show the sampled share. The curve shows the theoretical density, scaled to the bar width.'):cdf?'Cumulative share through each bin.':rows[0].expected!==undefined?'Bars show the sampled share. Horizontal markers show the model probability for each value.':'Bars show the share of completed replications in each range.'}</p>
    <details><summary>Inspect bin table</summary><div className="scroll-table"><table><thead><tr><th>From</th><th>To</th><th>Count</th><th>Share</th><th>Cumulative</th>{rows[0].expected!==undefined&&<th>Model share</th>}</tr></thead><tbody>{data.map((r,i)=><tr key={i}><td>{f(r.lo)}</td><td>{f(r.hi)}</td><td>{r.count}</td><td>{f(r.observed*100)}%</td><td>{f(100*r.cumulative/n)}%</td>{r.expected!==undefined&&<td>{f(r.expected*100)}%</td>}</tr>)}</tbody></table></div></details>
  </div>
}
